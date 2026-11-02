"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { createQrCode, saveSettings, SETTING_KEYS, type Settings } from "@/lib/qr";

export async function savePage(formData: FormData) {
  const values: Partial<Settings> = {};
  for (const key of SETTING_KEYS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v.slice(0, 2000);
  }
  await saveSettings(await getDb(), values);
  revalidatePath("/qr");
  revalidatePath("/tipflow");
  revalidatePath("/");
  revalidatePath("/en");
  redirect("/qr?salvato=1");
}

export async function addQr(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const label = String(formData.get("label") ?? "");
  const ok = await createQrCode(await getDb(), code, label);
  revalidatePath("/qr");
  redirect(ok ? "/qr" : "/qr?errore=codice");
}
