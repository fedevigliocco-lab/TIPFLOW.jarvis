import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { getSettings, linkTarget, type LinkKind } from "@/lib/qr";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tipflow",
  description: "Filtri a carbone attivo con beccuccio integrato. Fumo più pulito e più fresco.",
};

const BUTTONS: { kind: LinkKind; label: string }[] = [
  { kind: "whatsapp", label: "Ordina su WhatsApp" },
  { kind: "instagram", label: "Seguici su Instagram" },
  { kind: "sito", label: "Vai al sito" },
];

// La pagina dove porta il QR stampato sui pacchi. Testi e link si cambiano da Jarvis, in "Test QR".
export default async function Pubblica({ searchParams }: { searchParams: Promise<{ da?: string }> }) {
  const { da } = await searchParams;
  const settings = await getSettings(await getDb());
  const buttons = BUTTONS.filter((b) => linkTarget(b.kind, settings));
  const from = da && /^[a-z0-9-]{1,20}$/.test(da) ? `?da=${da}` : "";

  return (
    <div className="public">
      <Image src="/logo.png" alt="Tipflow" width={220} height={72} priority className="public-logo" />
      <h1>{settings.titolo}</h1>
      {settings.testo && <p className="lead">{settings.testo}</p>}
      <div className="public-buttons">
        {buttons.map((b, i) => (
          <a key={b.kind} href={`/vai/${b.kind}${from}`} className={`btn ${i === 0 ? "primary" : ""}`}>
            {b.label}
          </a>
        ))}
        {buttons.length === 0 && <p className="meta">Presto qui trovi come ordinare.</p>}
      </div>
      <p className="meta public-foot">Prodotto riservato ai maggiorenni.</p>
    </div>
  );
}
