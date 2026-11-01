import { isRunnable } from "@/agents";
import { runNow } from "@/app/actions";
import { RunButton } from "@/components/RunButton";
import { getDb } from "@/lib/db";
import { when } from "@/lib/format";
import { listAgents } from "@/lib/repo";

export const maxDuration = 300;

export default async function Squadra({
  searchParams,
}: {
  searchParams: Promise<{ agente?: string; esito?: string; messaggio?: string }>;
}) {
  const { esito, messaggio } = await searchParams;
  const agents = await listAgents(await getDb());
  const departments = [...new Set(agents.map((a) => a.department))];

  return (
    <>
      <h1>La squadra</h1>
      <p className="lead">Ogni agente al suo posto. Quelli del lancio partono subito, quelli della gestione si accendono con i primi ordini.</p>

      {messaggio && <div className={`notice ${esito === "errore" ? "bad" : ""}`}>{messaggio}</div>}

      {departments.map((dep) => (
        <section key={dep}>
          <h2>{dep}</h2>
          <div className="grid">
            {agents
              .filter((a) => a.department === dep)
              .map((a) => (
                <div key={a.id} className="card">
                  <h3>{a.name}</h3>
                  <div className="meta">
                    <span className={`pill ${a.status.replace(" ", "-")}`}>{a.status}</span> ·{" "}
                    {a.kind === "agente" ? "Agente (Claude)" : "Automazione senza AI"}
                    {a.pending_tasks > 0 && <> · {a.pending_tasks} da decidere</>}
                  </div>
                  <p>{a.description}</p>
                  <div className="meta">
                    Ultimo giro: {when(a.last_run_at)}
                    {a.last_run_status && <> · {a.last_run_status}</>}
                  </div>
                  {a.last_run_summary && <div className="meta">{a.last_run_summary}</div>}
                  {a.status === "acceso" && isRunnable(a.id) && (
                    <form action={runNow} className="actions">
                      <input type="hidden" name="agent" value={a.id} />
                      <RunButton />
                    </form>
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
