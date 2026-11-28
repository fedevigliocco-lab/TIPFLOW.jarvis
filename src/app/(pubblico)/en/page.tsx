import type { Metadata } from "next";
import { headers } from "next/headers";
import { Sito } from "@/components/Sito";
import { currencyFor } from "@/lib/valuta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tipflow · Activated carbon filters with ergonomic tip",
  description: "Coconut activated carbon filters with a built-in ergonomic tip. 6 mm × 39 mm. Order on WhatsApp.",
  alternates: { languages: { it: "/" } },
};

export default async function HomeEn({ searchParams }: { searchParams: Promise<{ paese?: string }> }) {
  const { paese } = await searchParams;
  return <Sito lang="en" currency={currencyFor(await headers(), paese)} />;
}
