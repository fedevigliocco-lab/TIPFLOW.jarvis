"use client";

import { useFormStatus } from "react-dom";

// Il giro di un agente dura un po': il pulsante lo dice, così non si preme due volte.
export function RunButton({ label = "Fai girare ora", hint = "Ci vogliono 1 o 2 minuti. Non chiudere la pagina." }: { label?: string; hint?: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button className="btn primary" disabled={pending}>
        {pending ? "Sto lavorando…" : label}
      </button>
      {pending && <span className="working">{hint}</span>}
    </>
  );
}
