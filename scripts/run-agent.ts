import { runAgent } from "../src/agents";
import { createDb, setupDb } from "../src/lib/db";

// Uso: npm run agent -- negozio
// In locale (senza DATABASE_URL) chiudi prima il pannello: il database nel file regge un solo programma alla volta.
const id = process.argv[2];
if (!id) {
  console.error("Indica quale agente: npm run agent -- negozio");
  process.exit(1);
}

const db = await createDb({ url: process.env.DATABASE_URL || undefined });
await setupDb(db);
const result = await runAgent(db, id);
await db.close();
console.log(`${id}: ${result.status}. ${result.summary}`);
if (result.usage) console.log(`Costo stimato: ${result.usage.costUsd.toFixed(4)} $ (${result.usage.model})`);
process.exit(result.status === "fatto" ? 0 : 1);
