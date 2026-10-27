import Link from "next/link";
import { getDb } from "@/lib/db";
import { dollars, greeting, number, plural, when } from "@/lib/format";
import { listAgents, listStock, listTasks, todayStats } from "@/lib/repo";

export default async function Home() {
  const db = await getDb();
  const [stats, tasks, agents, stock] = await Promise.all([todayStats(db), listTasks(db), listAgents(db), listStock(db)]);
  const filters = stock.find((s) => s.item === "filtro")?.quantity ?? 0;
  const working = agents.filter((a) => a.status === "acceso").length;

  return (
    <>
      <h1>{greeting()} fede.</h1>
      <p className="lead">
        {stats.pending === 0
          ? "Non c'è niente che aspetta te."
          : stats.pending === 1
            ? "C'è una cosa che aspetta il tuo sì o il tuo no."
            : `Ci sono ${stats.pending} cose che aspettano il tuo sì o il tuo no.`}
      </p>

      <div className="tiles">
        <Link href="/da-fare" className="tile" style={{ textDecoration: "none" }}>
          <div className="label">I tuoi da fare</div>
          <div className="value">{stats.pending}</div>
          <div className="hint">da decidere</div>
        </Link>
        <div className="tile">
          <div className="label">Agenti accesi</div>
          <div className="value">{working} / {agents.length}</div>
          <div className="hint">{plural(stats.runs, "giro", "giri")} oggi</div>
        </div>
        <div className="tile">
          <div className="label">Spesa Claude oggi</div>
          <div className="value">{dollars(stats.costUsd)}</div>
          <div className="hint">stima dai token usati</div>
        </div>
        <Link href="/magazzino" className="tile" style={{ textDecoration: "none" }}>
          <div className="label">Filtri in magazzino</div>
          <div className="value">{number(filters)}</div>
          <div className="hint">Milano</div>
        </Link>
      </div>

      <h2>Ultime cose da decidere</h2>
      {tasks.length === 0 ? (
        <div className="empty">
          Niente da decidere. Vai in <Link href="/squadra">La squadra</Link> e fai girare l&apos;agente Negozio per la prima bozza.
        </div>
      ) : (
        tasks.slice(0, 3).map((t) => (
          <Link key={t.id} href={`/da-fare#compito-${t.id}`} className="card" style={{ display: "block", textDecoration: "none" }}>
            <h3>{t.title}</h3>
            <div className="meta">{t.agent_name} · {when(t.created_at)}</div>
          </Link>
        ))
      )}
    </>
  );
}
