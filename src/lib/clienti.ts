import type { Db } from "./db";

// Il servizio clienti: conversazioni WhatsApp, messaggi e ordini.

export const PROVA_PHONE = "prova";

export const ASSISTENZA_KEYS = ["spedizione", "pagamento", "istruzioni_assistenza"] as const;
export type AssistenzaKey = (typeof ASSISTENZA_KEYS)[number];

export type Author = "cliente" | "agente" | "fede";

export interface Conversation {
  phone: string;
  name: string | null;
  in_mano_a_fede: boolean;
  serve_fede: boolean;
  last_message_at: string;
  last_text: string | null;
  last_author: Author | null;
}

export interface ChatMessage {
  id: number;
  phone: string;
  author: Author;
  text: string;
  created_at: string;
}

export interface Order {
  id: number;
  phone: string;
  name: string;
  address: string;
  bags: number;
  pieces: number;
  total_cents: number; // filtri più spedizione
  notes: string | null;
  status: "da spedire" | "spedito" | "annullato";
  prova: boolean;
  created_at: string;
}

const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function ensureConversation(db: Db, phone: string, name?: string | null) {
  await db.query(
    `insert into conversations (phone, name) values ($1, $2)
     on conflict (phone) do update set name = coalesce(excluded.name, conversations.name)`,
    [phone, name ?? null],
  );
}

// Salva un messaggio. Restituisce null se quel messaggio di WhatsApp era già arrivato (Meta a volte lo rimanda).
export async function addMessage(
  db: Db,
  msg: { phone: string; author: Author; text: string; waId?: string | null; name?: string | null },
): Promise<number | null> {
  await ensureConversation(db, msg.phone, msg.name);
  const rows = await db.query<{ id: unknown }>(
    `insert into chat_messages (phone, author, text, wa_id) values ($1, $2, $3, $4)
     on conflict (wa_id) do nothing returning id`,
    [msg.phone, msg.author, msg.text, msg.waId ?? null],
  );
  if (rows.length === 0) return null;
  await db.query("update conversations set last_message_at = now() where phone = $1", [msg.phone]);
  return num(rows[0].id);
}

export async function lastCustomerMessageId(db: Db, phone: string): Promise<number> {
  const [row] = await db.query<{ id: unknown }>(
    "select max(id) as id from chat_messages where phone = $1 and author = 'cliente'",
    [phone],
  );
  return num(row?.id);
}

export async function getMessages(db: Db, phone: string, limit = 40): Promise<ChatMessage[]> {
  const rows = await db.query<ChatMessage>(
    `select * from (select id, phone, author, text, created_at from chat_messages where phone = $1 order by id desc limit $2) m
     order by id`,
    [phone, limit],
  );
  return rows.map((r) => ({ ...r, id: num(r.id) }));
}

export async function getConversation(db: Db, phone: string): Promise<Conversation | null> {
  const [row] = await db.query<Conversation>(`${conversationSelect} where c.phone = $1`, [phone]);
  return row ?? null;
}

const conversationSelect = `
  select c.phone, c.name, c.in_mano_a_fede, c.serve_fede, c.last_message_at, m.text as last_text, m.author as last_author
  from conversations c
  left join lateral (select text, author from chat_messages where phone = c.phone order by id desc limit 1) m on true`;

export async function listConversations(db: Db): Promise<Conversation[]> {
  return db.query<Conversation>(
    `${conversationSelect} where c.phone <> $1 order by c.serve_fede desc, c.last_message_at desc limit 100`,
    [PROVA_PHONE],
  );
}

export async function setConversationFlags(db: Db, phone: string, flags: { inManoAFede?: boolean; serveFede?: boolean }) {
  if (flags.inManoAFede !== undefined) {
    await db.query("update conversations set in_mano_a_fede = $2 where phone = $1", [phone, flags.inManoAFede]);
  }
  if (flags.serveFede !== undefined) {
    await db.query("update conversations set serve_fede = $2 where phone = $1", [phone, flags.serveFede]);
  }
}

// Ricomincia la chat di prova da zero (ordini di prova compresi).
export async function resetProva(db: Db) {
  await db.query("delete from orders where phone = $1", [PROVA_PHONE]);
  await db.query("delete from chat_messages where phone = $1", [PROVA_PHONE]);
  await db.query("delete from conversations where phone = $1", [PROVA_PHONE]);
}

export async function getAssistenzaSettings(db: Db): Promise<Record<AssistenzaKey | "prezzo" | "pezzi" | "instagram" | "sito", string>> {
  const rows = await db.query<{ key: string; value: string }>("select key, value from settings");
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const get = (k: string) => (map[k] ?? "").trim();
  return {
    spedizione: get("spedizione"),
    pagamento: get("pagamento"),
    istruzioni_assistenza: get("istruzioni_assistenza"),
    prezzo: get("prezzo") || "20",
    pezzi: get("pezzi") || "100",
    instagram: get("instagram"),
    sito: get("sito"),
  };
}

export async function saveAssistenzaSettings(db: Db, values: Partial<Record<AssistenzaKey, string>>) {
  for (const key of ASSISTENZA_KEYS) {
    if (values[key] === undefined) continue;
    await db.query(
      "insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value",
      [key, values[key]!.trim().slice(0, 4000)],
    );
  }
}

export async function filtersInStock(db: Db): Promise<number> {
  const [row] = await db.query<{ quantity: unknown }>("select quantity from inventory where item = 'filtro'");
  return num(row?.quantity);
}

function toOrder(r: Order): Order {
  return { ...r, id: num(r.id), bags: num(r.bags), pieces: num(r.pieces), total_cents: num(r.total_cents) };
}

// Crea l'ordine e toglie i filtri dal magazzino, tutto o niente. Gli ordini di prova non toccano il magazzino.
export async function createOrder(
  db: Db,
  o: {
    phone: string;
    name: string;
    address: string;
    bags: number;
    piecesPerBag: number;
    priceCents: number;
    shippingCents?: number;
    notes?: string | null;
  },
): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const prova = o.phone === PROVA_PHONE;
  const pieces = o.bags * o.piecesPerBag;
  if (!prova) {
    const updated = await db.query(
      "update inventory set quantity = quantity - $1, updated_at = now() where item = 'filtro' and quantity >= $1 returning item",
      [pieces],
    );
    if (updated.length === 0) return { ok: false, error: `Non ci sono abbastanza filtri in magazzino per ${pieces} pezzi.` };
  }
  const [row] = await db.query<Order>(
    `insert into orders (phone, name, address, bags, pieces, total_cents, notes, prova)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [o.phone, o.name, o.address, o.bags, pieces, o.bags * o.priceCents + (o.shippingCents ?? 0), o.notes ?? null, prova],
  );
  return { ok: true, order: toOrder(row) };
}

export async function getOrder(db: Db, id: number): Promise<Order | null> {
  const [row] = await db.query<Order>("select * from orders where id = $1", [id]);
  return row ? toOrder(row) : null;
}

export async function listOrders(db: Db, phone?: string): Promise<Order[]> {
  const rows = phone
    ? await db.query<Order>("select * from orders where phone = $1 order by id desc limit 50", [phone])
    : await db.query<Order>("select * from orders where not prova order by id desc limit 100");
  return rows.map(toOrder);
}

export async function markShipped(db: Db, id: number): Promise<Order | null> {
  const [row] = await db.query<Order>(
    "update orders set status = 'spedito' where id = $1 and status = 'da spedire' returning *",
    [id],
  );
  return row ? toOrder(row) : null;
}

// Annulla un ordine non ancora spedito e rimette i filtri in magazzino.
export async function cancelOrder(db: Db, id: number): Promise<Order | null> {
  const [row] = await db.query<Order>(
    "update orders set status = 'annullato' where id = $1 and status = 'da spedire' returning *",
    [id],
  );
  if (!row) return null;
  const order = toOrder(row);
  if (!order.prova) {
    await db.query("update inventory set quantity = quantity + $1, updated_at = now() where item = 'filtro'", [order.pieces]);
  }
  return order;
}
