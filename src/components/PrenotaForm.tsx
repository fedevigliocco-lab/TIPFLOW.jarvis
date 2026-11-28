"use client";

import { useState } from "react";

type Lang = "it" | "en";

const T = {
  it: {
    name: "Nome",
    contact: "WhatsApp o email",
    contactPh: "333 123 4567 o nome@email.it",
    bags: "Quante buste vorresti?",
    adult: "Ho almeno 18 anni e potete scrivermi per il lancio.",
    book: "Prenota il mio posto",
    booking: "Un attimo…",
    badContact: "Scrivi un numero WhatsApp o un'email valida.",
    error: "Qualcosa non è andato. Riprova tra un attimo.",
    booked: (n: string) => `Sei dentro, ${n}.`,
    bookedText: "Ti scriviamo per primo appena apriamo. Niente spam, promesso.",
  },
  en: {
    name: "Name",
    contact: "WhatsApp or email",
    contactPh: "+39 333 123 4567 or name@email.com",
    bags: "How many pouches would you like?",
    adult: "I'm 18 or over and you can message me about the launch.",
    book: "Save my spot",
    booking: "One sec…",
    badContact: "Enter a valid WhatsApp number or email.",
    error: "Something went wrong. Try again in a moment.",
    booked: (n: string) => `You're in, ${n}.`,
    bookedText: "You'll hear from us first when we open. No spam, promise.",
  },
} as const;

const BAGS = [1, 2, 3, 5, 10];

// Il modulo "Prenota il lancio": nome, contatto, quante buste. Finisce in Jarvis > Campioni.
// Lo usano la pagina del QR e il sito. Le intestazioni (titolo, prezzo) le mette chi lo usa.
export function PrenotaForm({ lang, code, children }: { lang: Lang; code: string | null; children?: React.ReactNode }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [bags, setBags] = useState(1);
  const [adult, setAdult] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "bad" | "error">("idle");
  const t = T[lang];

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/prova", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "prenota", code, lang, name, contact, bags, adult }),
      });
      if (res.ok) setStatus("done");
      else setStatus((await res.json().catch(() => ({}))).error === "contatto" ? "bad" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="p-done">
        <p className="p-tag">✓</p>
        <h2>{t.booked(name.trim().split(" ")[0])}</h2>
        <p>{t.bookedText}</p>
      </div>
    );
  }

  return (
    <>
      {children}
      <form onSubmit={book}>
        <label>
          {t.name}
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="given-name" />
        </label>
        <label>
          {t.contact}
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            maxLength={200}
            placeholder={t.contactPh}
            autoComplete="off"
            autoCapitalize="none"
          />
        </label>
        <fieldset>
          <legend>{t.bags}</legend>
          <div className="p-bags">
            {BAGS.map((n) => (
              <button type="button" key={n} className={bags === n ? "on" : undefined} onClick={() => setBags(n)} aria-pressed={bags === n}>
                {n === 10 ? "10+" : n}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="p-check">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} required />
          <span>{t.adult}</span>
        </label>
        {status === "bad" && <p className="p-err">{t.badContact}</p>}
        {status === "error" && <p className="p-err">{t.error}</p>}
        <button className="p-btn p-primary" disabled={status === "sending"}>
          {status === "sending" ? t.booking : t.book}
        </button>
      </form>
    </>
  );
}
