import type { Settings } from "./qr";

// Chi visita dalla Svizzera (o dal Liechtenstein, che usa il franco) vede i prezzi in franchi.
// Il paese arriva da Vercel (header x-vercel-ip-country). Per provare da qui: ?paese=ch sull'indirizzo.

export type Currency = "EUR" | "CHF";
export type Lang = "it" | "en";

const CHF_COUNTRIES = ["CH", "LI"];

export function currencyFor(headers: Headers, override?: string | null): Currency {
  const country = (override || headers.get("x-vercel-ip-country") || "").trim().toUpperCase();
  return CHF_COUNTRIES.includes(country) ? "CHF" : "EUR";
}

function amount(value: string, fallback: number): number {
  const n = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Il prezzo della busta nella valuta giusta. Il prezzo in franchi lo decide fede in Test QR: non è una conversione.
export function bagPrice(settings: Pick<Settings, "prezzo" | "prezzo_chf">, currency: Currency): number {
  return currency === "CHF" ? amount(settings.prezzo_chf, 20) : amount(settings.prezzo, 20);
}

// "20,00 €" / "€20.00" in euro, "CHF 20.00" in franchi (come si scrive in Svizzera). decimals: false toglie ",00" sui tondi.
export function formatPrice(value: number, currency: Currency, lang: Lang, decimals = true): string {
  const round = !decimals && Number.isInteger(value);
  const digits = { minimumFractionDigits: round ? 0 : 2, maximumFractionDigits: 2 };
  if (currency === "CHF") return `CHF ${new Intl.NumberFormat("en-US", digits).format(value)}`;
  const n = new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE", digits).format(value);
  return lang === "it" ? `${n} €` : `€${n}`;
}
