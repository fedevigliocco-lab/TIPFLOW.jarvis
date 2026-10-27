import type { Usage } from "@/lib/repo";

export interface AgentResult {
  status: "fatto" | "errore";
  summary: string;
  usage?: Usage;
}
