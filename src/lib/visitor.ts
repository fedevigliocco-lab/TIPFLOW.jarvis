import { isBot, visitorId } from "./qr";

// Chi sta visitando, a partire dalla richiesta. null per anteprime e robot, che non si contano.
export async function visitorFrom(headers: Headers): Promise<string | null> {
  const userAgent = headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return null;
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
  return visitorId(ip, userAgent);
}
