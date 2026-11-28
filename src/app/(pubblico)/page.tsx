import type { Metadata } from "next";
import { headers } from "next/headers";
import { Sito } from "@/components/Sito";
import { currencyFor } from "@/lib/valuta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tipflow · Filtri a carbone attivo con bocchino ergonomico",
  description: "Filtri a carbone attivo di cocco con bocchino ergonomico integrato. 6 mm × 39 mm. Ordina su WhatsApp.",
  alternates: { languages: { en: "/en" } },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ paese?: string }> }) {
  const { paese } = await searchParams;
  return <Sito lang="it" currency={currencyFor(await headers(), paese)} />;
}
