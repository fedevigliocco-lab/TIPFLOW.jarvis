import fs from "node:fs";
import path from "node:path";

// Un'unica interfaccia per due database:
// - Postgres vero (es. Neon) quando DATABASE_URL è impostato;
// - PGlite (Postgres dentro un file in .data/) per provare tutto in locale senza account.
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
  close(): Promise<void>;
}

export async function createDb(options: { url?: string; dataDir?: string; memory?: boolean } = {}): Promise<Db> {
  if (options.url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(options.url, { max: 5, onnotice: () => {} });
    return {
      async query<T>(text: string, params: unknown[] = []) {
        return (await sql.unsafe(text, params as never[])) as unknown as T[];
      },
      async exec(text: string) {
        await sql.unsafe(text);
      },
      async close() {
        await sql.end();
      },
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  let pg: InstanceType<typeof PGlite>;
  if (options.memory) {
    pg = new PGlite();
  } else {
    const dir = options.dataDir ?? path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    pg = new PGlite(dir);
  }
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
    async exec(text: string) {
      await pg.exec(text);
    },
    async close() {
      await pg.close();
    },
  };
}

// Crea le tabelle e i dati di partenza, se mancano.
export async function setupDb(db: Db): Promise<void> {
  const dir = path.join(process.cwd(), "db");
  await db.exec(fs.readFileSync(path.join(dir, "schema.sql"), "utf8"));
  await db.exec(fs.readFileSync(path.join(dir, "seed.sql"), "utf8"));
}

// Il pannello usa una sola connessione per processo (sopravvive ai ricaricamenti di `next dev`).
const globalForDb = globalThis as unknown as { tipflowDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.tipflowDb ??= (async () => {
    const db = await createDb({ url: process.env.DATABASE_URL || undefined });
    await setupDb(db);
    return db;
  })();
  return globalForDb.tipflowDb;
}
