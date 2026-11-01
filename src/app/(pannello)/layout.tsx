import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import Link from "next/link";
import { logout } from "@/app/(pannello)/accesso/actions";
import { Nav } from "@/components/Nav";
import { authRequired, isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { todayStats } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Jarvis · Tipflow",
  description: "Il gestionale ad agenti di Tipflow",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PannelloLayout({ children }: { children: React.ReactNode }) {
  // Nella pagina di accesso non si mostra niente del gestionale.
  const loggedIn = await isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
  const stats = loggedIn ? await todayStats(await getDb()) : null;
  return (
    <div className="shell">
      <header className="top">
        <Link href="/" aria-label="Jarvis, pagina iniziale">
          <Image src="/logo.png" alt="Tipflow" width={116} height={38} priority />
        </Link>
        {stats && <Nav pending={stats.pending} />}
        {stats && authRequired() && (
          <form action={logout} className="logout">
            <button>Esci</button>
          </form>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
