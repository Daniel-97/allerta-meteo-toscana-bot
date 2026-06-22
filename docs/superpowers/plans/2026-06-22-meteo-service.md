# LAMMA Meteo Service — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare meteo service (fetch + parse XML LAMMA → `DatiMeteo`) e formatter messaggi (funzioni pure per messaggi allerta/previsioni/completo). Nessuna dipendenza da grammY.

**Architecture:** Due moduli separati: `src/services/messaggi.ts` (funzioni pure, testabili senza I/O) e `src/services/meteo.ts` (factory `createMeteoService()` con `fetchDatiMeteo(comuneUrl)`, usa `fetch` nativo + `fast-xml-parser`).

**Tech Stack:** TypeScript (NodeNext), `fast-xml-parser`, `fetch` (Node 18+), vitest.

---

## File Structure

| File | Azione | Responsabilità |
|---|---|---|
| `src/services/messaggi.ts` | Crea | Funzioni pure per formattazione messaggi |
| `tests/services/messaggi.test.ts` | Crea | Test con oggetti DatiMeteo costruiti a mano |
| `src/services/meteo.ts` | Crea | Factory MeteoService (fetch + parse → DatiMeteo) |
| `tests/services/meteo.test.ts` | Crea | Test con XML fixture + mock di fetch |

---

### Task 1: Formattatori messaggi

**Files:**
- Create: `src/services/messaggi.ts`
- Create: `tests/services/messaggi.test.ts`

- [ ] **Step 1: Crea `src/services/messaggi.ts`**

```ts
import type { DatiMeteo, ParteGiorno } from "../types/index.js";

export function formattaAllerta(dati: DatiMeteo): string {
  return (
    `Dati allerta del ${dati.aggiornamento} per comune di ${dati.comune}\n\n` +
    `Allerta: ${dati.allerta}\n\n` +
    `- Rischio idraulico: ${dati.rischi.idraulico}\n` +
    `- Rischio idrogeologico: ${dati.rischi.idrogeologico}\n` +
    `- Rischio temporali: ${dati.rischi.temporali}\n` +
    `- Rischio vento: ${dati.rischi.vento}\n` +
    `- Rischio neve: ${dati.rischi.neve}\n` +
    `- Rischio ghiaccio: ${dati.rischi.ghiaccio}`
  );
}

export function formattaPrevisioni(dati: DatiMeteo): string {
  const parteGiornoStr =
    dati.parteGiorno === "mattina"
      ? "mattina"
      : dati.parteGiorno === "pomeriggio"
        ? "pomeriggio"
        : "sera";
  return (
    `Dati meteo del ${dati.aggiornamento}. Comune di ${dati.comune} ${parteGiornoStr}\n\n` +
    `- Temperatura: ${dati.temperatura.min}°\n` +
    `- Temperatura percepita: ${dati.temperatura.max}°\n` +
    `- Umidita': ${dati.umidita}%\n` +
    `- Probabilita' pioggia: ${dati.probabilitaPioggia}%\n` +
    `- Sole sorge: ${dati.alba}\n` +
    `- Sole tramonta: ${dati.tramonto}\n` +
    `Temp min: ${dati.temperatura.min}°         Temp max: ${dati.temperatura.max}°`
  );
}

export function formattaCompleto(dati: DatiMeteo): string {
  const parteGiornoStr =
    dati.parteGiorno === "mattina"
      ? "mattina"
      : dati.parteGiorno === "pomeriggio"
        ? "pomeriggio"
        : "sera";
  return (
    `Dati del ${dati.aggiornamento} per comune di ${dati.comune}\n\n` +
    `Allerta: ${dati.allerta}\n\n` +
    `- Rischio idraulico: ${dati.rischi.idraulico}\n` +
    `- Rischio idrogeologico: ${dati.rischi.idrogeologico}\n` +
    `- Rischio temporali: ${dati.rischi.temporali}\n` +
    `- Rischio vento: ${dati.rischi.vento}\n` +
    `- Rischio neve: ${dati.rischi.neve}\n` +
    `- Rischio ghiaccio: ${dati.rischi.ghiaccio}\n\n` +
    `Informazioni meteo ${parteGiornoStr}\n` +
    `- Temperatura: ${dati.temperatura.min}°\n` +
    `- Temperatura percepita: ${dati.temperatura.max}°\n` +
    `- Umidita': ${dati.umidita}%\n` +
    `- Probabilita' pioggia: ${dati.probabilitaPioggia}%\n\n` +
    `Temp min: ${dati.temperatura.min}°         Temp max: ${dati.temperatura.max}°`
  );
}

export function ottieniUrlImmagine(
  parteGiorno: ParteGiorno,
  timeMs: string
): string {
  const base = "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_";
  const suffix = parteGiorno === "mattina" ? "M" : parteGiorno === "pomeriggio" ? "P" : "S";
  return `${base}${suffix}.jpg?v=${timeMs}`;
}
```

- [ ] **Step 2: Crea `tests/services/messaggi.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  formattaAllerta,
  formattaPrevisioni,
  formattaCompleto,
  ottieniUrlImmagine,
} from "../../src/services/messaggi.js";
import type { DatiMeteo } from "../../src/types/index.js";

const datiFixture: DatiMeteo = {
  comune: "Firenze",
  aggiornamento: "22/06/2026 12:00",
  allerta: "GIALLO",
  rischi: {
    idraulico: "MODERATO",
    idrogeologico: "BASSO",
    temporali: "ASSENTE",
    vento: "ELEVATO",
    neve: "ASSENTE",
    ghiaccio: "ASSENTE",
  },
  temperatura: { min: 15, max: 28 },
  umidita: 45,
  probabilitaPioggia: 10,
  alba: "05:30",
  tramonto: "21:00",
  parteGiorno: "mattina",
};

describe("formattaAllerta", () => {
  it("include comune e aggiornamento", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).toContain("Firenze");
    expect(msg).toContain("22/06/2026");
  });

  it("include livello allerta", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).toContain("Allerta: GIALLO");
  });

  it("include tutti i 6 rischi", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).toContain("Rischio idraulico: MODERATO");
    expect(msg).toContain("Rischio idrogeologico: BASSO");
    expect(msg).toContain("Rischio temporali: ASSENTE");
    expect(msg).toContain("Rischio vento: ELEVATO");
    expect(msg).toContain("Rischio neve: ASSENTE");
    expect(msg).toContain("Rischio ghiaccio: ASSENTE");
  });

  it("NON include informazioni meteo", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).not.toContain("Temperatura");
    expect(msg).not.toContain("Umidita");
  });
});

describe("formattaPrevisioni", () => {
  it("include dati meteo base", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).toContain("Firenze");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidita': 45%");
    expect(msg).toContain("Probabilita' pioggia: 10%");
  });

  it("include alba e tramonto", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).toContain("Sole sorge: 05:30");
    expect(msg).toContain("Sole tramonta: 21:00");
  });

  it("NON include rischi", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).not.toContain("Allerta:");
    expect(msg).not.toContain("Rischio idraulico");
  });
});

describe("formattaCompleto", () => {
  it("include allerta e previsioni", () => {
    const msg = formattaCompleto(datiFixture);
    expect(msg).toContain("Allerta: GIALLO");
    expect(msg).toContain("Rischio idraulico: MODERATO");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidita': 45%");
  });
});

describe("ottieniUrlImmagine", () => {
  it("ritorna URL corretto per mattina", () => {
    const url = ottieniUrlImmagine("mattina", "12345");
    expect(url).toBe(
      "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_M.jpg?v=12345"
    );
  });

  it("ritorna URL corretto per pomeriggio", () => {
    const url = ottieniUrlImmagine("pomeriggio", "67890");
    expect(url).toContain("image_1_P.jpg?v=67890");
  });

  it("ritorna URL corretto per sera", () => {
    const url = ottieniUrlImmagine("sera", "00000");
    expect(url).toContain("image_1_S.jpg?v=00000");
  });
});
```

- [ ] **Step 3: Esegui i test**

Run: `npm test -- tests/services/messaggi.test.ts`
Expected: 10 test, tutti PASS.

- [ ] **Step 4: Commit**

```bash
git add src/services/messaggi.ts tests/services/messaggi.test.ts
git commit -m "feat: add message formatters (allerta, previsioni, completo, image URL)"
```

---

### Task 2: Meteo service (fetch + parse XML LAMMA)

**Files:**
- Create: `src/services/meteo.ts`
- Create: `tests/services/meteo.test.ts`

- [ ] **Step 1: Crea `tests/services/meteo.test.ts` — test con fixture XML inline**

```ts
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
  <previsione>
    <allerta value="VERDE">Allerta Verde</allerta>
    <rischio value="ASSENTE">Idraulico</rischio>
    <rischio value="BASSO">Idrogeologico</rischio>
    <rischio value="MODERATO">Temporali</rischio>
    <rischio value="ELEVATO">Vento</rischio>
    <rischio value="ASSENTE">Neve</rischio>
    <rischio value="ASSENTE">Ghiaccio</rischio>
    <temp>15</temp>
    <temp>28</temp>
  </previsione>
  <previsione>
    <temp>22</temp>
    <temp>21</temp>
    <um>45</um>
    <prob_rain>10</prob_rain>
  </previsione>
  <previsione>
    <temp>26</temp>
    <temp>25</temp>
    <um>40</um>
    <prob_rain>5</prob_rain>
  </previsione>
  <previsione>
    <temp>18</temp>
    <temp>17</temp>
    <um>50</um>
    <prob_rain>20</prob_rain>
  </previsione>
</dati>`;

describe("createMeteoService", () => {
  beforeAll(() => {
    // Mock fetch globale per evitare richieste HTTP reali
    const mockFetch = async (url: string) => {
      if (url.includes("firenze")) {
        return {
          ok: true,
          text: async () => XML_FIXTURE,
        };
      }
      return { ok: false, status: 404, text: async () => "Not Found" };
    };
    vi.stubGlobal("fetch", mockFetch);
  });

  afterAll(() => {
    vi.unstubGlobal("fetch");
  });

  it("fetchDatiMeteo restituisce DatiMeteo per comune valido", async () => {
    const service = createMeteoService();
    const dati = await service.fetchDatiMeteo("firenze");
    expect(dati.comune).toBe("Firenze");
    expect(dati.aggiornamento).toBe("22/06/2026 12:00");
    expect(dati.allerta).toBe("VERDE");
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
});
```

- [ ] **Step 2: Esegui il test per vederlo fallire**

Run: `npm test -- tests/services/meteo.test.ts`
Expected: FAIL — `createMeteoService` non è ancora definito.

- [ ] **Step 3: Crea `src/services/meteo.ts`**

```ts
import { XMLParser } from "fast-xml-parser";
import type {
  DatiMeteo,
  LivelloAllerta,
  LivelloRischio,
  ParteGiorno,
} from "../types/index.js";

export interface MeteoService {
  fetchDatiMeteo(comuneUrl: string): Promise<DatiMeteo>;
}

export function createMeteoService(): MeteoService {
  const parser = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "_",
    ignoreAttributes: false,
    isArray: (name) => ["previsione", "rischio"].includes(name),
  });

  function calcolaParteGiorno(): ParteGiorno {
    const h = new Date().getHours();
    if (h >= 1 && h < 13) return "mattina";
    if (h >= 13 && h <= 19) return "pomeriggio";
    return "sera";
  }

  return {
    fetchDatiMeteo: async (comuneUrl) => {
      const url = `http://www.lamma.rete.toscana.it/previ/ita/xml/comuni_web/dati/${comuneUrl}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Errore HTTP ${res.status} per il comune "${comuneUrl}"`
        );
      }
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const root = parsed.dati;

      if (!root || !root.previsione || root.previsione.length === 0) {
        throw new Error(
          `XML LAMMA malformato per il comune "${comuneUrl}": dati mancanti`
        );
      }

      const parteGiorno = calcolaParteGiorno();
      const idx = parteGiorno === "mattina" ? 1 : parteGiorno === "pomeriggio" ? 2 : 3;

      return {
        comune: String(root.comune ?? ""),
        aggiornamento: String(root.aggiornamento ?? ""),
        allerta: String(
          root.previsione[0]?.allerta?.[0]?.value ?? ""
        ) as LivelloAllerta,
        rischi: {
          idraulico: String(
            root.previsione[0]?.rischio?.[0]?.value ?? ""
          ) as LivelloRischio,
          idrogeologico: String(
            root.previsione[0]?.rischio?.[1]?.value ?? ""
          ) as LivelloRischio,
          temporali: String(
            root.previsione[0]?.rischio?.[2]?.value ?? ""
          ) as LivelloRischio,
          vento: String(
            root.previsione[0]?.rischio?.[3]?.value ?? ""
          ) as LivelloRischio,
          neve: String(
            root.previsione[0]?.rischio?.[4]?.value ?? ""
          ) as LivelloRischio,
          ghiaccio: String(
            root.previsione[0]?.rischio?.[5]?.value ?? ""
          ) as LivelloRischio,
        },
        temperatura: {
          min: Number(root.previsione[0]?.temp?.[0] ?? 0),
          max: Number(root.previsione[0]?.temp?.[1] ?? 0),
        },
        umidita: Number(root.previsione[idx]?.um ?? 0),
        probabilitaPioggia: Number(root.previsione[idx]?.prob_rain ?? 0),
        alba: String(root.almanacco?.sole_sorge ?? ""),
        tramonto: String(root.almanacco?.sole_tramonta ?? ""),
        parteGiorno,
      };
    },
  };
}
```

- [ ] **Step 4: Esegui i test per vedere se passano**

Run: `npm test -- tests/services/meteo.test.ts`
Expected: 5 test, tutti PASS.

Se falliscono, analizza gli errori (probabilmente la struttura XML o l'accesso ai campi), correggi e riprova.

- [ ] **Step 5: Verifica che tutti i test passino**

Run: `npm test`
Expected: tutti i test passano (config + comuni + users + messaggi + meteo).

- [ ] **Step 6: Commit**

```bash
git add src/services/meteo.ts tests/services/meteo.test.ts
git commit -m "feat: add MeteoService (fetch + parse XML LAMMA → DatiMeteo)"
```

---

## Self-Review

**Spec coverage:**
- `formattaAllerta` → Task 1 ✓
- `formattaPrevisioni` → Task 1 ✓
- `formattaCompleto` → Task 1 ✓
- `ottieniUrlImmagine` → Task 1 ✓
- `createMeteoService` → Task 2 ✓
- `fetchDatiMeteo` → Task 2 ✓
- XML parsing con `fast-xml-parser` → Task 2 ✓
- `calcolaParteGiorno` → Task 2 ✓
- Errori di fetch/parse → Task 2 ✓
- Test con fixture XML e mock fetch → Task 2 ✓

**Placeholder scan:** nessun TBD/TODO — ogni step ha codice completo.

**Type consistency:** `DatiMeteo`, `ParteGiorno`, `LivelloAllerta`, `LivelloRischio` da `src/types/index.ts` (già esistenti). `MeteoService` interfaccia definita in Task 2. Nomi coerenti tra formatter e service.
