"use client";

import { useFormStatus } from "react-dom";

// Il giro di un agente dura un paio di minuti: il pulsante lo dice, così non si preme due volte.
export function RunButton() {
  const { pending } = useFormStatus();
  return (
    <>
      <button className="btn primary" disabled={pending}>
        {pending ? "Sto lavorando…" : "Fai girare ora"}
      </button>
      {pending && <span className="working">Ci vogliono 1 o 2 minuti. Non chiudere la pagina.</span>}
    </>
  );
}
