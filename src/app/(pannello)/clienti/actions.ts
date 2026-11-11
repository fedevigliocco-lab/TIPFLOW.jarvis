"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { replyToCustomer } from "@/agents/assistenza";
import {
  addMessage,
  ASSISTENZA_KEYS,
  getConversation,
  PROVA_PHONE,
  resetProva,
  saveAssistenzaSettings,
  setConversationFlags,
  type AssistenzaKey,
} from "@/lib/clienti";
import { getDb } from "@/lib/db";
import { sendText } from "@/lib/whatsapp";

// La chat di prova: scrivi come se fossi un cliente, l'agente risponde qui (niente parte su WhatsApp).
export async function tryAgent(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000);
  if (!text) redirect("/clienti#prova");
  const db = await getDb();
  await addMessage(db, { phone: PROVA_PHONE, author: "cliente", text, name: "Cliente di prova" });
  await replyToCustomer(db, PROVA_PHONE);
  revalidatePath("/", "layout");
  redirect("/clienti#prova");
}

export async function restartProva() {
  await resetProva(await getDb());
  revalidatePath("/clienti");
  redirect("/clienti#prova");
}

// fede risponde di persona: il messaggio parte su WhatsApp e la conversazione passa in mano sua.
export async function replyAsFede(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 4000);
  const db = await getDb();
  if (!text || !(await getConversation(db, phone))) redirect(`/clienti?tel=${encodeURIComponent(phone)}`);
  const sent = phone === PROVA_PHONE ? { ok: true as const } : await sendText(phone, text);
  if (sent.ok) {
    await addMessage(db, { phone, author: "fede", text });
    await setConversationFlags(db, phone, { inManoAFede: true, serveFede: false });
  }
  revalidatePath("/", "layout");
  const params = new URLSearchParams({ tel: phone, ...(sent.ok ? {} : { errore: sent.error ?? "Invio non riuscito" }) });
  redirect(`/clienti?${params}`);
}

export async function setHandover(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const toFede = formData.get("a") === "fede";
  await setConversationFlags(await getDb(), phone, { inManoAFede: toFede, ...(toFede ? {} : { serveFede: false }) });
  revalidatePath("/clienti");
  redirect(`/clienti?tel=${encodeURIComponent(phone)}`);
}

export async function saveAgentFacts(formData: FormData) {
  const values: Partial<Record<AssistenzaKey, string>> = {};
  for (const key of ASSISTENZA_KEYS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v;
  }
  await saveAssistenzaSettings(await getDb(), values);
  revalidatePath("/clienti");
  redirect("/clienti?salvato=1#sa");
}
