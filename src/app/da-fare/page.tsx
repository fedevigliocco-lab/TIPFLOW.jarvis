import Link from "next/link";
import { decide } from "@/app/actions";
import { Markdown } from "@/components/Markdown";
import { getDb } from "@/lib/db";
import { when } from "@/lib/format";
import { listTasks, type TaskStatus } from "@/lib/repo";

const TABS: { status: TaskStatus; label: string }[] = [
  { status: "da decidere", label: "Da decidere" },
  { status: "approvato", label: "Approvati" },
  { status: "rifiutato", label: "Rifiutati" },
];

export default async function DaFare({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  const { stato } = await searchParams;
  const current = TABS.find((t) => t.status === stato)?.status ?? "da decidere";
  const tasks = await listTasks(await getDb(), current);

  return (
    <>
      <h1>I tuoi da fare</h1>
      <p className="lead">Le proposte degli agenti che aspettano il tuo sì o il tuo no. Niente parte senza la tua decisione.</p>

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t.status} href={`/da-fare?stato=${encodeURIComponent(t.status)}`} className={t.status === current ? "on" : undefined}>
            {t.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 && <div className="empty">Qui non c&apos;è niente.</div>}

      {tasks.map((t) => (
        <article key={t.id} id={`compito-${t.id}`} className="card">
          <h3>{t.title}</h3>
          <div className="meta">
            <span className={`pill ${t.status.replace(" ", "-")}`}>{t.status}</span> · {t.agent_name} · {when(t.created_at)}
            {t.decided_at && <> · deciso {when(t.decided_at)}</>}
          </div>
          {t.note && <p className="meta">La tua nota: {t.note}</p>}

          <details open={t.status === "da decidere"}>
            <summary>Leggi la proposta</summary>
            <Markdown text={t.body} />
          </details>

          {t.status === "da decidere" && (
            <form action={decide}>
              <input type="hidden" name="id" value={t.id} />
              <textarea name="note" placeholder="Una nota per l'agente (facoltativa): cosa cambiare, cosa ti piace..." />
              <div className="actions">
                <button className="btn primary" name="decision" value="approvato">Approva</button>
                <button className="btn danger" name="decision" value="rifiutato">Rifiuta</button>
              </div>
            </form>
          )}
        </article>
      ))}
    </>
  );
}
