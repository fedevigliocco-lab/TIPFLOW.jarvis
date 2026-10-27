// Prezzi dell'API di Claude in dollari per milione di token (input, output), ottobre 2026.
// Servono a mostrare quanto costa ogni giro di un agente nella pagina La squadra.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export const DEFAULT_MODEL = "claude-opus-5-5";

export function agentModel(): string {
  return process.env.JARVIS_MODEL?.trim() || DEFAULT_MODEL;
}

// Costo stimato di una chiamata. Per un modello sconosciuto restituisce 0 invece di inventare un prezzo.
export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
