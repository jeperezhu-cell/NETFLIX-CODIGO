import chromium from "@sparticuz/chromium";
import puppeteer, { type ElementHandle, type Page } from "puppeteer-core";

/** Abre un enlace de Netflix en un navegador invisible (servidor) y pulsa el botón por el cliente. */
export type LinkMode = "confirm" | "getcode";
export type LinkResult =
  | { status: "done" }
  | { status: "code"; value: string }
  | { status: "expired" }
  | { status: "manual"; debug: string };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const isNetflix = (u: string) => { try { const x = new URL(u); return x.protocol === "https:" && (x.hostname === "netflix.com" || x.hostname.endsWith(".netflix.com")); } catch { return false; } };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Textos de los botones de Netflix (español e inglés). Se prueban en este orden.
const CONFIRM = [/s[ií],? la envi[eé] yo/i, /confirmar actualizaci[oó]n/i, /actualizar (el )?hogar/i, /yes,? this was me/i, /confirm update/i, /update netflix household/i, /^confirmar$/i, /^confirm$/i];
const GETCODE = [/obtener c[oó]digo/i, /get code/i, /ver c[oó]digo/i, /mostrar c[oó]digo/i];
const DONE = /se actualiz[oó]|hogar (ha sido |fue )?actualizado|has been updated|household (is |has been )?updated|all set|todo listo|¡listo/i;
const EXPIRED = /expir|venci[oó]|caduc|ya no es v[aá]lid|no longer valid|ha vencido/i;

async function bodyText(page: Page) { return (await page.evaluate(() => document.body?.innerText ?? "").catch(() => "")) as string; }

async function findButton(page: Page, pats: RegExp[]) {
  const handle = await page.evaluateHandle((srcs: string[], flags: string[]) => {
    const res = srcs.map((s, i) => new RegExp(s, flags[i]));
    const els = Array.from(document.querySelectorAll<HTMLElement>("button, a, [role=button], input[type=submit]"));
    const label = (e: HTMLElement) => ((e.innerText || (e as HTMLInputElement).value || e.getAttribute("aria-label") || "") as string).replace(/\s+/g, " ").trim();
    for (const re of res) { const hit = els.find((e) => re.test(label(e))); if (hit) return hit; }
    return null;
  }, pats.map((p) => p.source), pats.map((p) => p.flags));
  const el = handle.asElement() as ElementHandle<HTMLElement> | null;
  if (!el) await handle.dispose();
  return el;
}

async function press(page: Page, pats: RegExp[]) {
  const el = await findButton(page, pats);
  if (!el) return false;
  await el.evaluate((e) => e.scrollIntoView({ block: "center" })).catch(() => {});
  try { await el.click({ delay: 40 }); } catch { await el.evaluate((e) => e.click()).catch(() => {}); }
  return true;
}

function codeFrom(text: string) {
  for (const raw of text.split("\n")) {
    const l = raw.replace(/\s+/g, "");
    if (/^\d{4,6}$/.test(l) && !(l.length === 4 && +l >= 1900 && +l <= 2100)) return l;
  }
  return null;
}

export async function openNetflixLink(url: string, mode: LinkMode): Promise<LinkResult> {
  if (!isNetflix(url)) throw new Error("Enlace no válido");
  const local = process.env.CHROME_PATH; // solo para pruebas en tu PC
  const remote = process.env.BROWSER_WS_ENDPOINT; // opcional: navegador en la nube (Browserless, Browserbase…)
  let browser;
  try {
    browser = remote
      ? await puppeteer.connect({ browserWSEndpoint: remote })
      : await puppeteer.launch({ args: local ? [] : chromium.args, executablePath: local || (await chromium.executablePath()), headless: local ? true : "shell" });
  } catch (e) { throw new Error(`No abrió el navegador: ${(e as Error).message}`); }
  const kill = setTimeout(() => { browser.close().catch(() => {}); }, 50_000); // tope duro
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, "webdriver", { get: () => undefined }); Object.defineProperty(navigator, "languages", { get: () => ["es-PE", "es", "en"] }); });
    await page.setViewport({ width: 1280, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-PE,es;q=0.9,en;q=0.8" });
    await page.setRequestInterception(true);
    page.on("request", (r) => { ["image", "media"].includes(r.resourceType()) ? r.abort().catch(() => {}) : r.continue().catch(() => {}); });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });

    const pats = mode === "confirm" ? CONFIRM : GETCODE;
    let clicked = false;
    for (let i = 0; i < 12 && !clicked; i++) { clicked = await press(page, pats); if (!clicked) await sleep(1000); }
    const before = await bodyText(page);
    if (!clicked) {
      if (EXPIRED.test(before)) return { status: "expired" };
      return { status: "manual", debug: before.replace(/\s+/g, " ").slice(0, 300) };
    }

    for (let i = 0; i < 14; i++) {
      await sleep(800);
      const t = await bodyText(page);
      if (mode === "getcode") { const c = codeFrom(t); if (c) return { status: "code", value: c }; }
      else if (DONE.test(t) || !(await findButton(page, CONFIRM))) return { status: "done" };
      if (EXPIRED.test(t) && !EXPIRED.test(before)) return { status: "expired" };
    }
    return { status: "manual", debug: (await bodyText(page)).replace(/\s+/g, " ").slice(0, 300) };
  } finally {
    clearTimeout(kill);
    await browser.close().catch(() => {});
  }
}
