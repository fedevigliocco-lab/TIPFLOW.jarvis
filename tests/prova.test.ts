import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, setupDb, type Db } from "@/lib/db";
import { contactHref, joinWaitlist, listComments, listWaitlist, normalizeContact, provaStats, recordShare, saveVote } from "@/lib/prova";
import { recordVisit } from "@/lib/qr";

let db: Db;

beforeEach(async () => {
  db = await createDb({ memory: true });
  await setupDb(db);
});

afterEach(async () => {
  await db.close();
});

describe("pagina dei campioni", () => {
  it("riconosce numeri WhatsApp ed email, scarta il resto", () => {
    expect(normalizeContact("333 123 4567")).toEqual({ contact: "393331234567", kind: "whatsapp" });
    expect(normalizeContact("+39 333 1234567")).toEqual({ contact: "393331234567", kind: "whatsapp" });
    expect(normalizeContact("0044 7700 900123")).toEqual({ contact: "447700900123", kind: "whatsapp" });
    expect(normalizeContact(" Anna@Mail.IT ")).toEqual({ contact: "anna@mail.it", kind: "email" });
    expect(normalizeContact("anna@mail")).toBeNull();
    expect(normalizeContact("12345")).toBeNull();
    expect(contactHref({ contact: "393331234567", contact_kind: "whatsapp" })).toBe("https://wa.me/393331234567");
  });

  it("un voto per persona: il secondo tocco lo cambia, il commento resta", async () => {
    await saveVote(db, { visitor: "anna", code: "p1", rating: 3, lang: "it" });
    await saveVote(db, { visitor: "anna", code: "p1", rating: 5, comment: "Tiro freschissimo", lang: "it" });
    await saveVote(db, { visitor: "anna", code: "p1", rating: 4, lang: "it" });
    await saveVote(db, { visitor: "bruno", code: "inventato", rating: 2, lang: "en" });
    await expect(saveVote(db, { visitor: "carla", rating: 6, lang: "it" })).rejects.toThrow();

    const stats = await provaStats(db);
    expect(stats.votes).toBe(2);
    expect(stats.ratings).toEqual([0, 1, 0, 1, 0]);
    expect(stats.average).toBe(3);
    expect(await listComments(db)).toMatchObject([{ rating: 4, comment: "Tiro freschissimo", code: "p1" }]);
  });

  it("la lista d'attesa tiene un posto per contatto e somma le buste", async () => {
    expect(await joinWaitlist(db, { visitor: "anna", code: "p1", name: "Anna", contact: "333 123 4567", bags: 2, lang: "it" })).toBe(true);
    expect(await joinWaitlist(db, { visitor: "anna", code: "p1", name: "Anna R.", contact: "+39 3331234567", bags: 3, lang: "it" })).toBe(true);
    expect(await joinWaitlist(db, { visitor: "bruno", code: "amico", name: "Bruno", contact: "bruno@mail.com", bags: 1, lang: "en" })).toBe(true);
    expect(await joinWaitlist(db, { visitor: "x", name: "X", contact: "boh", bags: 1, lang: "it" })).toBe(false);
    expect(await joinWaitlist(db, { visitor: "x", name: "X", contact: "x@y.com", bags: 0, lang: "it" })).toBe(false);

    const list = await listWaitlist(db);
    expect(list.map((w) => [w.name, w.bags, w.code])).toEqual([["Bruno", 1, "amico"], ["Anna R.", 3, "p1"]]);
    expect(await provaStats(db)).toMatchObject({ booked: 2, bags: 4 });
  });

  it("separa chi scansiona i campioni da chi arriva dal link di un amico", async () => {
    await recordVisit(db, { code: "p1", kind: "scansione", visitor: "anna" });
    await recordVisit(db, { code: "p1", kind: "scansione", visitor: "anna" });
    await recordVisit(db, { code: "p1", kind: "scansione", visitor: "bruno" });
    await recordVisit(db, { code: "amico", kind: "scansione", visitor: "carla" });
    await recordShare(db, { visitor: "anna", code: "p1", channel: "whatsapp" });
    await recordShare(db, { visitor: "anna", code: "p1", channel: "<script>" });

    expect(await provaStats(db)).toMatchObject({ scans: 3, people: 2, fromFriends: 1, shares: 2 });
  });
});
