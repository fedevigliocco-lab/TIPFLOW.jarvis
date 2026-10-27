import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";

// Ogni pagina del pannello (e ogni pulsante) richiede l'accesso.
export async function proxy(request: NextRequest) {
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.method !== "GET") return new NextResponse("Accesso richiesto", { status: 401 });
  const url = new URL("/accesso", request.url);
  url.searchParams.set("da", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Fuori: la pagina di accesso, le chiamate programmate (protette da CRON_SECRET) e i file statici.
  matcher: ["/((?!accesso|api/agenti|_next/static|_next/image|favicon.ico|logo.png).*)"],
};
