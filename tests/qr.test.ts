import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, setupDb, type Db } from "@/lib/db";
import {
  createQrCode,
  dailyStats,
  getSettings,
  isBot,
  linkTarget,
  qrStats,
  recordVisit,
  saveSettings,
  totalStats,
  visitorId,
} from "@/lib/qr";

let db: Db;

beforeEach(async () => {
  db = await createDb({ memory: true });
  await setupDb(db);
});

afterEach(async () => {
  await db.close();
});

describe("test di mercato con QR", () => {
  it("conta scansioni, persone diverse e chi tocca WhatsApp, per ogni QR", async () => {
    await recordVisit(db, { code: "p1", kind: "scansione", visitor: "anna" });
    await recordVisit(db, { code: "p1", kind: "scansione", visitor: "anna" });
    await recordVisit(db, { code: "p1", kind: "scansione", visitor: "bruno" });
    await recordVisit(db, { code: "p1", kind: "whatsapp", visitor: "anna" });
    await recordVisit(db, { code: "p1", kind: "whatsapp", visitor: "anna" });

    const [p1] = await qrStats(db);
    expect(p1).toMatchObject({ code: "p1", scans: 3, people: 2, whatsapp: 1, instagram: 0, sito: 0 });
    expect(await totalStats(db)).toMatchObject({ scans: 3, people: 2, whatsapp: 1 });
    expect((await dailyStats(db))[0]).toMatchObject({ scans: 3, people: 2, whatsapp: 1 });
  });

  it("un codice sconosciuto si conta lo stesso, ma senza QR", async () => {
    await recordVisit(db, { code: "inventato", kind: "scansione", visitor: "anna" });
    expect((await qrStats(db))[0].scans).toBe(0);
    expect((await totalStats(db)).scans).toBe(1);
  });

  it("i nuovi QR accettano solo codici corti e puliti", async () => {
    expect(await createQrCode(db, "p2", "Negozio di Marco")).toBe(true);
    expect(await createQrCode(db, "p2", "Doppione")).toBe(false);
    expect(await createQrCode(db, "Con Spazi", "No")).toBe(false);
    expect((await qrStats(db)).map((q) => q.code)).toEqual(["p1", "p2"]);
  });

  it("la pagina si cambia da Jarvis e i pulsanti seguono", async () => {
    let settings = await getSettings(db);
    expect(linkTarget("whatsapp", settings)).toBeNull();

    await saveSettings(db, { whatsapp: "333 123 4567", instagram: "@tipflow", sito: "tipflow.shop" });
    settings = await getSettings(db);
    expect(linkTarget("whatsapp", settings)).toMatch(/^https:\/\/wa\.me\/393331234567\?text=Ciao/);
    expect(linkTarget("instagram", settings)).toBe("https://instagram.com/tipflow");
    expect(linkTarget("sito", settings)).toBe("https://tipflow.shop");

    await saveSettings(db, { whatsapp: "+39 333 1234567", instagram: "https://instagram.com/tipflow.it", messaggio_whatsapp: "" });
    settings = await getSettings(db);
    expect(linkTarget("whatsapp", settings)).toBe("https://wa.me/393331234567");
    expect(linkTarget("instagram", settings)).toBe("https://instagram.com/tipflow.it");
  });

  it("l'impronta di chi visita è stabile e non contiene l'IP", async () => {
    const a = await visitorId("1.2.3.4", "iPhone");
    expect(a).toBe(await visitorId("1.2.3.4", "iPhone"));
    expect(a).not.toBe(await visitorId("1.2.3.5", "iPhone"));
    expect(a).not.toContain("1.2.3.4");
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(false);
  });
});
