"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, sessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function login(formData: FormData) {
  const attempt = String(formData.get("password") ?? "");
  const next = String(formData.get("da") ?? "/");
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!(await checkPassword(attempt))) redirect(`/accesso?errore=1&da=${encodeURIComponent(target)}`);

  (await cookies()).set(SESSION_COOKIE, await sessionToken(attempt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(target);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/accesso");
}
