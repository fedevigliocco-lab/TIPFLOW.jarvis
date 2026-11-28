"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatPrice, type Currency } from "@/lib/valuta";
import { PrenotaForm } from "./PrenotaForm";

type Lang = "it" | "en";

const SPIN_SRC = "/prova/filtro-gira.webp";

// La pagina di chi ha scansionato il QR sui campioni. Testi in italiano e inglese, cambio lingua al volo.
const T = {
  it: {
    gateTitle: "Solo maggiorenni",
    gateText: "Tipflow è un prodotto per chi ha almeno 18 anni.",
    gateYes: "Ho 18 anni o più",
    gateNo: "No",
    gateBye: "Torna a trovarci quando avrai 18 anni.",
    kicker: "Filtri a carbone attivo",
    hook: ["L'hai provato.", "Ora sai."],
    friendHook: ["Un amico", "te l'ha passato."],
    lead: "Carbone attivo di cocco e bocchino integrato. Il tiro cambia: più pulito, più fresco, presa comoda.",
    friendLead: "Filtri a carbone attivo con bocchino integrato. Stanno per uscire: prenota il tuo posto.",
    voteTitle: "Com'era?",
    voteHint: "Un tocco, ci aiuta un sacco.",
    voteLabels: ["Non mi è piaciuto", "Così così", "Ok", "Mi è piaciuto", "Spacca"],
    voteThanks: "Grazie. Vuoi dirci di più?",
    commentPh: "Cosa ti è piaciuto, cosa cambieresti… (facoltativo)",
    commentSend: "Invia",
    commentDone: "Ricevuto. Leggiamo tutto, davvero.",
    moreTitle: "Vuoi saperne di più?",
    moreSite: "Sito web",
    moreWa: "WhatsApp · info e dettagli",
    moreIg: "Instagram",
    bookTitle: "Prenota il lancio",
    bookText: "Tipflow sta per uscire. Prenota adesso: non paghi niente, ti scriviamo noi su WhatsApp appena apriamo.",
    pack: (n: number, p: string) => `Busta da ${n} filtri · ${p}`,
    shareTitle: "Passalo a un amico",
    shareText: "Conosci qualcuno che rolla? Mandagli Tipflow: è un attimo.",
    shareWa: "Mandalo su WhatsApp",
    shareMore: "Altro",
    copied: "Link copiato",
    shareMsg: (url: string) => `Ti giro questi filtri: Tipflow, carbone attivo con bocchino integrato. Stanno per uscire, prenota qui 👉 ${url}`,
    questions: "Domande?",
    adults: "Solo maggiorenni (18+). Fumare nuoce gravemente alla salute.",
    noSale: "Per ora non vendiamo online: la prenotazione non è un ordine e non si paga niente.",
    privacy: "Usiamo nome e contatto solo per avvisarti del lancio. Per farli cancellare basta chiedercelo.",
  },
  en: {
    gateTitle: "Adults only",
    gateText: "Tipflow is for people aged 18 or over.",
    gateYes: "I'm 18 or over",
    gateNo: "No",
    gateBye: "Come back when you're 18.",
    kicker: "Activated carbon filters",
    hook: ["You tried it.", "Now you know."],
    friendHook: ["A friend", "passed it on."],
    lead: "Coconut activated carbon and a built-in tip. The draw changes: cleaner, cooler, easy grip.",
    friendLead: "Activated carbon filters with a built-in tip. Launching soon: save your spot.",
    voteTitle: "How was it?",
    voteHint: "One tap, it helps a lot.",
    voteLabels: ["Didn't like it", "Meh", "Okay", "Liked it", "Love it"],
    voteThanks: "Thanks. Want to tell us more?",
    commentPh: "What you liked, what you'd change… (optional)",
    commentSend: "Send",
    commentDone: "Got it. We read every word.",
    moreTitle: "Want to know more?",
    moreSite: "Website",
    moreWa: "WhatsApp · info and details",
    moreIg: "Instagram",
    bookTitle: "Book the launch",
    bookText: "Tipflow is launching soon. Book now: you pay nothing, we'll message you on WhatsApp as soon as we open.",
    pack: (n: number, p: string) => `Pouch of ${n} filters · ${p}`,
    shareTitle: "Pass it on",
    shareText: "Know someone who rolls? Send them Tipflow, it takes a second.",
    shareWa: "Send on WhatsApp",
    shareMore: "More",
    copied: "Link copied",
    shareMsg: (url: string) => `Check these filters: Tipflow, activated carbon with a built-in tip. Launching soon, book here 👉 ${url}`,
    questions: "Questions?",
    adults: "Adults only (18+). Smoking seriously harms your health.",
    noSale: "We don't sell online yet: booking is not an order and you pay nothing.",
    privacy: "We only use your name and contact to tell you about the launch. Just ask and we'll delete them.",
  },
} as const;

const EMOJI = ["😕", "😐", "🙂", "😃", "🔥"];
const ADULT_KEY = "tipflow18";

export interface ProvaProps {
  code: string | null;
  initialLang: Lang;
  fromFriend: boolean;
  shareUrl: string;
  hasWhatsapp: boolean;
  hasInstagram: boolean;
  price: number;
  currency: Currency;
  pieces: number;
}

function send(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/prova", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

export function Prova(props: ProvaProps) {
  const [lang, setLang] = useState<Lang>(props.initialLang);
  const [gate, setGate] = useState<"ask" | "ok" | "no">("ask");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const t = T[lang];
  const from = props.code ? `?da=${props.code}` : "";

  useEffect(() => {
    try {
      if (localStorage.getItem(ADULT_KEY) === "1") setGate("ok");
    } catch {}
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Il filtro fa un solo giro, quando la pagina si scopre (dopo il "18+"): prima carichiamo
  // l'animazione in silenzio, poi la mettiamo al posto della foto ferma e parte da capo.
  // Con "riduci movimento" attivo resta la foto ferma.
  // (Il file arriva come blob: un indirizzo nuovo fa ripartire l'animazione dal primo fotogramma.)
  const [spinUrl, setSpinUrl] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let url: string | null = null;
    fetch(SPIN_SRC)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => setSpinUrl((url = URL.createObjectURL(b))))
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);
  useEffect(() => {
    if (gate === "ok" && spinUrl) setSpin(true);
  }, [gate, spinUrl]);

  const confirmAdult = () => {
    try {
      localStorage.setItem(ADULT_KEY, "1");
    } catch {}
    setGate("ok");
  };

  const vote = (r: number) => {
    setRating(r);
    void send({ type: "voto", code: props.code, lang, rating: r });
  };

  const sendComment = () => {
    if (!rating || !comment.trim()) return;
    void send({ type: "voto", code: props.code, lang, rating, comment });
    setCommentSent(true);
  };

  const shareMsg = t.shareMsg(props.shareUrl);
  const shared = (channel: string) => void send({ type: "condividi", code: props.code, lang, channel });
  const shareMore = async () => {
    try {
      if (canShare) {
        await navigator.share({ title: "Tipflow", text: shareMsg });
        shared("sistema");
      } else {
        await navigator.clipboard.writeText(props.shareUrl);
        setCopied(true);
        shared("copia");
      }
    } catch {}
  };

  const priceText = formatPrice(props.price, props.currency, lang, false);
  const hook = props.fromFriend ? t.friendHook : t.hook;

  return (
    <div className="p">
      <div className="p-bg" aria-hidden="true" />
      <header className="p-top">
        <Image src="/logo.png" alt="Tipflow" width={120} height={40} priority />
        <button className="p-lang" onClick={() => setLang(lang === "it" ? "en" : "it")}>
          {lang === "it" ? "EN" : "IT"}
        </button>
      </header>

      <section className="p-hero">
        <p className="p-kicker">{t.kicker}</p>
        <h1>
          {hook[0]}
          <br />
          <span>{hook[1]}</span>
        </h1>
        <div className={spin ? "p-spin go" : "p-spin"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={spin && spinUrl ? spinUrl : "/prova/filtro.png"} alt="" width={880} height={147} className="p-filter" fetchPriority="high" />
        </div>
        <p className="p-lead">{props.fromFriend ? t.friendLead : t.lead}</p>
      </section>

      {!props.fromFriend && (
        <section className="p-card" id="voto">
          <h2>{t.voteTitle}</h2>
          <p className="p-hint">{t.voteHint}</p>
          <div className="p-vote" role="radiogroup" aria-label={t.voteTitle}>
            {EMOJI.map((emoji, i) => (
              <button
                key={emoji}
                role="radio"
                aria-checked={rating === i + 1}
                aria-label={t.voteLabels[i]}
                className={rating === i + 1 ? "on" : rating ? "off" : undefined}
                onClick={() => vote(i + 1)}
              >
                <span>{emoji}</span>
              </button>
            ))}
          </div>
          <p className="p-vote-label">{rating ? t.voteLabels[rating - 1] : " "}</p>
          {rating && !commentSent && (
            <div className="p-comment">
              <p>{t.voteThanks}</p>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.commentPh} maxLength={1000} rows={3} />
              <button className="p-btn" onClick={sendComment} disabled={!comment.trim()}>{t.commentSend}</button>
            </div>
          )}
          {commentSent && <p className="p-ok">{t.commentDone}</p>}
          {rating && (
            <div className="p-more">
              <p>{t.moreTitle}</p>
              <a className="p-btn" href={`/vai/sito${from}`}>{t.moreSite}</a>
              {props.hasWhatsapp && <a className="p-btn p-wa" href={`/vai/whatsapp${from}`}>{t.moreWa}</a>}
              {props.hasInstagram && <a className="p-btn" href={`/vai/instagram${from}`}>{t.moreIg}</a>}
            </div>
          )}
        </section>
      )}

      <section className="p-card p-book" id="prenota">
        <PrenotaForm lang={lang} code={props.code}>
          <h2>{t.bookTitle}</h2>
          <p className="p-hint">{t.bookText}</p>
          <p className="p-pack">{t.pack(props.pieces, priceText)}</p>
        </PrenotaForm>
      </section>

      <section className="p-card">
        <h2>{t.shareTitle}</h2>
        <p className="p-hint">{t.shareText}</p>
        <div className="p-share">
          <a
            className="p-btn p-wa"
            href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`}
            target="_blank"
            rel="noopener"
            onClick={() => shared("whatsapp")}
          >
            {t.shareWa}
          </a>
          <button className="p-btn" onClick={shareMore}>{copied ? t.copied : t.shareMore}</button>
        </div>
      </section>

      <footer className="p-foot">
        {(props.hasWhatsapp || props.hasInstagram) && (
          <p>
            {t.questions} {props.hasWhatsapp && <a href={`/vai/whatsapp${from}`}>WhatsApp</a>}
            {props.hasWhatsapp && props.hasInstagram && " · "}
            {props.hasInstagram && <a href={`/vai/instagram${from}`}>Instagram</a>}
          </p>
        )}
        <p className="p-adults">{t.adults}</p>
        <p>{t.noSale}</p>
        <p>{t.privacy}</p>
        <p>© {new Date().getFullYear()} Tipflow · tipflowfilters.com</p>
      </footer>

      {gate !== "ok" && (
        <div className="p-gate" role="dialog" aria-modal="true" aria-labelledby="p-gate-title">
          <div>
            <Image src="/logo.png" alt="Tipflow" width={180} height={59} priority />
            <h2 id="p-gate-title">{t.gateTitle}</h2>
            {gate === "ask" ? (
              <>
                <p>{t.gateText}</p>
                <button className="p-btn p-primary" onClick={confirmAdult}>{t.gateYes}</button>
                <button className="p-btn p-ghost" onClick={() => setGate("no")}>{t.gateNo}</button>
              </>
            ) : (
              <p>{t.gateBye}</p>
            )}
            <button className="p-lang p-gate-lang" onClick={() => setLang(lang === "it" ? "en" : "it")}>
              {lang === "it" ? "English" : "Italiano"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
