import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSettings, linkTarget } from "@/lib/qr";
import { bagPrice, formatPrice, type Currency } from "@/lib/valuta";
import { AgeGate } from "./AgeGate";
import { PrenotaForm } from "./PrenotaForm";

export type Lang = "it" | "en";

// Il sito vetrina di Tipflow. L'ordine dei blocchi: apertura, il brand, i consigli d'uso, il filtro,
// come lavoriamo (i passi per averlo) e la prenotazione del lancio. Prezzo e pezzi arrivano da Jarvis (Test QR).
// Per ora non si vende online: si prenota, poi scriviamo noi su WhatsApp.
const T = {
  it: {
    other: { href: "/en", label: "EN" },
    kicker: "Filtri a carbone attivo",
    title: "Better tip.\nBetter flow.",
    lead: "Il filtro a carbone attivo con bocchino integrato. Filtra e rinfresca ogni tiro, con una presa comoda in ogni rollata.",
    book: "Prenota il lancio",
    discover: "Scopri Tipflow",
    brandKicker: "Il brand",
    brandTitle: "Street nell'anima.\nPreciso nel tiro.",
    brandText:
      "Tipflow nasce a Milano, da gente che rolla. Volevamo un filtro che facesse bene il suo lavoro e avesse uno stile tutto suo: carbone attivo di cocco, bocchino già integrato e il nostro tag stampato sul filtro. Un solo prodotto, fatto bene.",
    pillars: [
      ["Un solo prodotto", "Facciamo una cosa e ci mettiamo tutta l'attenzione."],
      ["Dritto da noi", "Niente intermediari: parli con chi i filtri li ha scelti e provati."],
      ["Tag, non etichetta", "Il logo graffiti sul filtro è la nostra firma."],
    ],
    tipsKicker: "Consigli d'uso",
    tipsTitle: "Come rende al meglio",
    rollLabel: "Arrotola fin qui",
    rollTip: "Bocchino",
    rollMix: "Miscela",
    tips: [
      [
        "Arrotola fino all'inizio del bocchino",
        "Appoggia il filtro sul bordo della cartina e arrotola fino a dove finisce il tubo color kraft e inizia il bocchino chiaro. Il bocchino resta fuori: lo prendi direttamente tra le labbra.",
      ],
      ["Lato giusto verso la miscela", "Il tappo in ceramica va dentro, verso la miscela. Il bocchino verso di te."],
      [
        "Meglio una miscela fine e compatta",
        "Il filtro dà il meglio con miscele sminuzzate fini e ben compatte: il tiraggio resta regolare e il carbone lavora su tutta la lunghezza. Con trinciati grossolani, voluminosi o umidi il tiro si appesantisce e il filtro si satura prima.",
      ],
      ["Uno per rollata", "È monouso: il carbone lavora al meglio una volta sola. Il prossimo è sempre nuovo."],
    ],
    structTitle: "Dentro il filtro",
    struct: [
      ["Bocchino ergonomico", "Presa comoda e sicura, direttamente sulle labbra."],
      ["Tappo in fibra", "Trattiene i granuli di carbone dentro il filtro."],
      ["Carbone attivo di cocco", "Filtra e rinfresca ogni tiro."],
      ["Tappo in ceramica", "Mantiene il flusso d'aria regolare."],
    ],
    specs: [["6 mm", "diametro"], ["39 mm", "lunghezza"], ["Monouso", "un filtro, una rollata"]],
    wayKicker: "Come lavoriamo",
    wayTitle: "Piccoli lotti.\nVendita diretta.",
    wayText:
      "Niente scaffali, niente magazzini di terzi, niente pubblicità che paghi tu nel prezzo. Facciamo piccoli lotti e li diamo direttamente a chi li usa: per questo il prezzo resta onesto e dall'altra parte trovi sempre una persona vera.",
    stepsTitle: "Per averli segui tre passi",
    steps: [
      ["Prenota il lancio", "Lasci nome e WhatsApp qui sotto. Non paghi niente e non è un ordine."],
      ["Ti scriviamo noi", "Appena apriamo, chi ha prenotato è il primo a saperlo, su WhatsApp."],
      ["Li ricevi", "A Milano te li portiamo a mano, gratis. Nel resto d'Italia spediamo noi: costo e tempi te li diciamo in chat."],
    ],
    stepsCh: [
      ["Prenota il lancio", "Lasci nome e WhatsApp qui sotto. Non paghi niente e non è un ordine."],
      ["Ti scriviamo noi", "Appena apriamo, chi ha prenotato è il primo a saperlo, su WhatsApp."],
      ["Li ricevi", "In Svizzera ci accordiamo in chat su spedizione e tempi."],
    ],
    pack: (n: string, p: string) => `Busta da ${n} filtri · ${p}`,
    each: (v: string) => `${v} a filtro`,
    bookText: "Tipflow sta per uscire. Prenota adesso: ti scriviamo noi appena apriamo.",
    faqTitle: "Domande frequenti",
    faq: [
      ["Come ordino?", "Per ora prenoti il lancio con il modulo qui sopra: non paghi niente. Appena apriamo ti scriviamo su WhatsApp con il totale e i tempi di consegna."],
      ["Vanno bene per le mie cartine?", "Il filtro misura 6 mm di diametro e 39 mm di lunghezza: una misura slim. Se hai dubbi sulle tue cartine, scrivici."],
      ["Si possono riutilizzare?", "No, sono monouso. Il carbone lavora al meglio una volta sola."],
      ["Rendono il fumo sicuro?", "No. Nessun filtro rende sicuro il fumo: fumare nuoce gravemente alla salute. Tipflow filtra e rinfresca il tiro, non lo rende più sano."],
    ],
    adults: "Prodotto riservato ai maggiorenni (18+). Fumare nuoce gravemente alla salute.",
    noSale: "Per ora non vendiamo online: la prenotazione non è un ordine e non si paga niente.",
    privacy: "Usiamo nome e contatto solo per avvisarti del lancio. Per farli cancellare basta chiedercelo.",
    contact: "Contatti",
  },
  en: {
    other: { href: "/", label: "IT" },
    kicker: "Activated carbon filters",
    title: "Better tip.\nBetter flow.",
    lead: "The activated carbon filter with a built-in tip. Filters and cools every draw, with a comfortable grip in every roll.",
    book: "Book the launch",
    discover: "Discover Tipflow",
    brandKicker: "The brand",
    brandTitle: "Street at heart.\nPrecise on the draw.",
    brandText:
      "Tipflow was born in Milan, made by people who roll. We wanted a filter that does its job well and has a style of its own: coconut activated carbon, a built-in tip and our tag printed on the filter. One product, done right.",
    pillars: [
      ["One product", "We do one thing and give it all our attention."],
      ["Straight from us", "No middlemen: you talk to the people who chose and tested the filters."],
      ["A tag, not a label", "The graffiti logo on the filter is our signature."],
    ],
    tipsKicker: "How to use",
    tipsTitle: "Get the best out of it",
    rollLabel: "Roll up to here",
    rollTip: "Tip",
    rollMix: "Blend",
    tips: [
      [
        "Roll up to where the tip begins",
        "Place the filter on the edge of the paper and roll up to where the kraft tube ends and the light tip begins. The tip stays out: it goes straight to your lips.",
      ],
      ["Right way round", "The ceramic end goes inside, towards the blend. The tip faces you."],
      [
        "Best with a fine, compact blend",
        "The filter works best with finely ground, well-packed blends: the draw stays even and the carbon works along its full length. With coarse, bulky or damp cuts the draw gets heavy and the filter saturates sooner.",
      ],
      ["One per roll", "Single use: the carbon works best once. The next one is always fresh."],
    ],
    structTitle: "Inside the filter",
    struct: [
      ["Ergonomic tip", "Comfortable, secure grip right on your lips."],
      ["Fiber cap", "Keeps the carbon granules inside the filter."],
      ["Coconut activated carbon", "Filters and cools every draw."],
      ["Ceramic end cap", "Keeps the airflow even."],
    ],
    specs: [["6 mm", "diameter"], ["39 mm", "length"], ["Single use", "one filter, one roll"]],
    wayKicker: "How we work",
    wayTitle: "Small batches.\nSold direct.",
    wayText:
      "No shelves, no third-party warehouses, no advertising baked into the price. We make small batches and hand them straight to the people who use them: that keeps the price honest, and there's always a real person on the other side.",
    stepsTitle: "Three steps to get them",
    steps: [
      ["Book the launch", "Leave your name and WhatsApp below. You pay nothing and it's not an order."],
      ["We message you", "As soon as we open, people who booked are the first to know, on WhatsApp."],
      ["Get them", "In Milan we hand-deliver for free. Elsewhere in Italy we ship: we'll tell you cost and timing in the chat."],
    ],
    stepsCh: [
      ["Book the launch", "Leave your name and WhatsApp below. You pay nothing and it's not an order."],
      ["We message you", "As soon as we open, people who booked are the first to know, on WhatsApp."],
      ["Get them", "In Switzerland we agree on shipping and timing in the chat."],
    ],
    pack: (n: string, p: string) => `Pouch of ${n} filters · ${p}`,
    each: (v: string) => `${v} per filter`,
    bookText: "Tipflow is launching soon. Book now: we'll message you as soon as we open.",
    faqTitle: "FAQ",
    faq: [
      ["How do I order?", "For now you book the launch with the form above: you pay nothing. As soon as we open we message you on WhatsApp with the total and delivery time."],
      ["Do they fit my papers?", "The filter is 6 mm wide and 39 mm long: a slim size. Not sure about your papers? Message us."],
      ["Can I reuse them?", "No, they are single use. The carbon works best once."],
      ["Do they make smoking safe?", "No. No filter makes smoking safe: smoking seriously harms your health. Tipflow filters and cools the draw, it doesn't make it healthier."],
    ],
    adults: "Adults only (18+). Smoking seriously harms your health.",
    noSale: "We don't sell online yet: booking is not an order and you pay nothing.",
    privacy: "We only use your name and contact to tell you about the launch. Just ask and we'll delete them.",
    contact: "Contact",
  },
} as const;

export async function Sito({ lang, currency }: { lang: Lang; currency: Currency }) {
  const t = T[lang];
  const settings = await getSettings(await getDb());
  const hasWhatsapp = Boolean(linkTarget("whatsapp", settings));
  const instagram = linkTarget("instagram", settings);
  const price = bagPrice(settings, currency);
  const pieces = Number(settings.pezzi) || 100;
  const steps = currency === "CHF" ? t.stepsCh : t.steps;

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
            <a href="#prenota" className="s-btn s-primary">{t.book}</a>
            <a href="#brand" className="s-btn">{t.discover}</a>
          </div>
        </div>
        <div className="s-hero-img">
          <Image src="/sito/filtro.jpg" alt="Filtro Tipflow" width={390} height={175} priority />
        </div>
      </section>

      {/* La "slide" del brand: tutto schermo, con il tag graffiti dietro. */}
      <section id="brand" className="s-brand">
        <div className="s-brand-bg" aria-hidden="true" />
        <p className="s-kicker">{t.brandKicker}</p>
        <Image src="/logo.png" alt="Tipflow" width={480} height={158} className="s-brand-logo" />
        <h2 className="s-big">{t.brandTitle}</h2>
        <p className="s-brand-text">{t.brandText}</p>
        <div className="s-pillars">
          {t.pillars.map(([title, text]) => (
            <div key={title}><b>{title}</b><span>{text}</span></div>
          ))}
        </div>
      </section>

      <section id="consigli" className="s-section">
        <p className="s-kicker">{t.tipsKicker}</p>
        <h2 className="s-big">{t.tipsTitle}</h2>
        {/* Dove arrotolare: la cartina copre il tubo kraft e si ferma dove inizia il bocchino (34% del filtro). */}
        <figure className="s-roll" aria-hidden="true">
          <span className="s-roll-mark"><span>{t.rollLabel}</span></span>
          <span className="s-roll-mix" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prova/filtro.png" alt="" width={934} height={156} className="s-roll-filter" />
          <span className="s-roll-paper" />
          <span className="s-roll-cap s-roll-cap-tip">{t.rollTip}</span>
          <span className="s-roll-cap s-roll-cap-mix">{t.rollMix}</span>
        </figure>
        <ol className="s-tips">
          {t.tips.map(([title, text], i) => (
            <li key={title}><span className="s-num">{i + 1}</span><div><b>{title}</b><p>{text}</p></div></li>
          ))}
        </ol>
      </section>

      <section id="filtro" className="s-section">
        <h2>{t.structTitle}</h2>
        <Image src="/sito/filtro-sezione.png" alt="" width={934} height={156} className="s-sezione" />
        <ol className="s-parts">
          {t.struct.map(([name, text]) => (
            <li key={name}><b>{name}</b><span>{text}</span></li>
          ))}
        </ol>
        <div className="s-specs">
          {t.specs.map(([value, label]) => (
            <div key={label}><b>{value}</b><span>{label}</span></div>
          ))}
        </div>
      </section>

      <section id="come" className="s-section">
        <p className="s-kicker">{t.wayKicker}</p>
        <h2 className="s-big">{t.wayTitle}</h2>
        <p className="s-brand-text">{t.wayText}</p>
        <h3 className="s-h3">{t.stepsTitle}</h3>
        <div className="s-steps">
          {steps.map(([title, text], i) => (
            <div key={title} className="s-step"><span className="s-num">{i + 1}</span><b>{title}</b><p>{text}</p></div>
          ))}
        </div>
      </section>

      <section id="prenota" className="s-section s-book-wrap">
        <div className="p-card p-book s-book">
          <PrenotaForm lang={lang} code={null}>
            <h2>{t.book}</h2>
            <p className="p-hint">{t.bookText}</p>
            <p className="p-pack">{t.pack(String(pieces), formatPrice(price, currency, lang, false))}</p>
            <p className="s-each">{t.each(formatPrice(price / pieces, currency, lang))}</p>
          </PrenotaForm>
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
        <p>{t.noSale}</p>
        <p>{t.privacy}</p>
        <p>
          {t.contact}: {hasWhatsapp && <><a href="/vai/whatsapp?da=sito">WhatsApp</a> · </>}
          {instagram && <><a href="/vai/instagram?da=sito">Instagram</a> · </>}
          tipflowfilters.com
        </p>
        <p className="s-copy">© {new Date().getFullYear()} Tipflow</p>
      </footer>

      <AgeGate lang={lang} />
    </div>
  );
}
