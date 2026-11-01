import { headers } from "next/headers";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import { number } from "@/lib/format";
import { dailyStats, getSettings, linkTarget, qrStats, totalStats } from "@/lib/qr";
import { addQr, savePage } from "./actions";

// L'indirizzo dentro i QR: il dominio di Tipflow (JARVIS_PUBLIC_URL), oppure quello da cui si apre il pannello.
async function publicBase(): Promise<string> {
  const fromEnv = process.env.JARVIS_PUBLIC_URL?.replace(/\/+$/, "");
  if (fromEnv) return /^https?:\/\//.test(fromEnv) ? fromEnv : `https://${fromEnv}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const percent = (part: number, whole: number) => (whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`);

export default async function TestQr({ searchParams }: { searchParams: Promise<{ salvato?: string; errore?: string }> }) {
  const { salvato, errore } = await searchParams;
  const db = await getDb();
  const [settings, codes, totals, days] = await Promise.all([getSettings(db), qrStats(db), totalStats(db), dailyStats(db)]);
  const base = await publicBase();
  const provisional = !process.env.JARVIS_PUBLIC_URL;
  const images = await Promise.all(
    codes.map(async (c) => {
      const url = `${base}/q/${c.code}`;
      // PNG grande per la stampa, con margine bianco.
      const png = await QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: "M" });
      const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
      return { url, png, svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
    }),
  );

  return (
    <>
      <h1>Test QR</h1>
      <p className="lead">Chi scansiona il QR sui pacchi, quanti ti scrivono, e la pagina dove arrivano.</p>

      {salvato && <div className="notice">Pagina salvata. È già online.</div>}
      {errore && <div className="notice bad">Codice non valido o già usato: solo lettere minuscole, numeri e trattini.</div>}

      <div className="tiles">
        <div className="tile">
          <div className="label">Scansioni</div>
          <div className="value">{number(totals.scans)}</div>
          <div className="hint">volte che il QR è stato aperto</div>
        </div>
        <div className="tile">
          <div className="label">Persone diverse</div>
          <div className="value">{number(totals.people)}</div>
          <div className="hint">telefoni diversi che hanno scansionato</div>
        </div>
        <div className="tile">
          <div className="label">Ti hanno scritto</div>
          <div className="value">{number(totals.whatsapp)}</div>
          <div className="hint">persone che hanno toccato WhatsApp</div>
        </div>
        <div className="tile">
          <div className="label">Indice di apprezzamento</div>
          <div className="value">{percent(totals.whatsapp, totals.people)}</div>
          <div className="hint">di chi scansiona, quanti vogliono ordinare</div>
        </div>
      </div>

      <h2>I tuoi QR</h2>
      {provisional && (
        <div className="notice bad">
          Prima di stampare: questi QR usano l&apos;indirizzo provvisorio <b>{base}</b>. Quando hai il dominio, impostalo
          su Vercel nella variabile JARVIS_PUBLIC_URL e i QR qui si aggiornano.
        </div>
      )}
      <div className="grid">
        {codes.map((c, i) => (
          <div key={c.code} className="card">
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[i].svg} alt={`QR ${c.label}`} className="qr-img" />
              <div>
                <h3>{c.label}</h3>
                <div className="meta">{images[i].url}</div>
                <div className="meta" style={{ marginTop: 8 }}>
                  {number(c.scans)} scansioni · {number(c.people)} persone · {number(c.whatsapp)} WhatsApp ·{" "}
                  {number(c.instagram)} Instagram · {number(c.sito)} sito
                </div>
                <div className="actions">
                  <a className="btn primary" href={images[i].png} download={`tipflow-qr-${c.code}.png`}>Scarica PNG</a>
                  <a className="btn" href={images[i].svg} download={`tipflow-qr-${c.code}.svg`}>SVG per la tipografia</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <details>
        <summary>Aggiungi un QR per un altro lotto di pacchi</summary>
        <form action={addQr} className="card form-grid" style={{ marginTop: 12 }}>
          <label>
            Codice (finisce nel QR, corto)
            <input className="field" name="code" placeholder="p2" pattern="[a-z0-9\-]{1,20}" required />
          </label>
          <label>
            Nome per te
            <input className="field" name="label" placeholder="Pacchi del negozio di Marco" required />
          </label>
          <div className="actions">
            <button className="btn">Crea QR</button>
          </div>
        </form>
      </details>

      <h2>Ultimi 14 giorni</h2>
      {days.length === 0 ? (
        <div className="empty">Ancora nessuna scansione.</div>
      ) : (
        <div className="scroll card">
          <table>
            <thead>
              <tr><th>Giorno</th><th className="num">Scansioni</th><th className="num">Persone</th><th className="num">WhatsApp</th></tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td>{new Date(`${d.day}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="num">{number(d.scans)}</td>
                  <td className="num">{number(d.people)}</td>
                  <td className="num">{number(d.whatsapp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>La pagina dove porta il QR</h2>
      <p className="meta">
        Cambiala quando vuoi: il QR stampato resta lo stesso. I pulsanti senza link non compaiono.{" "}
        <a href="/tipflow" target="_blank">Apri la pagina</a>
      </p>
      <form action={savePage} className="card form-grid">
        <label>
          Titolo
          <input className="field" name="titolo" defaultValue={settings.titolo} required />
        </label>
        <label>
          Numero WhatsApp
          <input className="field" name="whatsapp" defaultValue={settings.whatsapp} placeholder="+39 333 1234567" inputMode="tel" />
        </label>
        <label>
          Testo
          <textarea name="testo" defaultValue={settings.testo} />
        </label>
        <label>
          Messaggio già scritto su WhatsApp
          <textarea name="messaggio_whatsapp" defaultValue={settings.messaggio_whatsapp} />
        </label>
        <label>
          Instagram
          <input className="field" name="instagram" defaultValue={settings.instagram} placeholder="@tipflow" />
        </label>
        <label>
          Sito
          <input className="field" name="sito" defaultValue={settings.sito} placeholder="tipflow.shop" />
        </label>
        <div className="actions">
          <button className="btn primary">Salva la pagina</button>
          {!linkTarget("whatsapp", settings) && <span className="working">Manca il numero WhatsApp: senza, la pagina non ha il pulsante per ordinare.</span>}
        </div>
      </form>
    </>
  );
}
