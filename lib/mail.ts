import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type Found =
  | { type: "code"; value: string; at: string; digits: number }
  | { type: "link"; value: string; at: string }
  | { type: "none" };

export async function connectIcloud() {
  const c = new ImapFlow({
    host: "imap.mail.me.com", port: 993, secure: true, logger: false,
    auth: { user: process.env.ICLOUD_EMAIL!, pass: process.env.ICLOUD_APP_PASSWORD! }
  });
  await c.connect();
  return c;
}

type Kind = "login" | "verify" | "temp" | "household" | "other";
// minutos de vigencia de cada tipo de correo (Netflix: verificación 10, inicio de sesión 15)
const MAX_MIN: Record<Kind, number> = { login: 15, verify: 10, temp: 15, household: 15, other: 0 };

const STRICT_HREF = /update-primary-location|account\/travel|travel\/verify|primary-location/i;
const YES_TEXT = /s[ií],? la envi[eé] yo|actualizar hogar|actualizar|yes,? this was me|update netflix household/i;
const GETCODE_TEXT = /obtener c[oó]digo|get code|ver c[oó]digo/i;

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x3D;/g, "=").replace(/&#61;/g, "=");
const isNetflix = (u: string) => { try { const h = new URL(u).hostname; return h === "netflix.com" || h.endsWith(".netflix.com"); } catch { return false; } };

function links(html: string, text: string) {
  const out: { href: string; text: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    out.push({ href: decode(m[1]), text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) out.push({ href: decode(m[0]), text: "" });
  return out.filter((l) => isNetflix(l.href) && !/unsubscribe|help\.netflix|preferences|notification|accountaccess|TermsOfUse|PrivacyPolicy|corpinfo/i.test(l.href));
}

function classify(subject: string, text: string, ls: { href: string }[]): Kind {
  const s = `${subject}\n${text}`.toLowerCase();
  if (/c[oó]digo de inicio de sesi[oó]n|sign-in code|login code/.test(s)) return "login";
  if (/c[oó]digo de verificaci[oó]n|verification code|confirma el cambio/.test(s)) return "verify";
  if (/c[oó]digo de acceso temporal|temporary access code/.test(s)) return "temp";
  if (/hogar|household|primary-location/.test(s) || ls.some((l) => STRICT_HREF.test(l.href))) return "household";
  return "other";
}

function codeOf(text: string, n: number) {
  const kw = text.search(/c[oó]digo|code/i);
  const scan = (s: string) => {
    for (const m of s.matchAll(new RegExp(`(?<!\\d)\\d{${n}}(?!\\d)`, "g"))) {
      const v = Number(m[0]), i = m.index ?? 0, prev = s[i - 1] ?? "", next = s[i + n] ?? "";
      if (n === 4 && v >= 1900 && v <= 2100) continue;
      if (/[:/.,$#-]/.test(prev) || /[:/%]/.test(next)) continue;
      return m[0];
    }
    return null;
  };
  return (kw >= 0 && scan(text.slice(kw))) || scan(text);
}

/** Busca, solo en correos recientes de Netflix dirigidos a `accountEmail`, lo que pide cada botón. */
export async function findForAccount(accountEmail: string, key: string): Promise<Found> {
  const since = new Date(Date.now() - Number(process.env.MAIL_MAX_AGE_MIN ?? 30) * 60_000);
  const target = accountEmail.toLowerCase();
  const c = await connectIcloud();
  const lock = await c.getMailboxLock("INBOX");
  try {
    const uids = await c.search({ since: new Date(since.getTime() - 86_400_000) }, { uid: true });
    if (!uids || uids.length === 0) return { type: "none" };
    // 1) Solo fechas (liviano) → 2) descargar únicamente los correos recientes. Así rinde con muchas cuentas.
    const recent: number[] = [];
    for await (const m of c.fetch(uids.slice(-300), { internalDate: true, uid: true }, { uid: true }))
      if (new Date(m.internalDate as Date) >= since) recent.push(m.uid);
    if (recent.length === 0) return { type: "none" };
    const msgs: { at: Date; source: Buffer }[] = [];
    for await (const m of c.fetch(recent.slice(-80), { source: true, internalDate: true }, { uid: true })) {
      if (m.source) msgs.push({ at: new Date(m.internalDate as Date), source: m.source });
    }
    msgs.sort((a, b) => b.at.getTime() - a.at.getTime());
    for (const m of msgs) {
      const p = await simpleParser(m.source);
      const head = p.headerLines.map((h) => h.line).join("\n").toLowerCase();
      if (!head.includes(target) || !head.includes("netflix")) continue;
      const html = typeof p.html === "string" ? p.html : "";
      const text = p.text ?? html.replace(/<[^>]+>/g, " ");
      const ls = links(html, text);
      const kind = classify(p.subject ?? "", text, ls);
      if (kind === "other" || Date.now() - m.at.getTime() > MAX_MIN[kind] * 60_000) continue;
      const at = m.at.toISOString();

      if (key === "btn_login" && kind === "login") { const v = codeOf(text, 4); if (v) return { type: "code", value: v, at, digits: 4 }; }
      if (key === "btn_pin" && kind === "verify") { const v = codeOf(text, 6); if (v) return { type: "code", value: v, at, digits: 6 }; }
      if (key === "btn_code4" && kind === "temp") { const v = codeOf(text, 4); if (v) return { type: "code", value: v, at, digits: 4 }; }
      if (key === "btn_link" && kind === "household") {
        const l = ls.find((x) => STRICT_HREF.test(x.href) || YES_TEXT.test(x.text)); if (l) return { type: "link", value: l.href, at };
      }
      if (key === "btn_code6" && (kind === "household" || kind === "temp")) {
        const l = ls.find((x) => GETCODE_TEXT.test(x.text)) ?? (kind === "household" ? ls[0] : undefined);
        if (l) return { type: "link", value: l.href, at };
      }
    }
    return { type: "none" };
  } finally { lock.release(); await c.logout(); }
}
