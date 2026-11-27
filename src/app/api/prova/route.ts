import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { joinWaitlist, recordShare, saveVote } from "@/lib/prova";
import { visitorId } from "@/lib/qr";

export const dynamic = "force-dynamic";

const code = z.string().max(20).nullish();
const lang = z.enum(["it", "en"]).default("it");
const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("voto"), code, lang, rating: z.number().int().min(1).max(5), comment: z.string().max(1000).nullish() }),
  z.object({
    type: z.literal("prenota"),
    code,
    lang,
    name: z.string().min(1).max(80),
    contact: z.string().min(3).max(200),
    bags: z.number().int().min(1).max(50),
    adult: z.literal(true),
  }),
  z.object({ type: z.literal("condividi"), code, lang, channel: z.string().max(20) }),
]);

// Quello che fa chi arriva dal QR: vota, prenota, condivide. Pubblico, senza accesso.
export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const body = parsed.data;

  const h = request.headers;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const visitor = await visitorId(ip, h.get("user-agent") ?? "");
  const db = await getDb();

  if (body.type === "voto") {
    await saveVote(db, { visitor, code: body.code, rating: body.rating, comment: body.comment, lang: body.lang });
  } else if (body.type === "prenota") {
    const ok = await joinWaitlist(db, { visitor, code: body.code, name: body.name, contact: body.contact, bags: body.bags, lang: body.lang });
    if (!ok) return NextResponse.json({ ok: false, error: "contatto" }, { status: 400 });
  } else {
    await recordShare(db, { visitor, code: body.code, channel: body.channel });
  }
  return NextResponse.json({ ok: true });
}
