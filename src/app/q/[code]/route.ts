import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { recordVisit } from "@/lib/qr";
import { visitorFrom } from "@/lib/visitor";

export const dynamic = "force-dynamic";

// L'indirizzo stampato nel QR. Conta la scansione e porta alla pagina pubblica,
// che fede può cambiare quando vuole: il QR resta sempre lo stesso.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase();
  const visitor = await visitorFrom(request.headers);
  if (visitor) {
    try {
      await recordVisit(await getDb(), { code, kind: "scansione", visitor });
    } catch (error) {
      // Se il conteggio non va, chi ha scansionato arriva comunque alla pagina.
      console.error("Scansione non registrata", error);
    }
  }
  const url = new URL("/tipflow", request.url);
  url.searchParams.set("da", code);
  return NextResponse.redirect(url, 303);
}
