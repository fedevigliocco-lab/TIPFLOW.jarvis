import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/db";
import { finishRun, getAgent, startRun } from "@/lib/repo";
import { runNegozio } from "./negozio";
import type { AgentResult } from "./types";

type AgentFn = (db: Db, client: Anthropic, runId: number) => Promise<AgentResult>;

// Gli agenti che sanno già lavorare. Gli altri sono in La squadra ma non ancora scritti.
const AGENTS: Record<string, AgentFn> = {
  negozio: runNegozio,
};

export function isRunnable(id: string) {
  return id in AGENTS;
}

// Fa fare un giro a un agente e lo scrive nel registro attività, anche quando va male.
export async function runAgent(db: Db, id: string, client?: Anthropic): Promise<AgentResult> {
  const fn = AGENTS[id];
  const agent = await getAgent(db, id);
  if (!fn || !agent) return { status: "errore", summary: `Agente sconosciuto: ${id}` };
  if (agent.status !== "acceso") return { status: "errore", summary: `${agent.name} è ${agent.status}.` };

  const runId = await startRun(db, id);
  let result: AgentResult;
  try {
    result = await fn(db, client ?? new Anthropic(), runId);
  } catch (error) {
    result = { status: "errore", summary: describeError(error) };
  }
  await finishRun(db, runId, result);
  return result;
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "Chiave dell'API di Claude mancante o non valida.";
  if (error instanceof Anthropic.RateLimitError) return "Troppe richieste a Claude: riprova tra poco.";
  if (error instanceof Anthropic.APIError) return `Errore dell'API di Claude (${error.status}): ${error.message}`;
  if (error instanceof Error && /api key|apiKey|authentication/i.test(error.message)) {
    return "Chiave dell'API di Claude mancante: impostala in ANTHROPIC_API_KEY.";
  }
  return error instanceof Error ? error.message : String(error);
}
