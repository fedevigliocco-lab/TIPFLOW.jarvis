import type { Metadata } from "next";
import { Sito } from "@/components/Sito";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tipflow · Filtri a carbone attivo con bocchino ergonomico",
  description: "Filtri a carbone attivo di cocco con bocchino ergonomico integrato. 6 mm × 39 mm. Ordina su WhatsApp.",
  alternates: { languages: { en: "/en" } },
};

export default function Home() {
  return <Sito lang="it" />;
}
