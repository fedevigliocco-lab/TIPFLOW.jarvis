import { passwordConfigured } from "@/lib/auth";
import { login } from "./actions";

export default async function Accesso({ searchParams }: { searchParams: Promise<{ errore?: string; da?: string }> }) {
  const { errore, da } = await searchParams;

  if (!passwordConfigured()) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
        <h1>Pannello chiuso</h1>
        <p className="meta">Manca la password: impostala nella variabile JARVIS_PASSWORD e ripubblica.</p>
      </div>
    );
  }

  return (
    <form action={login} className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Accesso</h1>
      <p className="meta">Il pannello di Tipflow è privato.</p>
      {errore && <div className="notice bad">Password sbagliata.</div>}
      <input type="hidden" name="da" value={da ?? "/"} />
      <input className="field" type="password" name="password" placeholder="Password" autoComplete="current-password" required autoFocus />
      <div className="actions">
        <button className="btn primary">Entra</button>
      </div>
    </form>
  );
}
