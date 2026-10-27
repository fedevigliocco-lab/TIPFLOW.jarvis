"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Jarvis" },
  { href: "/da-fare", label: "I tuoi da fare" },
  { href: "/squadra", label: "La squadra" },
  { href: "/magazzino", label: "Magazzino" },
];

export function Nav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "on" : undefined}>
          {l.label}
          {l.href === "/da-fare" && pending > 0 && <span className="badge">{pending}</span>}
        </Link>
      ))}
    </nav>
  );
}
