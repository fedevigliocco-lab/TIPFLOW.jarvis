import crypto from "node:crypto";

// Il collegamento con WhatsApp Business (API Cloud di Meta).
// Variabili su Vercel:
// - WHATSAPP_TOKEN: il token di accesso dell'app Meta
// - WHATSAPP_PHONE_NUMBER_ID: l'id del numero di Tipflow (non il numero stesso)
// - WHATSAPP_VERIFY_TOKEN: una parola a piacere, la stessa scritta su Meta quando colleghi il webhook
// - WHATSAPP_APP_SECRET: il segreto dell'app Meta, per essere sicuri che i messaggi arrivino da Meta
// - WHATSAPP_TITOLARE: il numero personale di fede, per gli avvisi (facoltativo)

const API_VERSION = () => process.env.WHATSAPP_API_VERSION?.trim() || "v24.0";

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Solo cifre, col prefisso internazionale: "+39 333 123 4567" diventa "393331234567".
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Meta firma ogni chiamata con il segreto dell'app: senza firma valida non leggiamo niente.
export function validSignature(body: string, header: string | null, secret = process.env.WHATSAPP_APP_SECRET): boolean {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const given = header.slice("sha256=".length);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export interface IncomingMessage {
  waId: string;
  phone: string;
  name: string | null;
  text: string;
}

const NON_TEXT: Record<string, string> = {
  audio: "un messaggio vocale",
  image: "una foto",
  video: "un video",
  document: "un documento",
  sticker: "uno sticker",
  location: "una posizione",
  contacts: "un contatto",
};

// Dal pacchetto di Meta tiene solo i messaggi dei clienti, in testo. Quello che l'agente non può
// vedere (vocali, foto...) diventa una frase che lo descrive, così risponde comunque.
export function parseWebhook(payload: unknown): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { value?: Record<string, unknown> }[] }[]) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const contacts = (value.contacts as { wa_id?: string; profile?: { name?: string } }[] | undefined) ?? [];
      for (const m of (value.messages as Record<string, unknown>[] | undefined) ?? []) {
        const phone = normalizePhone(String(m.from ?? ""));
        if (!phone || typeof m.id !== "string") continue;
        const name = contacts.find((c) => c.wa_id === m.from)?.profile?.name ?? null;
        out.push({ waId: m.id, phone, name, text: describe(m) });
      }
    }
  }
  return out;
}

function describe(m: Record<string, unknown>): string {
  const type = String(m.type ?? "");
  if (type === "text") return String((m.text as { body?: string })?.body ?? "");
  if (type === "button") return String((m.button as { text?: string })?.text ?? "");
  if (type === "interactive") {
    const i = m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } };
    return i?.button_reply?.title ?? i?.list_reply?.title ?? "[risposta a un pulsante]";
  }
  const caption = (m[type] as { caption?: string } | undefined)?.caption;
  const what = NON_TEXT[type] ?? "un messaggio che non puoi leggere";
  return `[Il cliente ha mandato ${what}: non puoi vederlo né ascoltarlo.${caption ? ` Didascalia: "${caption}"` : ""}]`;
}

// Manda un messaggio di testo. Se WhatsApp non è ancora collegato non fa niente (la chat di prova funziona lo stesso).
export async function sendText(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp non è ancora collegato." };
  const res = await fetch(`https://graph.facebook.com/${API_VERSION()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: normalizePhone(to), type: "text", text: { body: text.slice(0, 4096) } }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: `WhatsApp ha risposto ${res.status}: ${(await res.text()).slice(0, 300)}` };
}

// Avviso a fede sul suo numero personale. WhatsApp lo consegna solo se fede ha scritto al numero
// di Tipflow nelle ultime 24 ore: per questo ogni avviso finisce anche in "I tuoi da fare".
export async function notifyOwner(text: string) {
  const owner = process.env.WHATSAPP_TITOLARE?.trim();
  if (!owner) return { ok: false, error: "Numero di fede non impostato." };
  return sendText(owner, text);
}
