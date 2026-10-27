import { createDb, setupDb } from "../src/lib/db";

// Crea tabelle e dati di partenza. Con DATABASE_URL usa quel database, altrimenti .data/pglite.
const db = await createDb({ url: process.env.DATABASE_URL || undefined });
await setupDb(db);
await db.close();
console.log(process.env.DATABASE_URL ? "Database pronto." : "Database locale pronto in .data/pglite.");
