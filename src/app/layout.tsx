import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getDb } from "@/lib/db";
import { todayStats } from "@/lib/repo";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jarvis · Tipflow",
  description: "Il gestionale ad agenti di Tipflow",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0c0e" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const stats = await todayStats(await getDb());
  return (
    <html lang="it">
      <body>
        <div className="shell">
          <header className="top">
            <Link href="/" aria-label="Jarvis, pagina iniziale">
              <Image src="/logo.png" alt="Tipflow" width={116} height={38} priority />
            </Link>
            <Nav pending={stats.pending} />
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
