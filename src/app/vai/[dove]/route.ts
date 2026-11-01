import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSettings, LINK_KINDS, linkTarget, recordVisit, type LinkKind } from "@/lib/qr";
import { visitorFrom } from "@/lib/visitor";

export const dynamic = "force-dynamic";

// I pulsanti della pagina pubblica passano di qui: si conta il tocco e si va su WhatsApp, Instagram o sito.
export async function GET(request: NextRequest, { params }: { params: Promise<{ dove: string }> }) {
  const dove = (await params).dove;
  const back = new URL("/tipflow", request.url);
  if (!(LINK_KINDS as readonly string[]).includes(dove)) return NextResponse.redirect(back, 303);

  const db = await getDb();
  const target = linkTarget(dove as LinkKind, await getSettings(db));
  if (!target) return NextResponse.redirect(back, 303);

  const visitor = await visitorFrom(request.headers);
  if (visitor) {
    const code = request.nextUrl.searchParams.get("da")?.toLowerCase() || null;
    try {
      await recordVisit(db, { code, kind: dove as LinkKind, visitor });
    } catch (error) {
      console.error("Tocco non registrato", error);
    }
  }
  return NextResponse.redirect(target, 303);
}
