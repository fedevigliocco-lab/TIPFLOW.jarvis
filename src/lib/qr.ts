import type { Db } from "./db";

// Il test di mercato: QR sui pacchi → pagina pubblica → WhatsApp, Instagram o sito.

export const SETTING_KEYS = ["titolo", "testo", "whatsapp", "messaggio_whatsapp", "instagram", "sito"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Record<SettingKey, string>;

export const LINK_KINDS = ["whatsapp", "instagram", "sito"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export type VisitKind = "scansione" | LinkKind;

export interface QrCode {
  code: string;
  label: string;
  created_at: string;
}

export interface QrStats {
  code: string;
  label: string;
  scans: number;
  people: number;
  whatsapp: number;
  instagram: number;
  sito: number;
}

export interface DayStats {
  day: string;
  scans: number;
  people: number;
  whatsapp: number;
}

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.query<{ key: string; value: string }>("select key, value from settings");
  const settings = Object.fromEntries(SETTING_KEYS.map((k) => [k, ""])) as Settings;
  for (const r of rows) if ((SETTING_KEYS as readonly string[]).includes(r.key)) settings[r.key as SettingKey] = r.value;
  return settings;
}

export async function saveSettings(db: Db, values: Partial<Settings>): Promise<void> {
  for (const key of SETTING_KEYS) {
    if (values[key] === undefined) continue;
    await db.query(
      "insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
      [key, values[key]!.trim()],
    );
  }
}

export async function listQrCodes(db: Db): Promise<QrCode[]> {
  return db.query<QrCode>("select code, label, created_at from qr_codes order by created_at, code");
}

export async function getQrCode(db: Db, code: string): Promise<QrCode | null> {
  const rows = await db.query<QrCode>("select code, label, created_at from qr_codes where code = $1", [code]);
  return rows[0] ?? null;
}

// Codici corti e puliti: finiscono stampati dentro il QR.
export function isValidCode(code: string): boolean {
  return /^[a-z0-9-]{1,20}$/.test(code);
}

export async function createQrCode(db: Db, code: string, label: string): Promise<boolean> {
  if (!isValidCode(code) || !label.trim()) return false;
  const rows = await db.query(
    "insert into qr_codes (code, label) values ($1, $2) on conflict (code) do nothing returning code",
    [code, label.trim()],
  );
  return rows.length > 0;
}

export async function recordVisit(db: Db, visit: { code: string | null; kind: VisitKind; visitor: string }): Promise<void> {
  const code = visit.code && (await getQrCode(db, visit.code)) ? visit.code : null;
  await db.query("insert into visits (code, kind, visitor) values ($1, $2, $3)", [code, visit.kind, visit.visitor]);
}

export async function qrStats(db: Db): Promise<QrStats[]> {
  const rows = await db.query<QrStats>(
    `select q.code, q.label,
            count(*) filter (where v.kind = 'scansione') as scans,
            count(distinct v.visitor) filter (where v.kind = 'scansione') as people,
            count(distinct v.visitor) filter (where v.kind = 'whatsapp') as whatsapp,
            count(distinct v.visitor) filter (where v.kind = 'instagram') as instagram,
            count(distinct v.visitor) filter (where v.kind = 'sito') as sito
     from qr_codes q left join visits v on v.code = q.code
     group by q.code, q.label, q.created_at
     order by q.created_at, q.code`,
  );
  return rows.map((r) => ({
    ...r,
    scans: num(r.scans),
    people: num(r.people),
    whatsapp: num(r.whatsapp),
    instagram: num(r.instagram),
    sito: num(r.sito),
  }));
}

// Totali di tutte le visite (anche chi arriva sulla pagina senza QR), per i riquadri in alto.
export async function totalStats(db: Db): Promise<Omit<QrStats, "code" | "label">> {
  const [r] = await db.query<Record<string, unknown>>(
    `select count(*) filter (where kind = 'scansione') as scans,
            count(distinct visitor) filter (where kind = 'scansione') as people,
            count(distinct visitor) filter (where kind = 'whatsapp') as whatsapp,
            count(distinct visitor) filter (where kind = 'instagram') as instagram,
            count(distinct visitor) filter (where kind = 'sito') as sito
     from visits`,
  );
  return { scans: num(r.scans), people: num(r.people), whatsapp: num(r.whatsapp), instagram: num(r.instagram), sito: num(r.sito) };
}

export async function dailyStats(db: Db, days = 14): Promise<DayStats[]> {
  const rows = await db.query<DayStats>(
    `select to_char(created_at at time zone 'Europe/Rome', 'YYYY-MM-DD') as day,
            count(*) filter (where kind = 'scansione') as scans,
            count(distinct visitor) filter (where kind = 'scansione') as people,
            count(distinct visitor) filter (where kind = 'whatsapp') as whatsapp
     from visits
     where created_at > now() - make_interval(days => $1)
     group by 1 order by 1 desc`,
    [days],
  );
  return rows.map((r) => ({ day: r.day, scans: num(r.scans), people: num(r.people), whatsapp: num(r.whatsapp) }));
}

// Impronta anonima di chi visita: la stessa persona dallo stesso telefono dà sempre la stessa impronta,
// ma dall'impronta non si risale all'indirizzo IP.
export async function visitorId(ip: string, userAgent: string): Promise<string> {
  const enc = new TextEncoder();
  const secret = process.env.CRON_SECRET || process.env.JARVIS_PASSWORD || "tipflow";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ip}|${userAgent}`));
  return Array.from(new Uint8Array(sig).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Anteprime di WhatsApp, Telegram e motori di ricerca: non sono persone, non si contano.
export function isBot(userAgent: string): boolean {
  return !userAgent || /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget/i.test(userAgent);
}

// Dove porta ogni pulsante, a partire da quello che fede scrive in Jarvis.
export function linkTarget(kind: LinkKind, settings: Settings): string | null {
  if (kind === "whatsapp") {
    let digits = settings.whatsapp.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("00")) digits = digits.slice(2);
    // Numero italiano scritto senza prefisso (es. 333 1234567).
    if (digits.length === 10 && digits.startsWith("3")) digits = `39${digits}`;
    const text = settings.messaggio_whatsapp ? `?text=${encodeURIComponent(settings.messaggio_whatsapp)}` : "";
    return `https://wa.me/${digits}${text}`;
  }
  if (kind === "instagram") {
    const ig = settings.instagram.trim();
    if (!ig) return null;
    if (/^https?:\/\//i.test(ig)) return ig;
    const handle = ig.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
    return handle ? `https://instagram.com/${encodeURIComponent(handle)}` : null;
  }
  const site = settings.sito.trim();
  if (!site) return null;
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

// Il dominio scritto in JARVIS_PUBLIC_URL, ripulito: tiene solo "https://dominio", senza virgole,
// spazi, barre o percorsi finiti lì per sbaglio (la tastiera del telefono ne aggiunge). null se non è un dominio.
export function publicOrigin(value: string | undefined): string | null {
  const first = value?.trim().split(/[\s,;]+/)[0]?.replace(/[.,;/]+$/, "");
  if (!first) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(first) ? first : `https://${first}`);
    return url.hostname.includes(".") ? url.origin : null;
  } catch {
    return null;
  }
}
