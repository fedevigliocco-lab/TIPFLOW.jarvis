import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAgent } from "@/agents";
import { TASK_KIND, type SchedaProdotto } from "@/agents/negozio";
import { createDb, setupDb, type Db } from "@/lib/db";
import { decideTask, listAgents, listTasks, todayStats } from "@/lib/repo";

const scheda: SchedaProdotto = {
  titolo: "Tipflow Carbon Tips",
  sottotitolo: "Filtri a carbone attivo con beccuccio",
  descrizione_breve: "Gusto più fresco, tiro pulito.",
  descrizione: "Filtri con **carbone attivo**.",
  punti_forza: ["Carbone attivo", "Beccuccio integrato"],
  come_si_usa: ["Inserisci il filtro"],
  faq: [{ domanda: "Quanti pezzi?", risposta: "10 o 50." }],
  seo: { titolo: "Tipflow", meta_descrizione: "Filtri", slug: "tipflow-carbon-tips" },
  proposta_prezzi: [{ confezione: "Pacco da 50", pezzi: 50, prezzo_euro: 10, spedizione: "inclusa da 3 pacchi", motivazione: "margine" }],
  tag: ["filtri"],
  avvertenze: ["Solo maggiorenni"],
  domande_per_fede: [],
};

// Un finto client: registra le richieste e risponde con la bozza qui sopra.
function fakeClient(response: Partial<{ stop_reason: string; parsed_output: SchedaProdotto | null }> = {}) {
  const calls: unknown[] = [];
  const client = {
    beta: {
      messages: {
        parse: async (params: unknown) => {
          calls.push(params);
          return {
            model: "claude-opus-5-5",
            stop_reason: "end_turn",
            parsed_output: scheda,
            usage: { input_tokens: 1000, output_tokens: 2000 },
            ...response,
          };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, calls };
}

let db: Db;
beforeEach(async () => {
  db = await createDb({ memory: true });
  await setupDb(db);
});
afterEach(async () => {
  await db.close();
});

describe("agente Negozio", () => {
  it("crea una bozza da decidere e registra il giro con il costo", async () => {
    const { client, calls } = fakeClient();
    const result = await runAgent(db, "negozio", client);

    expect(result.status).toBe("fatto");
    const [task] = await listTasks(db);
    expect(task.kind).toBe(TASK_KIND);
    expect(task.title).toBe("Bozza scheda prodotto: Tipflow Carbon Tips");
    expect(task.body).toContain("Pacco da 50");
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0])).toContain("8500 pezzi");

    const stats = await todayStats(db);
    expect(stats.runs).toBe(1);
    // 1000 token in ingresso a 4 $/M + 2000 in uscita a 20 $/M
    expect(stats.costUsd).toBeCloseTo(0.044, 4);
  });

  it("passa all'agente la nota dell'ultima bozza rifiutata", async () => {
    const first = fakeClient();
    await runAgent(db, "negozio", first.client);
    const [task] = await listTasks(db);
    await decideTask(db, task.id, "rifiutato", "Prezzo del pacco da 10 troppo basso");

    const second = fakeClient();
    await runAgent(db, "negozio", second.client);
    expect(JSON.stringify(second.calls[0])).toContain("Prezzo del pacco da 10 troppo basso");
  });

  it("non crea compiti se Claude rifiuta o la risposta è incompleta", async () => {
    const refused = await runAgent(db, "negozio", fakeClient({ stop_reason: "refusal", parsed_output: null }).client);
    const truncated = await runAgent(db, "negozio", fakeClient({ stop_reason: "max_tokens", parsed_output: null }).client);

    expect(refused.status).toBe("errore");
    expect(truncated.status).toBe("errore");
    expect(await listTasks(db)).toHaveLength(0);
    const negozio = (await listAgents(db)).find((a) => a.id === "negozio");
    expect(negozio?.last_run_status).toBe("errore");
  });

  it("registra l'errore senza fermarsi quando la chiamata fallisce", async () => {
    const broken = { beta: { messages: { parse: async () => { throw new Error("rete giù"); } } } };
    const result = await runAgent(db, "negozio", broken as unknown as Anthropic);
    expect(result).toEqual({ status: "errore", summary: "rete giù" });
  });

  it("non fa girare agenti spenti o sconosciuti", async () => {
    expect((await runAgent(db, "contabilita", fakeClient().client)).status).toBe("errore");
    expect((await runAgent(db, "boh", fakeClient().client)).status).toBe("errore");
  });
});

describe("I tuoi da fare", () => {
  it("una decisione si prende una volta sola", async () => {
    await runAgent(db, "negozio", fakeClient().client);
    const [task] = await listTasks(db);
    expect(await decideTask(db, task.id, "approvato")).toBe(true);
    expect(await decideTask(db, task.id, "rifiutato")).toBe(false);
    expect(await listTasks(db, "approvato")).toHaveLength(1);
  });
});
