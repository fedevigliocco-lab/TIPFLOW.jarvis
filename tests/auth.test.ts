import { afterEach, describe, expect, it, vi } from "vitest";
import { authRequired, checkPassword, isValidSession, sessionToken } from "@/lib/auth";

afterEach(() => vi.unstubAllEnvs());

describe("accesso con password", () => {
  it("accetta solo la password giusta e il suo cookie", async () => {
    vi.stubEnv("JARVIS_PASSWORD", "graffiti-2026");
    expect(await checkPassword("graffiti-2026")).toBe(true);
    expect(await checkPassword("sbagliata")).toBe(false);
    expect(await isValidSession(await sessionToken("graffiti-2026"))).toBe(true);
    expect(await isValidSession(await sessionToken("sbagliata"))).toBe(false);
    expect(await isValidSession(undefined)).toBe(false);
  });

  it("online senza password il pannello resta chiuso", async () => {
    vi.stubEnv("JARVIS_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(authRequired()).toBe(true);
    expect(await isValidSession("qualsiasi")).toBe(false);
    expect(await checkPassword("")).toBe(false);
  });

  it("in locale senza password il pannello è aperto", async () => {
    vi.stubEnv("JARVIS_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(await isValidSession(undefined)).toBe(true);
  });
});
