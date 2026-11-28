import type { Metadata } from "next";
import { headers } from "next/headers";
import { Prova } from "@/components/Prova";
import { getDb } from "@/lib/db";
import { getSettings, isValidCode, linkTarget, publicOrigin } from "@/lib/qr";
import { bagPrice, currencyFor } from "@/lib/valuta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tipflow · L'hai provato. Ora sai.",
  description: "Filtri a carbone attivo con bocchino integrato. Prenota il lancio.",
  openGraph: {
    title: "Tipflow · Better tip. Better flow.",
    description: "Filtri a carbone attivo con bocchino integrato. Prenota il lancio.",
    images: ["/sito/filtro.jpg"],
  },
};

// Dove porta il QR stampato sui campioni (e il link che gira con "Passalo a un amico").
// Voto, lista d'attesa e passaparola: tutto finisce in Jarvis > Campioni.
export default async function Pubblica({ searchParams }: { searchParams: Promise<{ da?: string; lang?: string; paese?: string }> }) {
  const { da, lang, paese } = await searchParams;
  const settings = await getSettings(await getDb());
  const h = await headers();
  const code = da && isValidCode(da) ? da : null;

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = publicOrigin(process.env.JARVIS_PUBLIC_URL) ?? `${proto}://${host}`;

  const currency = currencyFor(h, paese);

  const english = lang === "en" || (lang !== "it" && !/^it\b/i.test(h.get("accept-language") ?? "it"));

  return (
    <Prova
      code={code}
      initialLang={english ? "en" : "it"}
      fromFriend={code === "amico"}
      shareUrl={`${origin}/q/amico`}
      hasWhatsapp={Boolean(linkTarget("whatsapp", settings))}
      hasInstagram={Boolean(linkTarget("instagram", settings))}
      price={bagPrice(settings, currency)}
      currency={currency}
      pieces={Number(settings.pezzi) || 100}
    />
  );
}
