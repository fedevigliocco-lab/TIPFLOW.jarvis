import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { agentModel, costUsd } from "@/lib/cost";
import { createTask, lastRejection, listProducts, listStock, type Usage } from "@/lib/repo";
import type { AgentResult } from "./types";

export const TASK_KIND = "bozza-scheda-prodotto";

// La forma della bozza che l'agente deve restituire: è anche quello che finirà su Shopify.
export const SchedaProdotto = z.object({
  titolo: z.string().describe("Nome del prodotto come appare nel negozio"),
  sottotitolo: z.string(),
  descrizione_breve: z.string().describe("Una o due frasi per l'anteprima"),
  descrizione: z.string().describe("Descrizione completa in Markdown"),
  punti_forza: z.array(z.string()),
  come_si_usa: z.array(z.string()),
  faq: z.array(z.object({ domanda: z.string(), risposta: z.string() })),
  seo: z.object({ titolo: z.string(), meta_descrizione: z.string(), slug: z.string() }),
  proposta_prezzi: z.array(
    z.object({
      confezione: z.string(),
      pezzi: z.number(),
      prezzo_euro: z.number(),
      spedizione: z.string().describe("Come si gestisce la spedizione per questa confezione"),
      motivazione: z.string(),
    }),
  ),
  tag: z.array(z.string()),
  avvertenze: z.array(z.string()).describe("Frasi da evitare, obblighi o rischi da controllare prima di pubblicare"),
  domande_per_fede: z.array(z.string()).describe("Informazioni mancanti che servono per completare la scheda"),
});
export type SchedaProdotto = z.infer<typeof SchedaProdotto>;

const SYSTEM = `Sei l'agente Negozio di Tipflow, un piccolo marchio italiano che sta per lanciare il suo negozio online su Shopify.
Il tuo lavoro è preparare bozze che il titolare, fede, approva o rifiuta dal telefono: scrivi in italiano, in modo chiaro e pronto da pubblicare.

Il marchio: logo in stile graffiti spray, nero con colature; il tono è street, diretto, senza essere volgare.
Regole che valgono sempre:
- Non fare affermazioni sulla salute: non dire che il filtro rende il fumo sano, meno dannoso o che protegge i polmoni. Puoi parlare di gusto, freschezza al palato e comodità. Se un'affermazione di fede rischia di essere letta come promessa sulla salute, segnalala in "avvertenze".
- Il prodotto è un accessorio per fumatori adulti: niente riferimenti che possano attirare minorenni, e prevedi in "avvertenze" la vendita solo a maggiorenni.
- Non inventare dati che non hai (misure, materiali, certificazioni, tempi di spedizione): se servono, mettili in "domande_per_fede".
- Nei prezzi tieni conto che una spedizione in Italia costa circa 4-7 euro: un pacco piccolo spedito da solo può non avere senso per il cliente.`;

function describeFacts(facts: {
  products: Awaited<ReturnType<typeof listProducts>>;
  stock: Awaited<ReturnType<typeof listStock>>;
  rejection: Awaited<ReturnType<typeof lastRejection>>;
}) {
  const lines = [
    "Dati di oggi dal gestionale:",
    "",
    "Prodotto: filtri a carbone attivo con beccuccio integrato, per un fumo più pulito e più fresco (parole di fede). Logo Tipflow stampato su ogni filtro.",
    "",
    "Magazzino:",
    ...facts.stock.map(
      (s) => `- ${s.description}: ${s.quantity} pezzi a ${s.location}, costo ${s.unit_cost_usd} USD al pezzo`,
    ),
    "",
    "Confezioni e prezzi pensati da fede:",
    ...facts.products.map((p) => `- ${p.name} (${p.sku}): ${(p.price_cents / 100).toFixed(2)} euro`),
    "",
    "Fornitore in Cina con ordine minimo di 50.000 pezzi. Nessuna vendita ancora, nessun sito, nessun profilo social.",
  ];
  if (facts.rejection) {
    lines.push(
      "",
      "Fede ha rifiutato la bozza precedente." +
        (facts.rejection.note ? ` La sua nota: "${facts.rejection.note}". Correggi di conseguenza.` : " Non ha lasciato note."),
    );
  }
  lines.push("", "Prepara la bozza completa della scheda prodotto per Shopify e una proposta di prezzi e confezioni.");
  return lines.join("\n");
}

// Trasforma la bozza in un testo leggibile per la pagina "I tuoi da fare".
export function renderScheda(s: SchedaProdotto): string {
  const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
  return [
    `# ${s.titolo}`,
    `_${s.sottotitolo}_`,
    s.descrizione_breve,
    "## Descrizione",
    s.descrizione,
    "## Punti di forza",
    list(s.punti_forza),
    "## Come si usa",
    list(s.come_si_usa),
    "## Prezzi e confezioni proposti",
    s.proposta_prezzi
      .map((p) => `- **${p.confezione}** (${p.pezzi} pezzi): ${p.prezzo_euro.toFixed(2)} € · ${p.spedizione}. ${p.motivazione}`)
      .join("\n"),
    "## Domande frequenti",
    s.faq.map((f) => `**${f.domanda}**\n${f.risposta}`).join("\n\n"),
    "## SEO",
    `- Titolo: ${s.seo.titolo}\n- Descrizione: ${s.seo.meta_descrizione}\n- Indirizzo: /products/${s.seo.slug}`,
    "## Tag",
    s.tag.join(", "),
    "## Da controllare prima di pubblicare",
    list(s.avvertenze),
    ...(s.domande_per_fede.length ? ["## Domande per te", list(s.domande_per_fede)] : []),
  ].join("\n\n");
}

export async function runNegozio(db: Db, client: Anthropic, runId: number): Promise<AgentResult> {
  const [products, stock, rejection] = await Promise.all([
    listProducts(db),
    listStock(db),
    lastRejection(db, "negozio", TASK_KIND),
  ]);

  const model = agentModel();
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(SchedaProdotto) },
    system: SYSTEM,
    messages: [{ role: "user", content: describeFacts({ products, stock, rejection }) }],
  });

  const usage: Usage = {
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    costUsd: costUsd(response.model, response.usage.input_tokens, response.usage.output_tokens),
  };

  if (response.stop_reason === "refusal") {
    return { status: "errore", summary: "Claude ha rifiutato di preparare la bozza.", usage };
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    return { status: "errore", summary: "La bozza è arrivata incompleta: nessun compito creato.", usage };
  }

  const scheda = response.parsed_output;
  await createTask(db, {
    agentId: "negozio",
    runId,
    kind: TASK_KIND,
    title: `Bozza scheda prodotto: ${scheda.titolo}`,
    body: renderScheda(scheda),
    payload: scheda,
  });
  return { status: "fatto", summary: "Bozza della scheda prodotto pronta in I tuoi da fare.", usage };
}
