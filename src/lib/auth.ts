// Accesso al pannello con una sola password (JARVIS_PASSWORD).
// Il cookie contiene un'impronta della password, non la password: cambiandola, tutti gli accessi decadono.
export const SESSION_COOKIE = "jarvis_sessione";

export function passwordConfigured(): boolean {
  return Boolean(process.env.JARVIS_PASSWORD);
}

// In locale, senza password, il pannello resta aperto; online la password è obbligatoria.
export function authRequired(): boolean {
  return passwordConfigured() || process.env.NODE_ENV === "production";
}

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("tipflow-jarvis-sessione"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  if (!authRequired()) return true;
  const password = process.env.JARVIS_PASSWORD;
  if (!password || !cookie) return false;
  return sameText(cookie, await sessionToken(password));
}

export async function checkPassword(attempt: string): Promise<boolean> {
  const password = process.env.JARVIS_PASSWORD;
  if (!password) return false;
  // Confronta le impronte, così la durata del confronto non dice nulla sulla password.
  return sameText(await sessionToken(attempt), await sessionToken(password));
}
