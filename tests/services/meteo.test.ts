import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMeteoService } from "../../src/services/meteo.js";

const XML_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<dati>
  <comune>Firenze</comune>
  <aggiornamento>22/06/2026 12:00</aggiornamento>
  <time_ms>123456789</time_ms>
  <almanacco>
    <sole_sorge>05:30</sole_sorge>
    <sole_tramonta>21:00</sole_tramonta>
  </almanacco>
  <previsione ora="giorno">
    <allerta value="VERDE">Allerta Verde</allerta>
    <rischio value="ASSENTE">Idraulico</rischio>
    <rischio value="BASSO">Idrogeologico</rischio>
    <rischio value="MODERATO">Temporali</rischio>
    <rischio value="ELEVATO">Vento</rischio>
    <rischio value="ASSENTE">Neve</rischio>
    <rischio value="ASSENTE">Ghiaccio</rischio>
    <temp temp_type="min">15</temp>
    <temp temp_type="max">28</temp>
  </previsione>
  <previsione ora="mattina">
    <temp temp_type="">22</temp>
    <temp temp_type="perc">21</temp>
    <um>45</um>
    <prob_rain>10</prob_rain>
    <uv>3</uv>
    <quota_neve>1800</quota_neve>
  </previsione>
  <previsione ora="pomeriggio">
    <temp temp_type="">26</temp>
    <temp temp_type="perc">25</temp>
    <um>40</um>
    <prob_rain>5</prob_rain>
    <uv>5</uv>
    <quota_neve>2000</quota_neve>
  </previsione>
  <previsione ora="sera">
    <temp temp_type="">18</temp>
    <temp temp_type="perc">17</temp>
    <um>50</um>
    <prob_rain>20</prob_rain>
    <uv>1</uv>
    <quota_neve>1600</quota_neve>
  </previsione>
</dati>`;

describe("createMeteoService", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    mockFetch = vi.fn(async (url: string) => {
      if (url.includes("firenze")) {
        return { ok: true, text: async () => XML_FIXTURE } as Response;
      }
      if (url.includes("malformed")) {
        return { ok: true, text: async () => "not xml" } as Response;
      }
      if (url.includes("network-error")) {
        throw new Error("Network failure");
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as Response;
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterAll(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  it("fetchDatiMeteo restituisce DatiMeteo per comune valido", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.comune).toBe("Firenze");
    expect(dati.aggiornamento).toBe("22/06/2026 12:00");
    expect(dati.allerta).toBe("VERDE");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/firenze\.xml$/)
    );
  });

  it("fetchDatiMeteo popola correttamente i rischi", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.rischi.idraulico).toBe("ASSENTE");
    expect(dati.rischi.idrogeologico).toBe("BASSO");
    expect(dati.rischi.temporali).toBe("MODERATO");
    expect(dati.rischi.vento).toBe("ELEVATO");
    expect(dati.rischi.neve).toBe("ASSENTE");
    expect(dati.rischi.ghiaccio).toBe("ASSENTE");
  });

  it("fetchDatiMeteo popola temperature, umidità, prob pioggia", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.temperatura.min).toBe(15);
    expect(dati.temperatura.max).toBe(28);
    expect(dati.temperaturaAttuale).toBeGreaterThanOrEqual(0);
    expect(dati.temperaturaPercepita).toBeGreaterThanOrEqual(0);
    expect(dati.umidita).toBeGreaterThanOrEqual(0);
    expect(dati.probabilitaPioggia).toBeGreaterThanOrEqual(0);
  });

  it("fetchDatiMeteo include alba e tramonto", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.alba).toBe("05:30");
    expect(dati.tramonto).toBe("21:00");
  });

  it("fetchDatiMeteo parteGiorno è una ParteGiorno valida", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(["mattina", "pomeriggio", "sera"]).toContain(dati.parteGiorno);
  });

  it("fetchDatiMeteo lancia errore per HTTP 404", async () => {
    const service = createMeteoService();
    await expect(service.fetchDatiMeteo("comune-inesistente")).rejects.toThrow(
      "Errore HTTP 404"
    );
  });

  it("fetchDatiMeteo lancia errore per XML malformato", async () => {
    const service = createMeteoService();
    await expect(
      service.fetchDatiMeteo("malformed")
    ).rejects.toThrow("XML LAMMA malformato");
  });

  it("fetchDatiMeteo lancia errore per errore di rete", async () => {
    const service = createMeteoService();
    await expect(
      service.fetchDatiMeteo("network-error")
    ).rejects.toThrow("Network failure");
  });
});
