import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSettings, linkTarget } from "@/lib/qr";

export type Lang = "it" | "en";

// Il sito vetrina di Tipflow: si ordina su WhatsApp. Numero, prezzo e pezzi arrivano da Jarvis (Test QR).
const T = {
  it: {
    other: { href: "/en", label: "EN" },
    kicker: "Filtri a carbone attivo",
    title: "Better tip.\nBetter flow.",
    lead: "Il filtro a carbone attivo con bocchino ergonomico integrato. Un tiro più morbido e una presa comoda, in ogni rollata.",
    order: "Ordina su WhatsApp",
    discover: "Scopri il filtro",
    soon: "Ordini su WhatsApp in arrivo",
    structTitle: "Quattro parti, un solo filtro",
    struct: [
      ["Bocchino ergonomico", "Presa comoda e sicura, direttamente sulle labbra."],
      ["Tappo in fibra", "Trattiene i granuli di carbone dentro il filtro."],
      ["Carbone attivo di cocco", "Per un tiro più morbido e più fresco."],
      ["Tappo in ceramica", "Mantiene il flusso d'aria regolare."],
    ],
    specs: [["6 mm", "diametro"], ["39 mm", "lunghezza"], ["Monouso", "un filtro, una rollata"]],
    howTitle: "Come si usa",
    how: [
      ["Prendi un filtro", "Il bocchino è già integrato: non serve altro."],
      ["Inseriscilo nella rollata", "Il lato con il tappo in ceramica va verso il tabacco."],
      ["Usalo una volta", "A fine rollata si butta: il prossimo è sempre nuovo."],
    ],
    priceTitle: "Un solo formato",
    pack: (n: string) => `Busta da ${n} filtri`,
    each: (v: string) => `${v} € a filtro`,
    ship: "Spedizione in tutta Italia: chiedici il costo su WhatsApp.",
    faqTitle: "Domande frequenti",
    faq: [
      ["Come ordino?", "Scrivici su WhatsApp con il pulsante qui sopra: ti rispondiamo noi con il totale e i tempi di consegna."],
      ["Vanno bene per le mie cartine?", "Il filtro misura 6 mm di diametro e 39 mm di lunghezza: una misura slim. Se hai dubbi sulle tue cartine, scrivici."],
      ["Si possono riutilizzare?", "No, sono monouso. Il carbone lavora al meglio una volta sola."],
      ["Rendono il fumo sicuro?", "No. Nessun filtro rende sicuro il fumo: fumare nuoce gravemente alla salute. Tipflow rende il tiro più morbido, non più sano."],
    ],
    adults: "Prodotto riservato ai maggiorenni (18+). Fumare nuoce gravemente alla salute.",
    contact: "Contatti",
  },
  en: {
    other: { href: "/", label: "IT" },
    kicker: "Activated carbon filters",
    title: "Better tip.\nBetter flow.",
    lead: "The activated carbon filter with a built-in ergonomic tip. A smoother draw and a comfortable grip, every roll.",
    order: "Order on WhatsApp",
    discover: "Discover the filter",
    soon: "WhatsApp orders coming soon",
    structTitle: "Four parts, one filter",
    struct: [
      ["Ergonomic tip", "Comfortable, secure grip right on your lips."],
      ["Fiber cap", "Keeps the carbon granules inside the filter."],
      ["Coconut activated carbon", "For a smoother, fresher draw."],
      ["Ceramic end cap", "Keeps the airflow even."],
    ],
    specs: [["6 mm", "diameter"], ["39 mm", "length"], ["Single use", "one filter, one roll"]],
    howTitle: "How to use",
    how: [
      ["Take a filter", "The tip is already built in: nothing else needed."],
      ["Put it in your roll", "The ceramic end goes towards the tobacco."],
      ["Use it once", "Throw it away after the roll: the next one is always fresh."],
    ],
    priceTitle: "One size",
    pack: (n: string) => `Pouch of ${n} filters`,
    each: (v: string) => `€${v} per filter`,
    ship: "Shipping across Italy: ask us for the cost on WhatsApp.",
    faqTitle: "FAQ",
    faq: [
      ["How do I order?", "Message us on WhatsApp with the button above: we reply with the total and delivery time."],
      ["Do they fit my papers?", "The filter is 6 mm wide and 39 mm long: a slim size. Not sure about your papers? Message us."],
      ["Can I reuse them?", "No, they are single use. The carbon works best once."],
      ["Do they make smoking safe?", "No. No filter makes smoking safe: smoking seriously harms your health. Tipflow makes the draw smoother, not healthier."],
    ],
    adults: "Adults only (18+). Smoking seriously harms your health.",
    contact: "Contact",
  },
} as const;

const euro = (value: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export async function Sito({ lang }: { lang: Lang }) {
  const t = T[lang];
  const settings = await getSettings(await getDb());
  const hasWhatsapp = Boolean(linkTarget("whatsapp", settings));
  const instagram = linkTarget("instagram", settings);
  const price = Number(settings.prezzo.replace(",", ".")) || 20;
  const pieces = Number(settings.pezzi) || 100;

  const order = hasWhatsapp ? (
    <a href="/vai/whatsapp?da=sito" className="s-btn s-primary">{t.order}</a>
  ) : (
    <span className="s-btn s-disabled">{t.soon}</span>
  );

  return (
    <div className="s">
      <header className="s-top">
        <Image src="/logo.png" alt="Tipflow" width={132} height={44} priority />
        <nav>
          {hasWhatsapp && <a href="/vai/whatsapp?da=sito">WhatsApp</a>}
          <Link href={t.other.href} className="s-lang">{t.other.label}</Link>
        </nav>
      </header>

      <section className="s-hero">
        <div className="s-hero-text">
          <p className="s-kicker">{t.kicker}</p>
          <h1>{t.title}</h1>
          <p className="s-lead">{t.lead}</p>
          <div className="s-ctas">
            {order}
            <a href="#filtro" className="s-btn">{t.discover}</a>
          </div>
        </div>
        <div className="s-hero-img">
          <Image src="/sito/filtro.jpg" alt="Filtro Tipflow" width={390} height={175} priority />
        </div>
      </section>

      <section id="filtro" className="s-section">
        <h2>{t.structTitle}</h2>
        <div className="s-struct">
          <svg viewBox="0 0 60 200" className="s-diagram" aria-hidden="true">
            <rect x="19" y="0" width="22" height="46" rx="5" fill="#cfc6b3" />
            <rect x="11" y="40" width="38" height="18" rx="4" fill="#d6cdb9" />
            <rect x="9" y="54" width="42" height="18" fill="#e4dccb" />
            <rect x="9" y="72" width="42" height="96" fill="#1d1d1f" stroke="#cfc6b3" strokeWidth="2" />
            {[[19, 84], [33, 92], [43, 82], [23, 104], [39, 110], [17, 124], [31, 128], [45, 136], [23, 146], [37, 156]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" fill="#8d8c87" />
            ))}
            <rect x="9" y="168" width="42" height="22" rx="2" fill="#b9bcc0" />
          </svg>
          <ol className="s-parts">
            {t.struct.map(([name, text]) => (
              <li key={name}><b>{name}</b><span>{text}</span></li>
            ))}
          </ol>
        </div>
        <div className="s-specs">
          {t.specs.map(([value, label]) => (
            <div key={label}><b>{value}</b><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section className="s-section">
        <h2>{t.howTitle}</h2>
        <div className="s-steps">
          {t.how.map(([title, text], i) => (
            <div key={title} className="s-step"><span className="s-num">{i + 1}</span><b>{title}</b><p>{text}</p></div>
          ))}
        </div>
      </section>

      <section className="s-section">
        <h2>{t.priceTitle}</h2>
        <div className="s-price">
          <div>
            <p className="s-pack">{t.pack(String(pieces))}</p>
            <p className="s-amount">{lang === "it" ? `${euro(price, lang)} €` : `€${euro(price, lang)}`}</p>
            <p className="s-each">{t.each(euro(price / pieces, lang))}</p>
            <p className="s-ship">{t.ship}</p>
          </div>
          {order}
        </div>
      </section>

      <section className="s-section">
        <h2>{t.faqTitle}</h2>
        {t.faq.map(([q, a]) => (
          <details key={q} className="s-faq"><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>

      <footer className="s-foot">
        <p className="s-adults">{t.adults}</p>
        <p>
          {t.contact}: {hasWhatsapp && <><a href="/vai/whatsapp?da=sito">WhatsApp</a> · </>}
          {instagram && <><a href="/vai/instagram?da=sito">Instagram</a> · </>}
          tipflowfilters.com
        </p>
        <p className="s-copy">© {new Date().getFullYear()} Tipflow</p>
      </footer>
    </div>
  );
}
