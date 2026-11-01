import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tipflow",
  description: "Filtri a carbone attivo con beccuccio integrato",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0c0e" };

// Due mondi sotto lo stesso indirizzo: il pannello privato (pannello) e le pagine pubbliche (pubblico).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
