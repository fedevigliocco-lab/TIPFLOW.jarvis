import crypto from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HOLDING_REPLY, onTaskDecided, ORDER_TASK, replyToCustomer, toMessages } from "@/agents/assistenza";
import { addMessage, filtersInStock, getConversation, getMessages, listOrders, PROVA_PHONE } from "@/lib/clienti";
import { createDb, setupDb, type Db } from "@/lib/db";
import { listAgents, listTasks } from "@/lib/repo";
import { parseWebhook, validSignature } from "@/lib/whatsapp";

type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown };

// Un finto Claude: risponde con le risposte preparate, una per chiamata, e registra le richieste.
function fakeClient(script: { stop_reason: string; content: Block[] }[]) {
  const calls: { messages: unknown[]; system: unknown }[] = [];
  const client = {
    beta: {
      messages: {
        create: async (params: { messages: unknown[]; system: unknown }) => {
          calls.push(JSON.parse(JSON.stringify(params)));
          const next = script.shift();
          if (!next) throw new Error("nessuna risposta preparata");
          return { model: "claude-opus-5-5", usage: { input_tokens: 1000, output_tokens: 100 }, ...next };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, calls };
}

const say = (text: string) => ({ stop_reason: "end_turn", content: [{ type: "text" as const, text }] });
const use = (name: string, input: unknown) => ({
  stop_reason: "tool_use",
  content: [{ type: "tool_use" as const, id: `t-${name}`, name, input }],
});

const PHONE = "393331234567";
let db: Db;
beforeEach(async () => {
  db = await createDb({ memory: true });
  await setupDb(db);
});
afterEach(async () => {
  await db.close();
});

describe("agente Assistenza", () => {
  it("risponde al cliente con i dati di oggi e registra il giro", async () => {
    await addMessage(db, { phone: PHONE, author: "cliente", text: "Quanto costano?", name: "Luca" });
    const { client, calls } = fakeClient([say("Una busta da 100 filtri costa 20 €!")]);
    const result = await replyToCustomer(db, PHONE, { client });

    expect(result).toMatchObject({ status: "risposto", reply: "Una busta da 100 filtri costa 20 €!" });
    expect(JSON.stringify(calls[0].system)).toContain("Busta da 100 filtri");
    expect(JSON.stringify(calls[0].system)).toContain("Buste disponibili subito: 85");
    const messages = await getMessages(db, PHONE);
    expect(messages.map((m) => m.author)).toEqual(["cliente", "agente"]);
    const agent = (await listAgents(db)).find((a) => a.id === "assistenza-ordini");
    expect(agent?.status).toBe("acceso");
    expect(agent?.last_run_status).toBe("fatto");
  });

  it("crea l'ordine, scala il magazzino e lo mette in I tuoi da fare", async () => {
    await addMessage(db, { phone: PHONE, author: "cliente", text: "Sì confermo, ho 25 anni" });
    const { client, calls } = fakeClient([
      use("crea_ordine", { nome: "Luca Rossi", indirizzo: "Via Roma 1, 20100 Milano MI", buste: 2, maggiorenne: true }),
      say("Fatto! Ordine #1 da 40 €."),
    ]);
    const result = await replyToCustomer(db, PHONE, { client });

    expect(result.reply).toBe("Fatto! Ordine #1 da 40 €.");
    expect(await filtersInStock(db)).toBe(8300);
    const [order] = await listOrders(db, PHONE);
    expect(order).toMatchObject({ bags: 2, pieces: 200, total_cents: 4000, status: "da spedire" });
    const [task] = await listTasks(db);
    expect(task.kind).toBe(ORDER_TASK);
    // il risultato dello strumento torna a Claude nella seconda chiamata
    expect(JSON.stringify(calls[1].messages)).toContain("Ordine #1 creato");
  });

  it("non vende senza la conferma dei 18 anni", async () => {
    await addMessage(db, { phone: PHONE, author: "cliente", text: "Voglio 1 busta" });
    const { client, calls } = fakeClient([
      use("crea_ordine", { nome: "Luca Rossi", indirizzo: "Via Roma 1, 20100 Milano", buste: 1, maggiorenne: false }),
      say("Prima dimmi: hai almeno 18 anni?"),
    ]);
    await replyToCustomer(db, PHONE, { client });
    expect(await listOrders(db, PHONE)).toHaveLength(0);
    expect(JSON.stringify(calls[1].messages)).toContain("18 anni");
  });

  it("quando spedisci, l'ordine diventa spedito e il cliente riceve il tracking; se lo rifiuti i filtri tornano", async () => {
    await addMessage(db, { phone: PHONE, author: "cliente", text: "ok" });
    const order = { nome: "Luca Rossi", indirizzo: "Via Roma 1, 20100 Milano", buste: 1, maggiorenne: true };
    await replyToCustomer(db, PHONE, { client: fakeClient([use("crea_ordine", order), say("ok")]).client });
    await addMessage(db, { phone: PHONE, author: "cliente", text: "e un altro" });
    await replyToCustomer(db, PHONE, { client: fakeClient([use("crea_ordine", order), say("ok")]).client });
    expect(await filtersInStock(db)).toBe(8300);

    const tasks = await listTasks(db);
    const [second, first] = tasks;
    await onTaskDecided(db, first, "approvato", "RR123IT");
    await onTaskDecided(db, second, "rifiutato");

    const orders = await listOrders(db, PHONE);
    expect(orders.map((o) => o.status).sort()).toEqual(["annullato", "spedito"]);
    expect(await filtersInStock(db)).toBe(8400);
    const last = (await getMessages(db, PHONE)).at(-1);
    expect(last?.text).toContain("RR123IT");
  });

  it("chiama fede e, se serve, smette di rispondere", async () => {
    await addMessage(db, { phone: PHONE, author: "cliente", text: "Voglio parlare con una persona, il pacco è arrivato rotto" });
    const { client } = fakeClient([
      use("chiama_fede", { motivo: "pacco rotto", riepilogo: "Il cliente dice che il pacco è rotto", in_pausa: true }),
      say("Mi dispiace! Ho girato tutto a fede, ti scrive a breve."),
    ]);
    await replyToCustomer(db, PHONE, { client });

    const conv = await getConversation(db, PHONE);
    expect(conv).toMatchObject({ serve_fede: true, in_mano_a_fede: true });
    expect((await listTasks(db))[0].title).toContain("pacco rotto");

    await addMessage(db, { phone: PHONE, author: "cliente", text: "allora?" });
    const again = await replyToCustomer(db, PHONE, { client: fakeClient([]).client });
    expect(again.status).toBe("saltato");
  });

  it("se Claude non risponde, il cliente riceve un messaggio di attesa e fede viene avvisato", async () => {
    await addMessage(db, { phone: PHONE, author: "cliente", text: "ciao" });
    const result = await replyToCustomer(db, PHONE, { client: fakeClient([]).client });
    expect(result).toMatchObject({ status: "errore", reply: HOLDING_REPLY });
    expect(await listTasks(db)).toHaveLength(1);
    expect((await getConversation(db, PHONE))?.serve_fede).toBe(true);
  });

  it("risponde una volta sola se il cliente manda più messaggi di fila", async () => {
    const first = await addMessage(db, { phone: PHONE, author: "cliente", text: "ciao" });
    await addMessage(db, { phone: PHONE, author: "cliente", text: "quanto costano?" });
    const result = await replyToCustomer(db, PHONE, { client: fakeClient([]).client, onlyIfLatest: first! });
    expect(result.status).toBe("saltato");
  });

  it("gli ordini della chat di prova non toccano il magazzino", async () => {
    await addMessage(db, { phone: PROVA_PHONE, author: "cliente", text: "2 buste" });
    const { client } = fakeClient([
      use("crea_ordine", { nome: "Prova", indirizzo: "Via Prova 1, 00100 Roma", buste: 2, maggiorenne: true }),
      say("ok"),
    ]);
    await replyToCustomer(db, PROVA_PHONE, { client });
    expect(await filtersInStock(db)).toBe(8500);
    expect((await listTasks(db))[0].title).toContain("[Prova]");
  });

  it("nella storia per Claude il cliente è user e fede è assistant", () => {
    const m = (id: number, author: "cliente" | "agente" | "fede", text: string) => ({ id, phone: PHONE, author, text, created_at: "" });
    const out = toMessages([m(1, "agente", "salve"), m(2, "cliente", "ciao"), m(3, "fede", "eccomi"), m(4, "cliente", "ok")]);
    expect(out.map((x) => x.role)).toEqual(["user", "assistant", "user"]);
    expect(JSON.stringify(out[1])).toContain("fede di persona");
  });
});

describe("webhook WhatsApp", () => {
  it("legge testo e descrive vocali e foto", () => {
    const payload = {
      entry: [{ changes: [{ value: {
        contacts: [{ wa_id: PHONE, profile: { name: "Luca" } }],
        messages: [
          { from: PHONE, id: "wamid.1", type: "text", text: { body: "Ciao" } },
          { from: PHONE, id: "wamid.2", type: "audio", audio: {} },
          { from: PHONE, id: "wamid.3", type: "image", image: { caption: "rotto" } },
        ],
      } }] }],
    };
    const msgs = parseWebhook(payload);
    expect(msgs[0]).toEqual({ waId: "wamid.1", phone: PHONE, name: "Luca", text: "Ciao" });
    expect(msgs[1].text).toContain("vocale");
    expect(msgs[2].text).toContain('"rotto"');
  });

  it("accetta solo chiamate firmate da Meta", () => {
    const body = '{"entry":[]}';
    const sig = "sha256=" + crypto.createHmac("sha256", "segreto").update(body).digest("hex");
    expect(validSignature(body, sig, "segreto")).toBe(true);
    expect(validSignature(body, sig, "altro")).toBe(false);
    expect(validSignature(body, null, "segreto")).toBe(false);
  });

  it("non salva due volte lo stesso messaggio", async () => {
    expect(await addMessage(db, { phone: PHONE, author: "cliente", text: "ciao", waId: "wamid.1" })).not.toBeNull();
    expect(await addMessage(db, { phone: PHONE, author: "cliente", text: "ciao", waId: "wamid.1" })).toBeNull();
  });
});

describe("tono da persona", () => {
  it("il cliente non vede mai le etichette interne", async () => {
    const { cleanReply } = await import("@/agents/assistenza");
    expect(cleanReply("[Messaggio scritto da fede di persona] Arriva domani!")).toBe("Arriva domani!");
    expect(cleanReply("Ciao [nome]!")).toBe("Ciao [nome]!");
  });
});
