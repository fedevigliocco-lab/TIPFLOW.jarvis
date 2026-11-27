import { getDb } from "@/lib/db";
import { number, plural, when } from "@/lib/format";
import { contactHref, listComments, listWaitlist, provaStats } from "@/lib/prova";
import { getSettings } from "@/lib/qr";

const percent = (part: number, whole: number) => (whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`);
const EMOJI = ["😕", "😐", "🙂", "😃", "🔥"];

// Cosa succede dopo la scansione del QR sui campioni: voti, prenotazioni del lancio, passaparola.
export default async function Campioni() {
  const db = await getDb();
  const [stats, waitlist, comments, settings] = await Promise.all([provaStats(db), listWaitlist(db), listComments(db), getSettings(db)]);
  const price = Number(settings.prezzo.replace(",", ".")) || 20;
  const maxRating = Math.max(1, ...stats.ratings);

  return (
    <>
      <h1>Campioni</h1>
      <p className="lead">
        Chi scansiona il QR sulle bustine, che voto dà e chi prenota il lancio.{" "}
        <a href="/tipflow?da=p1" target="_blank">Apri la pagina</a>
      </p>

      <div className="tiles">
        <div className="tile">
          <div className="label">Scansioni</div>
          <div className="value">{number(stats.scans)}</div>
          <div className="hint">{plural(stats.people, "persona diversa", "persone diverse")}</div>
        </div>
        <div className="tile">
          <div className="label">Voto medio</div>
          <div className="value">{stats.average == null ? "–" : stats.average.toFixed(1).replace(".", ",")}</div>
          <div className="hint">su 5 · {plural(stats.votes, "voto", "voti")}</div>
        </div>
        <div className="tile">
          <div className="label">Prenotati</div>
          <div className="value">{number(stats.booked)}</div>
          <div className="hint">{plural(stats.bags, "busta", "buste")} · circa {number(stats.bags * price)} €</div>
        </div>
        <div className="tile">
          <div className="label">Indice di apprezzamento</div>
          <div className="value">{percent(stats.booked, stats.people)}</div>
          <div className="hint">di chi scansiona, quanti prenotano</div>
        </div>
        <div className="tile">
          <div className="label">Passaparola</div>
          <div className="value">{number(stats.shares)}</div>
          <div className="hint">condivisioni · {plural(stats.fromFriends, "arrivato", "arrivati")} da un amico</div>
        </div>
      </div>

      <h2>Voti</h2>
      {stats.votes === 0 ? (
        <div className="empty">Ancora nessun voto.</div>
      ) : (
        <div className="card">
          {[5, 4, 3, 2, 1].map((r) => (
            <div key={r} className="bar-row">
              <span className="bar-emoji">{EMOJI[r - 1]}</span>
              <div className="bar"><div style={{ width: `${(stats.ratings[r - 1] / maxRating) * 100}%` }} /></div>
              <span className="bar-n">{stats.ratings[r - 1]}</span>
            </div>
          ))}
        </div>
      )}

      <h2>Cosa dicono</h2>
      {comments.length === 0 ? (
        <div className="empty">Ancora nessun commento.</div>
      ) : (
        comments.map((c, i) => (
          <div key={i} className="card">
            <div>{EMOJI[c.rating - 1]} {c.comment}</div>
            <div className="meta">{when(c.updated_at)}{c.lang === "en" ? " · in inglese" : ""}</div>
          </div>
        ))
      )}

      <h2>Lista d&apos;attesa</h2>
      <p className="meta">Nessuno ha pagato: sono prenotazioni, non ordini. Quando apri le vendite, scrivi a loro per primi.</p>
      {waitlist.length === 0 ? (
        <div className="empty">Ancora nessuna prenotazione.</div>
      ) : (
        <div className="scroll card">
          <table>
            <thead>
              <tr><th>Nome</th><th>Contatto</th><th className="num">Buste</th><th>Quando</th></tr>
            </thead>
            <tbody>
              {waitlist.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}{w.lang === "en" ? " (EN)" : ""}{w.code === "amico" ? " · da un amico" : ""}</td>
                  <td><a href={contactHref(w)} target="_blank" rel="noopener">{w.contact_kind === "email" ? w.contact : `+${w.contact}`}</a></td>
                  <td className="num">{w.bags}</td>
                  <td>{when(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
