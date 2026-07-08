import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db.js";
import { createRateLimiterService } from "../../src/services/rate-limiter.js";
import { utenti } from "../../src/db/schema.js";

describe("RateLimiterService", () => {
  async function setup() {
    const { db, cleanup } = await createTestDb();
    const service = createRateLimiterService(db);
    return { db, service, cleanup };
  }

  async function creaUtente(db: any, idTelegram: number) {
    await db.insert(utenti).values({ idTelegram, nomeTelegram: "Test" });
  }

  it("prima richiesta di un utente è consentita", async () => {
    const { db, service, cleanup } = await setup();
    try {
      await creaUtente(db, 111);
      expect(await service.isAllowed(111)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("seconda richiesta entro 60s è bloccata", async () => {
    const { db, service, cleanup } = await setup();
    try {
      await creaUtente(db, 111);
      expect(await service.isAllowed(111)).toBe(true);
      expect(await service.isAllowed(111)).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("una richiesta bloccata non sposta il timestamp salvato", async () => {
    const { db, service, cleanup } = await setup();
    try {
      await creaUtente(db, 111);
      await service.isAllowed(111);
      const rowsDopo1 = await db.select().from(utenti).where(eq(utenti.idTelegram, 111));
      const t1 = rowsDopo1[0].ultimaRichiestaOnDemand!.getTime();

      await service.isAllowed(111);
      const rowsDopo2 = await db.select().from(utenti).where(eq(utenti.idTelegram, 111));
      const t2 = rowsDopo2[0].ultimaRichiestaOnDemand!.getTime();

      expect(t2).toBe(t1);
    } finally {
      cleanup();
    }
  });

  it("dopo 60+ secondi la richiesta torna consentita", async () => {
    const { db, service, cleanup } = await setup();
    try {
      await creaUtente(db, 111);
      await db
        .update(utenti)
        .set({ ultimaRichiestaOnDemand: new Date(Date.now() - 61_000) })
        .where(eq(utenti.idTelegram, 111));

      expect(await service.isAllowed(111)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("due richieste concorrenti dello stesso utente: solo una viene consentita", async () => {
    const { db, service, cleanup } = await setup();
    try {
      await creaUtente(db, 111);
      const [primo, secondo] = await Promise.all([
        service.isAllowed(111),
        service.isAllowed(111),
      ]);
      expect([primo, secondo].filter((v) => v === true)).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it("utenti diversi hanno contatori indipendenti", async () => {
    const { db, service, cleanup } = await setup();
    try {
      await creaUtente(db, 111);
      await creaUtente(db, 222);
      expect(await service.isAllowed(111)).toBe(true);
      expect(await service.isAllowed(111)).toBe(false);
      expect(await service.isAllowed(222)).toBe(true);
    } finally {
      cleanup();
    }
  });
});
