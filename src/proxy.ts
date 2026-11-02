import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

// Pagine aperte a tutti: il sito (italiano e inglese), il QR con la sua pagina, l'accesso
// e le chiamate programmate (protette da CRON_SECRET). Tutto il resto è il pannello.
function isPublic(pathname: string): boolean {
  if (pathname === "/" || pathname === "/en") return true;
  return ["/accesso", "/api/agenti/", "/q/", "/vai/", "/tipflow", "/sito/"].some((p) => pathname.startsWith(p));
}

// Ogni pagina del pannello (e ogni pulsante) richiede l'accesso.
export async function proxy(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next();
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.method !== "GET") return new NextResponse("Accesso richiesto", { status: 401 });
  const url = new URL("/accesso", request.url);
  url.searchParams.set("da", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // I file statici non passano dal controllo.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt).*)"],
};
