import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createMeteoService, calcolaOffsetGiorni } from "../../src/services/meteo.js";

const XML_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<dati>
  <comune>Firenze</comune>
  <aggiornamento>22/06/2026 12:00</aggiornamento>
  <time_ms>123456789</time_ms>
  <almanacco>
    <sole_sorge>05:30</sole_sorge>
    <sole_tramonta>21:00</sole_tramonta>
  </almanacco>
  <previsione idday="1" ora="giorno" datadescr="Martedì">
    <allerta value="basso"/>
    <rischio descr="idraulico" value="nessuno"/>
    <rischio descr="idrogeologico" value="nessuno"/>
    <rischio descr="temporali" value="basso"/>
    <rischio descr="vento" value="nessuno"/>
    <rischio descr="neve" value="nessuno"/>
    <rischio descr="ghiaccio" value="nessuno"/>
    <temp temp_type="min">15</temp>
    <temp temp_type="max">28</temp>
  </previsione>
  <previsione idday="2" ora="giorno" datadescr="Mercoledì">
    <allerta value="moderato"/>
    <rischio descr="idraulico" value="moderato"/>
    <rischio descr="idrogeologico" value="elevato"/>
    <rischio descr="temporali" value="nessuno"/>
    <rischio descr="vento" value="basso"/>
    <rischio descr="neve" value="nessuno"/>
    <rischio descr="ghiaccio" value="nessuno"/>
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

const XML_NA_DOMANI = `<?xml version="1.0" encoding="UTF-8"?>
<dati>
  <comune>X</comune>
  <aggiornamento>22/06/2026 12:00</aggiornamento>
  <time_ms>123</time_ms>
  <almanacco><sole_sorge>05:30</sole_sorge><sole_tramonta>21:00</sole_tramonta></almanacco>
  <previsione idday="1" ora="giorno" datadescr="Martedì">
    <allerta value="basso"/>
    <rischio descr="idraulico" value="nessuno"/>
    <rischio descr="idrogeologico" value="nessuno"/>
    <rischio descr="temporali" value="basso"/>
    <rischio descr="vento" value="nessuno"/>
    <rischio descr="neve" value="nessuno"/>
    <rischio descr="ghiaccio" value="nessuno"/>
    <temp temp_type="min">15</temp>
    <temp temp_type="max">28</temp>
  </previsione>
  <previsione idday="2" ora="giorno" datadescr="Mercoledì">
    <allerta value="NA"/>
    <rischio descr="idraulico" value="NA"/>
    <rischio descr="idrogeologico" value="NA"/>
    <rischio descr="temporali" value="NA"/>
    <rischio descr="vento" value="NA"/>
    <rischio descr="neve" value="NA"/>
    <rischio descr="ghiaccio" value="NA"/>
  </previsione>
  <previsione ora="mattina">
    <temp temp_type="">22</temp>
    <temp temp_type="perc">21</temp>
    <um>45</um>
    <prob_rain>10</prob_rain>
    <uv>3</uv>
    <quota_neve>1800</quota_neve>
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
      if (url.includes("comune-na")) {
        return { ok: true, text: async () => XML_NA_DOMANI } as Response;
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
    expect(dati.allerta).toBe("basso");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/firenze\.xml$/)
    );
  });

  it("fetchDatiMeteo popola correttamente i rischi", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.rischi.idraulico).toBe("nessuno");
    expect(dati.rischi.idrogeologico).toBe("nessuno");
    expect(dati.rischi.temporali).toBe("basso");
    expect(dati.rischi.vento).toBe("nessuno");
    expect(dati.rischi.neve).toBe("nessuno");
    expect(dati.rischi.ghiaccio).toBe("nessuno");
  });

  it("fetchDatiMeteo popola allertaDomani e rischiDomani quando presenti", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.allertaDomani).toBe("moderato");
    expect(dati.rischiDomani?.idraulico).toBe("moderato");
    expect(dati.rischiDomani?.idrogeologico).toBe("elevato");
    expect(dati.rischiDomani?.vento).toBe("basso");
    expect(dati.nomeGiornoDomani).toBe("Mercoledì");
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
    expect(["mattina", "mattina2", "pomeriggio", "pomeriggio2", "sera", "sera2"]).toContain(dati.parteGiorno);
  });

  it("fetchDatiMeteo scarta allertaDomani=NA (giorno non ancora valutato)", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("comune-na");
    expect(dati.allertaDomani).toBeUndefined();
    expect(dati.rischiDomani).toBeUndefined();
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

describe("calcolaOffsetGiorni", () => {
  const OGGI_REALE = new Date();

  function dataISO(gg: Date | number, mese?: number, anno?: number): string {
    let d: Date;
    if (gg instanceof Date) {
      d = gg;
    } else {
      d = new Date(anno!, mese! - 1, gg);
    }
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  function formattaItaliana(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()} 00:00`;
  }

  it("restituisce 0 se la data di aggiornamento è oggi", () => {
    const oggi = new Date(2026, 6, 22); // 22 luglio 2026
    const oggiStr = "22/07/2026 08:00";
    expect(calcolaOffsetGiorni(oggiStr, oggi)).toBe(0);
  });

  it("restituisce 1 se la data di aggiornamento è ieri", () => {
    const oggi = new Date(2026, 6, 22); // 22 luglio 2026
    const ieriStr = "21/07/2026 08:00";
    expect(calcolaOffsetGiorni(ieriStr, oggi)).toBe(1);
  });

  it("restituisce 2 se la data di aggiornamento è di due giorni fa", () => {
    const oggi = new Date(2026, 6, 22);
    const dueGiorniFa = "20/07/2026 08:00";
    expect(calcolaOffsetGiorni(dueGiorniFa, oggi)).toBe(2);
  });

  it("restituisce 0 per stringa vuota", () => {
    expect(calcolaOffsetGiorni("", OGGI_REALE)).toBe(0);
  });

  it("restituisce 0 per formato non valido", () => {
    expect(calcolaOffsetGiorni("non è una data", OGGI_REALE)).toBe(0);
    expect(calcolaOffsetGiorni("2026-07-22", OGGI_REALE)).toBe(0);
  });

  it("restituisce 0 (clamp) se la data è nel futuro", () => {
    const oggi = new Date(2026, 6, 22);
    const futuroStr = "23/07/2026 08:00";
    expect(calcolaOffsetGiorni(futuroStr, oggi)).toBe(0);
  });

  it("usa la data corrente se oggi non è fornito", () => {
    // Con data corrente, il risultato deve essere >= 0
    const oggiStr = formattaItaliana(new Date());
    const offset = calcolaOffsetGiorni(oggiStr);
    expect(offset).toBeGreaterThanOrEqual(0);
  });
});

describe("createMeteoService con offset idday", () => {
  const ORIGINAL_FETCH = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  function makeXml(
    aggDate: string,
    giorno1: string,
    giorno2: string,
    giorno3: string,
  ): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<dati>
  <comune>Firenze</comune>
  <aggiornamento>${aggDate} 08:00</aggiornamento>
  <time_ms>123456789</time_ms>
  <almanacco><sole_sorge>05:30</sole_sorge><sole_tramonta>21:00</sole_tramonta></almanacco>
  <previsione idday="1" ora="giorno" datadescr="Giorno1">
    <allerta value="${giorno1}">${giorno1}</allerta>
    <rischio value="ASSENTE">Idraulico</rischio>
    <rischio value="ASSENTE">Idrogeologico</rischio>
    <rischio value="ASSENTE">Temporali</rischio>
    <rischio value="ASSENTE">Vento</rischio>
    <rischio value="ASSENTE">Neve</rischio>
    <rischio value="ASSENTE">Ghiaccio</rischio>
    <temp temp_type="min">10</temp>
    <temp temp_type="max">20</temp>
  </previsione>
  <previsione idday="1" ora="mattina">
    <temp temp_type="">15</temp>
    <temp temp_type="perc">14</temp>
    <um>50</um>
    <prob_rain>5</prob_rain>
    <uv>3</uv>
    <quota_neve>1800</quota_neve>
  </previsione>
  <previsione idday="2" ora="giorno" datadescr="Giorno2">
    <allerta value="${giorno2}">${giorno2}</allerta>
    <rischio value="ASSENTE">Idraulico</rischio>
    <rischio value="ASSENTE">Idrogeologico</rischio>
    <rischio value="ASSENTE">Temporali</rischio>
    <rischio value="ASSENTE">Vento</rischio>
    <rischio value="ASSENTE">Neve</rischio>
    <rischio value="ASSENTE">Ghiaccio</rischio>
    <temp temp_type="min">12</temp>
    <temp temp_type="max">22</temp>
  </previsione>
  <previsione idday="2" ora="mattina">
    <temp temp_type="">18</temp>
    <temp temp_type="perc">17</temp>
    <um>45</um>
    <prob_rain>10</prob_rain>
    <uv>5</uv>
    <quota_neve>2000</quota_neve>
  </previsione>
  <previsione idday="3" ora="giorno" datadescr="Giorno3">
    <allerta value="${giorno3}">${giorno3}</allerta>
    <rischio value="ASSENTE">Idraulico</rischio>
    <rischio value="ASSENTE">Idrogeologico</rischio>
    <rischio value="ASSENTE">Temporali</rischio>
    <rischio value="ASSENTE">Vento</rischio>
    <rischio value="ASSENTE">Neve</rischio>
    <rischio value="ASSENTE">Ghiaccio</rischio>
    <temp temp_type="min">8</temp>
    <temp temp_type="max">18</temp>
  </previsione>
  <previsione idday="3" ora="mattina">
    <temp temp_type="">14</temp>
    <temp temp_type="perc">13</temp>
    <um>55</um>
    <prob_rain>15</prob_rain>
    <uv>2</uv>
    <quota_neve>1600</quota_neve>
  </previsione>
</dati>`;
  }

  beforeAll(() => {
    mockFetch = vi.fn(async (url: string) => {
      if (url.includes("firenze-oggi")) {
        const xml = makeXml("22/07/2026", "VERDE", "GIALLO", "ARANCIONE");
        return { ok: true, text: async () => xml } as Response;
      }
      if (url.includes("firenze-ieri")) {
        const xml = makeXml("21/07/2026", "VERDE", "GIALLO", "ARANCIONE");
        return { ok: true, text: async () => xml } as Response;
      }
      if (url.includes("firenze-due-giorni")) {
        const xml = makeXml("20/07/2026", "VERDE", "GIALLO", "ARANCIONE");
        return { ok: true, text: async () => xml } as Response;
      }
      if (url.includes("firenze-senza-idday")) {
        return { ok: true, text: async () => XML_FIXTURE } as Response;
      }
      return { ok: false, status: 404, text: async () => "Not Found" } as Response;
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterAll(() => {
    vi.stubGlobal("fetch", ORIGINAL_FETCH);
  });

  it("offset=0: usa idday=1 per oggi e idday=2 per domani", async () => {
    const service = createMeteoService();
    const oggi = new Date(2026, 6, 22);
    const dati = await service.fetchDatiMeteo("firenze-oggi", oggi);

    expect(dati.allerta).toBe("VERDE");
    expect(dati.allertaDomani).toBe("GIALLO");
    expect(dati.nomeGiornoDomani).toBe("Giorno2");
    expect(dati.temperatura.min).toBe(10);
    expect(dati.temperatura.max).toBe(20);
  });

  it("offset=1: usa idday=2 per oggi e idday=3 per domani", async () => {
    const service = createMeteoService();
    const oggi = new Date(2026, 6, 22);
    const dati = await service.fetchDatiMeteo("firenze-ieri", oggi);

    expect(dati.allerta).toBe("GIALLO");
    expect(dati.allertaDomani).toBe("ARANCIONE");
    expect(dati.nomeGiornoDomani).toBe("Giorno3");
    expect(dati.temperatura.min).toBe(12);
    expect(dati.temperatura.max).toBe(22);
  });

  it("offset=2: usa idday=3 per oggi, domani fuori range (fallback)", async () => {
    const service = createMeteoService();
    const oggi = new Date(2026, 6, 22);
    const dati = await service.fetchDatiMeteo("firenze-due-giorni", oggi);

    expect(dati.allerta).toBe("ARANCIONE");
    // idday=4 non esiste → allertaDomani undefined
    expect(dati.allertaDomani).toBeUndefined();
    expect(dati.nomeGiornoDomani).toBeUndefined();
  });

  it("XML senza idday: fallback al comportamento legacy", async () => {
    const service = createMeteoService();
    const oggi = new Date(2026, 6, 22);
    const dati = await service.fetchDatiMeteo("firenze-senza-idday", oggi);

    // Il vecchio fixture non ha idday, si usa il primo "giorno" disponibile
    expect(dati.comune).toBe("Firenze");
    expect(dati.allerta).toBe("VERDE");
  });
});
