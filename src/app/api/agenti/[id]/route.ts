import { isRunnable, runAgent } from "@/agents";
import { getDb } from "@/lib/db";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Per le chiamate programmate (es. Vercel Cron): GET o POST con "Authorization: Bearer <CRON_SECRET>".
async function handle(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ errore: "non autorizzato" }, { status: 401 });
  }
  const { id } = await params;
  if (!isRunnable(id)) return Response.json({ errore: `agente sconosciuto: ${id}` }, { status: 404 });
  const result = await runAgent(await getDb(), id);
  return Response.json(result, { status: result.status === "fatto" ? 200 : 500 });
}

export { handle as GET, handle as POST };
