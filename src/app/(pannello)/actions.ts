"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRunnable, runAgent } from "@/agents";
import { getDb } from "@/lib/db";
import { decideTask } from "@/lib/repo";

export async function decide(formData: FormData) {
  const id = Number(formData.get("id"));
  const decision = formData.get("decision");
  if (!Number.isInteger(id) || (decision !== "approvato" && decision !== "rifiutato")) return;
  await decideTask(await getDb(), id, decision, String(formData.get("note") ?? ""));
  revalidatePath("/", "layout");
}

export async function runNow(formData: FormData) {
  const id = String(formData.get("agent") ?? "");
  if (!isRunnable(id)) return;
  const result = await runAgent(await getDb(), id);
  revalidatePath("/", "layout");
  const params = new URLSearchParams({ agente: id, esito: result.status, messaggio: result.summary });
  redirect(`/squadra?${params}`);
}
