import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createHeatWaveService } from "../../src/services/heatwave.js";

const CSV_FIRENZE_OGGI_DOMANI = `citta,data,livello,data_estrazione,URL
FIRENZE,2026-06-26,Livello2,2026-06-25,https://www.salute.gov.it/bol16170_firenze_20260625.pdf
FIRENZE,2026-06-27,Livello3,2026-06-25,https://www.salute.gov.it/bol16170_firenze_20260625.pdf
ROMA,2026-06-26,Livello1,2026-06-25,https://www.salute.gov.it/bol16239_roma_20260625.pdf`;

const CSV_FIRENZE_OGGI_L0_DOMANI_L1 = `citta,data,livello,data_estrazione,URL
FIRENZE,2026-06-26,Livello0,2026-06-25,https://www.salute.gov.it/bol16170_firenze_20260625.pdf
FIRENZE,2026-06-27,Livello1,2026-06-25,https://www.salute.gov.it/bol16170_firenze_20260625.pdf`;

const CSV_SOLO_OGGI_L2 = `citta,data,livello,data_estrazione,URL
FIRENZE,2026-06-26,Livello2,2026-06-25,https://www.salute.gov.it/bol16170_firenze_20260625.pdf
FIRENZE,2026-06-28,Livello3,2026-06-25,https://www.salute.gov.it/bol16170_firenze_20260625.pdf`;

const CSV_FIRENZE_ASSENTE = `citta,data,livello,data_estrazione,URL
ROMA,2026-06-26,Livello1,2026-06-25,https://www.salute.gov.it/bol16239_roma_20260625.pdf`;

const CSV_VUOTO = `citta,data,livello,data_estrazione,URL`;

describe("createHeatWaveService", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    vi.useFakeTimers().setSystemTime(new Date("2026-06-26T10:00:00Z"));
    mockFetch = vi.fn(async (url: string) => {
      if (url.includes("firenze-oggi-domani")) {
        return { ok: true, text: async () => CSV_FIRENZE_OGGI_DOMANI } as Response;
      }
      if (url.includes("oggi-l0-domani-l1")) {
        return { ok: true, text: async () => CSV_FIRENZE_OGGI_L0_DOMANI_L1 } as Response;
      }
      if (url.includes("solo-oggi-l2")) {
        return { ok: true, text: async () => CSV_SOLO_OGGI_L2 } as Response;
      }
      if (url.includes("firenze-assente")) {
        return { ok: true, text: async () => CSV_FIRENZE_ASSENTE } as Response;
      }
      if (url.includes("vuoto")) {
        return { ok: true, text: async () => CSV_VUOTO } as Response;
      }
      if (url.includes("404")) {
        return { ok: false, status: 404, text: async () => "Not Found" } as Response;
      }
      if (url.includes("malformed")) {
        return { ok: true, text: async () => "not,valid,csv" } as Response;
      }
      if (url.includes("network-error")) {
        throw new Error("Network failure");
      }
      return { ok: true, text: async () => CSV_FIRENZE_OGGI_DOMANI } as Response;
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterAll(() => {
    vi.stubGlobal("fetch", originalFetch);
    vi.useRealTimers();
  });

  it("restituisce oggi e domani per FIRENZE con CSV valido", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/firenze-oggi-domani");
    expect(r.errore).toBe(false);
    if (r.errore) return;
    expect(r.oggi).toEqual({ livello: 2, url: "https://www.salute.gov.it/bol16170_firenze_20260625.pdf" });
    expect(r.domani).toEqual({ livello: 3, url: "https://www.salute.gov.it/bol16170_firenze_20260625.pdf" });
    expect(r.dataEstrazione).toBe("2026-06-25");
  });

  it("oggi Livello0 domani Livello1", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/oggi-l0-domani-l1");
    expect(r.errore).toBe(false);
    if (r.errore) return;
    expect(r.oggi?.livello).toBe(0);
    expect(r.domani?.livello).toBe(1);
  });

  it("solo oggi presente (domani fuori range)", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/solo-oggi-l2");
    expect(r.errore).toBe(false);
    if (r.errore) return;
    expect(r.oggi?.livello).toBe(2);
    expect(r.domani).toBeNull();
  });

  it("FIRENZE assente dal CSV", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/firenze-assente");
    expect(r.errore).toBe(false);
    if (r.errore) return;
    expect(r.oggi).toBeNull();
    expect(r.domani).toBeNull();
  });

  it("CSV vuoto (solo header)", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/vuoto");
    expect(r.errore).toBe(false);
    if (r.errore) return;
    expect(r.oggi).toBeNull();
    expect(r.domani).toBeNull();
  });

  it("HTTP 404 restituisce errore: true", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/404");
    expect(r.errore).toBe(true);
  });

  it("body malformato restituisce errore false con dati null", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/malformed");
    expect(r.errore).toBe(false);
    if (r.errore) return;
    expect(r.oggi).toBeNull();
    expect(r.domani).toBeNull();
  });

  it("rete down restituisce errore: true", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/network-error");
    expect(r.errore).toBe(true);
  });
});
