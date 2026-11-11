import Link from "next/link";
import { RunButton } from "@/components/RunButton";
import {
  getAssistenzaSettings,
  getConversation,
  getMessages,
  listConversations,
  listOrders,
  PROVA_PHONE,
  type ChatMessage,
} from "@/lib/clienti";
import { getDb } from "@/lib/db";
import { euro, when } from "@/lib/format";
import { whatsappConfigured } from "@/lib/whatsapp";
import { replyAsFede, restartProva, saveAgentFacts, setHandover, tryAgent } from "./actions";

// La chat di prova aspetta la risposta dell'agente.
export const maxDuration = 120;

const AUTHOR: Record<ChatMessage["author"], string> = { cliente: "Cliente", agente: "Agente", fede: "Tu" };

function Chat({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) return <div className="empty">Ancora nessun messaggio.</div>;
  return (
    <div className="chat">
      {messages.map((m) => (
        <div key={m.id} className={`bubble ${m.author}`}>
          <div className="bubble-who">{AUTHOR[m.author]} · {when(m.created_at)}</div>
          {m.text}
        </div>
      ))}
    </div>
  );
}

export default async function Clienti({
  searchParams,
}: {
  searchParams: Promise<{ tel?: string; salvato?: string; errore?: string }>;
}) {
  const { tel, salvato, errore } = await searchParams;
  const db = await getDb();
  const [conversations, orders, prova, facts] = await Promise.all([
    listConversations(db),
    listOrders(db),
    getMessages(db, PROVA_PHONE),
    getAssistenzaSettings(db),
  ]);
  const selected = tel && tel !== PROVA_PHONE ? await getConversation(db, tel) : null;
  const selectedMessages = selected ? await getMessages(db, selected.phone, 200) : [];
  const connected = whatsappConfigured();

  return (
    <>
      <h1>Clienti</h1>
      <p className="lead">
        L&apos;agente Assistenza risponde da solo a ogni messaggio su WhatsApp, prende gli ordini e ti chiama solo quando
        serve. Qui vedi tutto e puoi intervenire.
      </p>

      {!connected && (
        <div className="notice">
          WhatsApp non è ancora collegato: l&apos;agente lo puoi già provare qui sotto. Quando hai il numero, segui i
          passi nel README per collegarlo.
        </div>
      )}
      {errore && <div className="notice bad">{errore}</div>}

      {selected && (
        <section className="card" id="chat">
          <h3>{selected.name ?? "Cliente"} · +{selected.phone}</h3>
          <div className="meta">
            {selected.in_mano_a_fede ? "La conversazione è in mano tua: l'agente non risponde." : "Risponde l'agente."}
          </div>
          <Chat messages={selectedMessages} />
          <form action={replyAsFede}>
            <input type="hidden" name="phone" value={selected.phone} />
            <textarea name="text" placeholder="Scrivi tu al cliente (parte su WhatsApp, e da lì rispondi tu)" required />
            <div className="actions">
              <button className="btn primary">Manda</button>
            </div>
          </form>
          <form action={setHandover} className="actions">
            <input type="hidden" name="phone" value={selected.phone} />
            {selected.in_mano_a_fede ? (
              <button className="btn" name="a" value="agente">Ridai la conversazione all&apos;agente</button>
            ) : (
              <button className="btn" name="a" value="fede">Rispondo io: ferma l&apos;agente</button>
            )}
            <Link className="btn" href="/clienti">Chiudi</Link>
          </form>
        </section>
      )}

      <h2>Conversazioni</h2>
      {conversations.length === 0 ? (
        <div className="empty">Nessun cliente ha ancora scritto.</div>
      ) : (
        <div className="grid">
          {conversations.map((c) => (
            <Link key={c.phone} href={`/clienti?tel=${c.phone}#chat`} className="card conv">
              <h3>{c.name ?? `+${c.phone}`}</h3>
              <div className="meta">
                {c.serve_fede && <span className="pill da-decidere">serve te</span>}{" "}
                {c.in_mano_a_fede && <span className="pill">in mano tua</span>} {when(c.last_message_at)}
              </div>
              {c.last_text && (
                <p className="meta">
                  {c.last_author ? `${AUTHOR[c.last_author]}: ` : ""}
                  {c.last_text.length > 120 ? `${c.last_text.slice(0, 120)}…` : c.last_text}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <h2>Ordini</h2>
      {orders.length === 0 ? (
        <div className="empty">Ancora nessun ordine.</div>
      ) : (
        <div className="scroll card">
          <table>
            <thead>
              <tr><th>#</th><th>Quando</th><th>Cliente</th><th className="num">Buste</th><th className="num">Totale</th><th>Stato</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{when(o.created_at)}</td>
                  <td><Link href={`/clienti?tel=${o.phone}#chat`}>{o.name}</Link><div className="meta">{o.address}</div></td>
                  <td className="num">{o.bags}</td>
                  <td className="num">{euro(o.total_cents)}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 id="prova">Prova l&apos;agente</h2>
      <p className="meta">
        Scrivi come se fossi un cliente. L&apos;agente risponde qui e niente parte su WhatsApp; gli ordini di prova non
        toccano il magazzino.
      </p>
      <section className="card">
        <Chat messages={prova} />
        <form action={tryAgent}>
          <textarea name="text" placeholder="Ciao, quanto costano i filtri? Spedite a Roma?" required />
          <div className="actions">
            <RunButton label="Manda" hint="L'agente sta scrivendo…" />
          </div>
        </form>
        {prova.length > 0 && (
          <form action={restartProva} className="actions">
            <button className="btn">Ricomincia la prova</button>
          </form>
        )}
      </section>

      <h2 id="sa">Cosa sa l&apos;agente</h2>
      <p className="meta">
        Prodotto, prezzo ({euro(Math.round(Number(facts.prezzo.replace(",", ".")) * 100) || 2000)} per {facts.pezzi} filtri)
        e magazzino li sa già. Qui gli dici quello che manca: finché è vuoto, su quel punto chiama te.
      </p>
      {salvato && <div className="notice">Salvato: l&apos;agente lo usa dal prossimo messaggio.</div>}
      <form action={saveAgentFacts} className="card form-grid">
        <label>
          Spedizione: costo e tempi
          <textarea name="spedizione" defaultValue={facts.spedizione} placeholder="Piego di libri tracciato 4,90 €, gratis da 3 buste. Arriva in 3-5 giorni lavorativi." />
        </label>
        <label>
          Come si paga
          <textarea name="pagamento" defaultValue={facts.pagamento} placeholder="PayPal amici a ... oppure bonifico a IBAN ..., causale numero ordine. Spedisco appena arriva il pagamento." />
        </label>
        <label>
          Altre istruzioni per l&apos;agente
          <textarea name="istruzioni_assistenza" defaultValue={facts.istruzioni_assistenza} placeholder="Es. ritiro a mano a Milano zona ..., niente spedizioni all'estero per ora." />
        </label>
        <div className="actions">
          <button className="btn primary">Salva</button>
        </div>
      </form>
    </>
  );
}
