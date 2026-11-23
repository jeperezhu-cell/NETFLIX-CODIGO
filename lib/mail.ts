import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type Found =
  | { type: "code"; value: string; at: string }
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

// Ajusta estos patrones si Netflix cambia el formato de sus correos.
const LINK_RX: Record<string, RegExp> = {
  btn_link: /update-primary-location|account\/travel|travel\/verify|primary-location|household/i,
  btn_pin: /profile-?lock|resetpin|reset-pin|pin/i
};
const LINK_TEXT_RX: Record<string, RegExp> = {
  btn_link: /s[ií],? la envi[eé] yo|actualizar hogar|actualizar|yes,? this was me|update netflix household|confirm/i,
  btn_pin: /restablecer|cambiar pin|reset|pin/i,
  code: /obtener c[oó]digo|get code|ver c[oó]digo/i
};

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x3D;/g, "=").replace(/&#61;/g, "=");
const isNetflix = (u: string) => { try { const h = new URL(u).hostname; return h === "netflix.com" || h.endsWith(".netflix.com"); } catch { return false; } };

function links(html: string, text: string) {
  const out: { href: string; text: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    out.push({ href: decode(m[1]), text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() });
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')]+/g)) out.push({ href: decode(m[0]), text: "" });
  return out.filter((l) => isNetflix(l.href) && !/unsubscribe|help\.netflix|preferences|notification/i.test(l.href));
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

/** Busca, solo en correos recientes dirigidos a `accountEmail`, el código o enlace que pide el botón. */
export async function findForAccount(accountEmail: string, key: string): Promise<Found> {
  const maxAge = Number(process.env.MAIL_MAX_AGE_MIN ?? 30) * 60_000;
  const since = new Date(Date.now() - maxAge);
  const target = accountEmail.toLowerCase();
  const c = await connectIcloud();
  const lock = await c.getMailboxLock("INBOX");
  try {
    const uids = await c.search({ since: new Date(since.getTime() - 86_400_000) }, { uid: true });
    if (!uids || uids.length === 0) return { type: "none" };
    const msgs: { at: Date; source: Buffer }[] = [];
    for await (const m of c.fetch(uids.slice(-40), { source: true, internalDate: true }, { uid: true })) {
      const at = new Date(m.internalDate as Date);
      if (at >= since && m.source) msgs.push({ at, source: m.source });
    }
    msgs.sort((a, b) => b.at.getTime() - a.at.getTime());
    for (const m of msgs) {
      const p = await simpleParser(m.source);
      const head = p.headerLines.map((h) => h.line).join("\n").toLowerCase();
      if (!head.includes(target) || !head.includes("netflix")) continue; // solo correos de Netflix para ESTA cuenta
      const html = typeof p.html === "string" ? p.html : "";
      const text = p.text ?? html.replace(/<[^>]+>/g, " ");
      const at = m.at.toISOString();
      if (key === "btn_code4" || key === "btn_code6") {
        const code = codeOf(text, key === "btn_code4" ? 4 : 6);
        if (code) return { type: "code", value: code, at };
        const l = links(html, text).find((x) => LINK_TEXT_RX.code.test(x.text));
        if (l) return { type: "link", value: l.href, at };
      } else {
        const l = links(html, text).find((x) => LINK_RX[key]?.test(x.href) || LINK_TEXT_RX[key]?.test(x.text));
        if (l) return { type: "link", value: l.href, at };
      }
    }
    return { type: "none" };
  } finally { lock.release(); await c.logout(); }
}
