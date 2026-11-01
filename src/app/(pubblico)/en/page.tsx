import type { Metadata } from "next";
import { Sito } from "@/components/Sito";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tipflow · Activated carbon filters with ergonomic tip",
  description: "Coconut activated carbon filters with a built-in ergonomic tip. 6 mm × 39 mm. Order on WhatsApp.",
  alternates: { languages: { it: "/" } },
};

export default function HomeEn() {
  return <Sito lang="en" />;
}
