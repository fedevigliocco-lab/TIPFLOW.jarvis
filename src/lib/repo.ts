import type { Db } from "./db";

export type AgentStatus = "acceso" | "spento" | "in costruzione";
export type TaskStatus = "da decidere" | "approvato" | "rifiutato";

export interface Agent {
  id: string;
  name: string;
  department: string;
  kind: "agente" | "automazione";
  status: AgentStatus;
  description: string;
  schedule: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: string | null;
  pending_tasks: number;
}

export interface Task {
  id: number;
  agent_id: string;
  agent_name: string;
  kind: string;
  title: string;
  body: string;
  payload: unknown;
  status: TaskStatus;
  note: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface StockItem {
  item: string;
  description: string;
  quantity: number;
  unit_cost_usd: number;
  location: string;
  updated_at: string;
}

export interface Product {
  sku: string;
  name: string;
  pack_size: number;
  price_cents: number;
}

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Postgres restituisce bigint e numeric come stringhe: qui li riportiamo a numeri.
const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function listAgents(db: Db): Promise<Agent[]> {
  const rows = await db.query<Agent>(`
    select a.id, a.name, a.department, a.kind, a.status, a.description, a.schedule,
           r.started_at as last_run_at, r.status as last_run_status, r.summary as last_run_summary,
           (select count(*) from tasks t where t.agent_id = a.id and t.status = 'da decidere') as pending_tasks
    from agents a
    left join lateral (
      select started_at, status, summary from agent_runs where agent_id = a.id order by started_at desc limit 1
    ) r on true
    order by a.sort_order`);
  return rows.map((r) => ({ ...r, pending_tasks: num(r.pending_tasks) }));
}

export async function getAgent(db: Db, id: string) {
  const [agent] = await db.query<{ id: string; name: string; status: AgentStatus }>(
    "select id, name, status from agents where id = $1",
    [id],
  );
  return agent ?? null;
}

const taskColumns = `t.id, t.agent_id, a.name as agent_name, t.kind, t.title, t.body, t.payload, t.status, t.note,
  t.created_at, t.decided_at`;

function toTask(r: Task): Task {
  return { ...r, id: num(r.id) };
}

export async function listTasks(db: Db, status: TaskStatus = "da decidere"): Promise<Task[]> {
  const rows = await db.query<Task>(
    `select ${taskColumns} from tasks t join agents a on a.id = t.agent_id
     where t.status = $1 order by coalesce(t.decided_at, t.created_at) desc limit 100`,
    [status],
  );
  return rows.map(toTask);
}

export async function getTask(db: Db, id: number): Promise<Task | null> {
  const [row] = await db.query<Task>(
    `select ${taskColumns} from tasks t join agents a on a.id = t.agent_id where t.id = $1`,
    [id],
  );
  return row ? toTask(row) : null;
}

export async function createTask(
  db: Db,
  task: { agentId: string; runId: number | null; kind: string; title: string; body: string; payload?: unknown },
): Promise<number> {
  const [row] = await db.query<{ id: unknown }>(
    `insert into tasks (agent_id, run_id, kind, title, body, payload) values ($1, $2, $3, $4, $5, $6) returning id`,
    [task.agentId, task.runId, task.kind, task.title, task.body, JSON.stringify(task.payload ?? null)],
  );
  return num(row.id);
}

// Una decisione si prende una volta sola: un compito già deciso non cambia più.
export async function decideTask(db: Db, id: number, decision: "approvato" | "rifiutato", note?: string) {
  const rows = await db.query(
    `update tasks set status = $2, note = $3, decided_at = now() where id = $1 and status = 'da decidere' returning id`,
    [id, decision, note?.trim() || null],
  );
  return rows.length === 1;
}

// La nota dell'ultima bozza rifiutata, così l'agente sa cosa correggere.
export async function lastRejection(db: Db, agentId: string, kind: string) {
  const [row] = await db.query<{ note: string | null; payload: unknown }>(
    `select note, payload from tasks where agent_id = $1 and kind = $2 and status = 'rifiutato'
     order by decided_at desc limit 1`,
    [agentId, kind],
  );
  return row ?? null;
}

export async function startRun(db: Db, agentId: string): Promise<number> {
  const [row] = await db.query<{ id: unknown }>(`insert into agent_runs (agent_id) values ($1) returning id`, [agentId]);
  return num(row.id);
}

export async function finishRun(
  db: Db,
  runId: number,
  result: { status: "fatto" | "errore"; summary: string; usage?: Usage },
) {
  await db.query(
    `update agent_runs set finished_at = now(), status = $2, summary = $3, model = $4,
       input_tokens = $5, output_tokens = $6, cost_usd = $7 where id = $1`,
    [
      runId,
      result.status,
      result.summary,
      result.usage?.model ?? null,
      result.usage?.inputTokens ?? 0,
      result.usage?.outputTokens ?? 0,
      result.usage?.costUsd ?? 0,
    ],
  );
}

export async function todayStats(db: Db) {
  const [row] = await db.query<{ runs: unknown; cost: unknown; pending: unknown; done_today: unknown }>(`
    select
      (select count(*) from agent_runs where started_at >= date_trunc('day', now())) as runs,
      (select coalesce(sum(cost_usd), 0) from agent_runs where started_at >= date_trunc('day', now())) as cost,
      (select count(*) from tasks where status = 'da decidere') as pending,
      (select count(*) from agent_runs where status = 'fatto' and started_at >= date_trunc('day', now())) as done_today`);
  return { runs: num(row.runs), costUsd: num(row.cost), pending: num(row.pending), doneToday: num(row.done_today) };
}

export async function listStock(db: Db): Promise<StockItem[]> {
  const rows = await db.query<StockItem>("select * from inventory order by item");
  return rows.map((r) => ({ ...r, quantity: num(r.quantity), unit_cost_usd: num(r.unit_cost_usd) }));
}

export async function listProducts(db: Db): Promise<Product[]> {
  const rows = await db.query<Product>(
    "select sku, name, pack_size, price_cents from products where active order by pack_size",
  );
  return rows.map((r) => ({ ...r, pack_size: num(r.pack_size), price_cents: num(r.price_cents) }));
}
