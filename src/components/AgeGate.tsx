"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const T = {
  it: { title: "Solo maggiorenni", text: "Tipflow è un prodotto per chi ha almeno 18 anni.", yes: "Ho 18 anni o più", no: "No", bye: "Torna a trovarci quando avrai 18 anni." },
  en: { title: "Adults only", text: "Tipflow is for people aged 18 or over.", yes: "I'm 18 or over", no: "No", bye: "Come back when you're 18." },
} as const;

// Stessa chiave della pagina del QR: chi ha già detto "18+" là non se lo vede chiedere di nuovo.
const ADULT_KEY = "tipflow18";

// Il "18+" davanti al sito. Il testo della pagina resta nell'HTML (per Google), il velo lo copre finché non si conferma.
export function AgeGate({ lang }: { lang: "it" | "en" }) {
  const [gate, setGate] = useState<"ask" | "ok" | "no">("ask");
  const t = T[lang];

  useEffect(() => {
    try {
      if (localStorage.getItem(ADULT_KEY) === "1") setGate("ok");
    } catch {}
  }, []);

  useEffect(() => {
    document.body.style.overflow = gate === "ok" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gate]);

  if (gate === "ok") return null;

  const confirm = () => {
    try {
      localStorage.setItem(ADULT_KEY, "1");
    } catch {}
    setGate("ok");
  };

  return (
    <div className="p-gate" role="dialog" aria-modal="true" aria-labelledby="s-gate-title">
      <div>
        <Image src="/logo.png" alt="Tipflow" width={180} height={59} priority />
        <h2 id="s-gate-title">{t.title}</h2>
        {gate === "ask" ? (
          <>
            <p>{t.text}</p>
            <button className="p-btn p-primary" onClick={confirm}>{t.yes}</button>
            <button className="p-btn p-ghost" onClick={() => setGate("no")}>{t.no}</button>
          </>
        ) : (
          <p>{t.bye}</p>
        )}
      </div>
    </div>
  );
}
