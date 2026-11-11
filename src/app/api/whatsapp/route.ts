import { after } from "next/server";
import { replyToCustomer } from "@/agents/assistenza";
import { addMessage } from "@/lib/clienti";
import { getDb } from "@/lib/db";
import { parseWebhook, validSignature } from "@/lib/whatsapp";

// Il webhook di WhatsApp: Meta chiama qui per ogni messaggio dei clienti.
export const maxDuration = 120;

// Meta controlla il collegamento una volta sola, con la parola scritta in WHATSAPP_VERIFY_TOKEN.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === expected) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Non autorizzato", { status: 403 });
}

// Pochi secondi di attesa: se il cliente manda tre messaggi di fila, l'agente risponde una volta sola a tutti.
const WAIT_MS = Number(process.env.WHATSAPP_WAIT_MS ?? 4000);

export async function POST(request: Request) {
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-hub-signature-256"))) {
    return new Response("Firma non valida", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("ok");
  }

  const db = await getDb();
  const fresh: { phone: string; id: number }[] = [];
  for (const m of parseWebhook(payload)) {
    const id = await addMessage(db, { phone: m.phone, author: "cliente", text: m.text, waId: m.waId, name: m.name });
    if (id !== null) fresh.push({ phone: m.phone, id });
  }

  // Meta vuole una risposta subito: l'agente lavora dopo.
  after(async () => {
    if (fresh.length === 0) return;
    await new Promise((r) => setTimeout(r, WAIT_MS));
    const latest = new Map<string, number>();
    for (const f of fresh) latest.set(f.phone, Math.max(latest.get(f.phone) ?? 0, f.id));
    for (const [phone, id] of latest) {
      await replyToCustomer(db, phone, { send: true, onlyIfLatest: id });
    }
  });
  return new Response("ok");
}
