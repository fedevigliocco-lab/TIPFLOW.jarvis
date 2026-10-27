-- Schema del gestionale Tipflow. Si può rieseguire: crea solo quello che manca.

-- La squadra: ogni agente (con Claude) o automazione (senza AI).
create table if not exists agents (
  id text primary key,
  name text not null,
  department text not null,
  kind text not null check (kind in ('agente', 'automazione')),
  status text not null check (status in ('acceso', 'spento', 'in costruzione')),
  description text not null,
  schedule text,
  sort_order integer not null default 0
);

-- Registro attività: ogni giro di un agente.
create table if not exists agent_runs (
  id bigserial primary key,
  agent_id text not null references agents(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'in corso' check (status in ('in corso', 'fatto', 'errore')),
  summary text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 4) not null default 0
);

-- "I tuoi da fare": tutto quello che aspetta il sì o il no di fede.
create table if not exists tasks (
  id bigserial primary key,
  agent_id text not null references agents(id),
  run_id bigint references agent_runs(id),
  kind text not null,
  title text not null,
  body text not null,
  payload jsonb,
  status text not null default 'da decidere' check (status in ('da decidere', 'approvato', 'rifiutato')),
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists tasks_status_idx on tasks (status, created_at desc);

-- Prodotti in vendita (pacchi di filtri).
create table if not exists products (
  sku text primary key,
  name text not null,
  pack_size integer not null check (pack_size > 0),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true
);

-- Magazzino: pezzi sfusi (filtri) e quanto costano.
create table if not exists inventory (
  item text primary key,
  description text not null,
  quantity integer not null check (quantity >= 0),
  unit_cost_usd numeric(10, 4) not null,
  location text not null,
  updated_at timestamptz not null default now()
);
