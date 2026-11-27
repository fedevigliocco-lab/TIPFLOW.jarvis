import type { Db } from "./db";
import { getQrCode } from "./qr";

// La pagina di chi scansiona il QR sui campioni: voto, lista d'attesa "Prenota il lancio" e passaparola.
// Niente vendita: la prenotazione non è un ordine e non si paga niente.

export type Lang = "it" | "en";
export type ContactKind = "whatsapp" | "email";

export interface WaitlistEntry {
  id: number;
  name: string;
  contact: string;
  contact_kind: ContactKind;
  bags: number;
  code: string | null;
  lang: Lang;
  created_at: string;
}

export interface FeedbackEntry {
  rating: number;
  comment: string | null;
  code: string | null;
  lang: Lang;
  updated_at: string;
}

export interface ProvaStats {
  scans: number;
  people: number;
  votes: number;
  average: number | null;
  ratings: number[]; // quanti voti per 1, 2, 3, 4, 5
  booked: number;
  bags: number;
  shares: number;
  fromFriends: number;
}

const num = (v: unknown) => (v == null ? 0 : Number(v));

// Solo codici di QR che esistono davvero: il resto si salva senza codice.
async function knownCode(db: Db, code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  const c = code.toLowerCase();
  return (await getQrCode(db, c)) ? c : null;
}

// "333 123 4567", "+39 333...", "0039..." diventano 393331234567; un'email resta un'email (minuscola).
export function normalizeContact(value: string): { contact: string; kind: ContactKind } | null {
  const v = value.trim();
  if (v.includes("@")) {
    const email = v.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 200 ? { contact: email, kind: "email" } : null;
  }
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) digits = `39${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? { contact: digits, kind: "whatsapp" } : null;
}

export async function saveVote(
  db: Db,
  vote: { visitor: string; code?: string | null; rating: number; comment?: string | null; lang: Lang },
): Promise<void> {
  const rating = Math.round(vote.rating);
  if (rating < 1 || rating > 5) throw new Error("Voto fuori scala");
  const comment = vote.comment?.trim().slice(0, 1000) || null;
  await db.query(
    `insert into feedback (visitor, code, rating, comment, lang) values ($1, $2, $3, $4, $5)
     on conflict (visitor) do update set rating = excluded.rating,
       comment = coalesce(excluded.comment, feedback.comment), lang = excluded.lang, updated_at = now()`,
    [vote.visitor, await knownCode(db, vote.code), rating, comment, vote.lang],
  );
}

// Iscrive alla lista d'attesa. Se lo stesso contatto si iscrive di nuovo, si aggiornano nome e buste.
export async function joinWaitlist(
  db: Db,
  entry: { visitor: string; code?: string | null; name: string; contact: string; bags: number; lang: Lang },
): Promise<boolean> {
  const contact = normalizeContact(entry.contact);
  const name = entry.name.trim().slice(0, 80);
  const bags = Math.round(entry.bags);
  if (!contact || !name || bags < 1 || bags > 50) return false;
  await db.query(
    `insert into waitlist (contact, contact_kind, name, bags, code, visitor, lang) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (contact) do update set name = excluded.name, bags = excluded.bags, lang = excluded.lang`,
    [contact.contact, contact.kind, name, bags, await knownCode(db, entry.code), entry.visitor, entry.lang],
  );
  return true;
}

export async function recordShare(db: Db, share: { visitor: string; code?: string | null; channel: string }): Promise<void> {
  const channel = /^[a-z]{1,20}$/.test(share.channel) ? share.channel : "altro";
  await db.query("insert into shares (visitor, code, channel) values ($1, $2, $3)", [
    share.visitor,
    await knownCode(db, share.code),
    channel,
  ]);
}

export async function listWaitlist(db: Db): Promise<WaitlistEntry[]> {
  const rows = await db.query<WaitlistEntry>(
    "select id, name, contact, contact_kind, bags, code, lang, created_at from waitlist order by created_at desc, id desc",
  );
  return rows.map((r) => ({ ...r, id: num(r.id), bags: num(r.bags) }));
}

export async function listComments(db: Db, limit = 50): Promise<FeedbackEntry[]> {
  const rows = await db.query<FeedbackEntry>(
    `select rating, comment, code, lang, updated_at from feedback
     where comment is not null order by updated_at desc limit $1`,
    [limit],
  );
  return rows.map((r) => ({ ...r, rating: num(r.rating) }));
}

export async function provaStats(db: Db): Promise<ProvaStats> {
  const [visits] = await db.query<Record<string, unknown>>(
    `select count(*) filter (where kind = 'scansione' and (code is null or code <> 'amico')) as scans,
            count(distinct visitor) filter (where kind = 'scansione' and (code is null or code <> 'amico')) as people,
            count(distinct visitor) filter (where kind = 'scansione' and code = 'amico') as friends
     from visits`,
  );
  const votes = await db.query<{ rating: number; n: number }>("select rating, count(*) as n from feedback group by rating");
  const [wait] = await db.query<Record<string, unknown>>("select count(*) as booked, coalesce(sum(bags), 0) as bags from waitlist");
  const [sh] = await db.query<Record<string, unknown>>("select count(*) as n from shares");

  const ratings = [0, 0, 0, 0, 0];
  for (const v of votes) ratings[num(v.rating) - 1] = num(v.n);
  const total = ratings.reduce((a, b) => a + b, 0);
  const sum = ratings.reduce((a, n, i) => a + n * (i + 1), 0);
  return {
    scans: num(visits.scans),
    people: num(visits.people),
    votes: total,
    average: total ? sum / total : null,
    ratings,
    booked: num(wait.booked),
    bags: num(wait.bags),
    shares: num(sh.n),
    fromFriends: num(visits.friends),
  };
}

// Il link che si manda su WhatsApp a un contatto della lista d'attesa (o la mail).
export function contactHref(entry: Pick<WaitlistEntry, "contact" | "contact_kind">): string {
  return entry.contact_kind === "email" ? `mailto:${entry.contact}` : `https://wa.me/${entry.contact}`;
}
