# Servizio allerta ondata di calore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere messaggio autonomo "Ondata di calore — Toscana" sugli stessi trigger delle allerte meteo esistenti.

**Architecture:** Nuovo servizio stateless `HeatWaveService` che fetcha CSV ondata-calore e restituisce dati strutturati. Nuovo helper `messaggioCalore()` in messages.ts produce il messaggio. `handleAllerta` e `broadcastNotifiche` lo inviano dopo i messaggi per-comune.

**Tech Stack:** TypeScript, grammY, Zod v4, Vitest

---

### Task 1: Tipi condivisi

**Files:**
- Modify: `src/types/index.ts:52`

- [ ] **Step 1: Aggiungi tipi in `src/types/index.ts`**

```ts
export type LivelloCalore = 0 | 1 | 2 | 3;
// 0=Verde(nessuna), 1=Gialla, 2=Arancione, 3=Rossa

export type RisultatoAllertaCalore =
  | {
      errore: false;
      dataEstrazione: string;
      oggi: { livello: LivelloCalore; url: string } | null;
      domani: { livello: LivelloCalore; url: string } | null;
    }
  | { errore: true };
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: aggiungi tipi LivelloCalore e RisultatoAllertaCalore"
```

---

### Task 2: Test servizio heatwave (failing)

**Files:**
- Create: `tests/services/heatwave.test.ts`

- [ ] **Step 1: Scrivi il test**

```ts
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

  it("oggi Livello0 domani Livello1: oggi livello 0, domani livello 1", async () => {
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

  it("body malformato restituisce errore: true", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/malformed");
    expect(r.errore).toBe(true);
  });

  it("rete down restituisce errore: true", async () => {
    const service = createHeatWaveService();
    const r = await service.fetchAllertaCalore(new Date(), "https://fake.url/network-error");
    expect(r.errore).toBe(true);
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run tests/services/heatwave.test.ts`
Expected: FAIL (module not found)

---

### Task 3: Implementa servizio heatwave

**Files:**
- Create: `src/services/heatwave.ts`

- [ ] **Step 1: Scrivi il servizio**

```ts
import type { RisultatoAllertaCalore } from "../types/index.js";

const CSV_URL = "https://raw.githubusercontent.com/ondata/ondate-calore/main/data/ondate-calore_latest.csv";

export interface HeatWaveService {
  fetchAllertaCalore(oggi?: Date, url?: string): Promise<RisultatoAllertaCalore>;
}

export function createHeatWaveService(): HeatWaveService {
  function oggiDomaniISO(ref: Date) {
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    const oggi = fmt(ref);
    const domani = fmt(new Date(ref.getTime() + 86400000));
    return { oggi, domani };
  }

  function parseLivello(s: string): number {
    switch (s) {
      case "Livello0": return 0;
      case "Livello1": return 1;
      case "Livello2": return 2;
      case "Livello3": return 3;
      default: return -1;
    }
  }

  return {
    fetchAllertaCalore: async (oggiDate?: Date, overrideUrl?: string): Promise<RisultatoAllertaCalore> => {
      try {
        const ref = oggiDate ?? new Date();
        const url = overrideUrl ?? CSV_URL;
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`Errore HTTP ${res.status} nel fetch del CSV ondata calore`);
          return { errore: true };
        }
        const text = await res.text();
        const lines = text.split("\n").filter(Boolean);
        if (lines.length < 2) {
          return { errore: false, dataEstrazione: "", oggi: null, domani: null };
        }

        const { oggi, domani } = oggiDomaniISO(ref);
        let oggiFound: { livello: number; url: string } | null = null;
        let domaniFound: { livello: number; url: string } | null = null;
        let dataEstrazione = "";

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 5) continue;
          const citta = cols[0].trim();
          const data = cols[1].trim();
          const livelloStr = cols[2].trim();
          const estrazione = cols[3].trim();
          const pdfUrl = cols[4].trim();

          if (citta !== "FIRENZE") continue;
          if (!dataEstrazione) dataEstrazione = estrazione;

          const livello = parseLivello(livelloStr);
          if (livello === -1) continue;

          if (data === oggi) {
            oggiFound = { livello, url: pdfUrl };
          } else if (data === domani) {
            domaniFound = { livello, url: pdfUrl };
          }
        }

        return { errore: false, dataEstrazione, oggi: oggiFound, domani: domaniFound };
      } catch (err) {
        console.error("Errore fetch/parse CSV ondata calore", err);
        return { errore: true };
      }
    },
  };
}
```

- [ ] **Step 2: Esegui i test**

Run: `npx vitest run tests/services/heatwave.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/services/heatwave.ts tests/services/heatwave.test.ts
git commit -m "feat: servizio ondata di calore (fetch CSV + parser)"
```

---

### Task 4: Test helper messaggioCalore

**Files:**
- Modify: `tests/bot/messages.test.ts`

- [ ] **Step 1: Aggiungi test per messaggioCalore, livelloCaloreToEmoji, livelloCaloreToNome**

```ts
import { messaggioCalore, livelloCaloreToEmoji, livelloCaloreToNome } from "../../src/bot/messages.js";
import type { RisultatoAllertaCalore } from "../../src/types/index.js";

describe("livelloCaloreToEmoji", () => {
  it("0→🟢, 1→🟡, 2→🟠, 3→🔴", () => {
    expect(livelloCaloreToEmoji(0)).toBe("🟢");
    expect(livelloCaloreToEmoji(1)).toBe("🟡");
    expect(livelloCaloreToEmoji(2)).toBe("🟠");
    expect(livelloCaloreToEmoji(3)).toBe("🔴");
  });
});

describe("livelloCaloreToNome", () => {
  it("0→Verde, 1→Gialla, 2→Arancione, 3→Rossa", () => {
    expect(livelloCaloreToNome(0)).toBe("Verde");
    expect(livelloCaloreToNome(1)).toBe("Gialla");
    expect(livelloCaloreToNome(2)).toBe("Arancione");
    expect(livelloCaloreToNome(3)).toBe("Rossa");
  });
});

describe("messaggioCalore", () => {
  const rAlert: RisultatoAllertaCalore = {
    errore: false,
    dataEstrazione: "2026-06-25",
    oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
    domani: { livello: 3, url: "https://salute.gov.it/bol.pdf" },
  };

  it("oggi e domani con allerta produce messaggio completo", () => {
    const msg = messaggioCalore(rAlert);
    expect(msg).not.toBeNull();
    expect(msg).toContain("Ondata di calore");
    expect(msg).toContain("Oggi: 🟠 Arancione");
    expect(msg).toContain("Domani: 🔴 Rossa");
    expect(msg).toContain("Bollettino calore");
    expect(msg).toContain("salute.gov.it/bol.pdf");
    expect(msg).toContain("2026-06-25");
  });

  it("solo oggi alert (domani Livello0)", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
    };
    const msg = messaggioCalore(r);
    expect(msg).not.toBeNull();
    expect(msg).toContain("Oggi: 🟠 Arancione");
    expect(msg).not.toContain("Domani:");
  });

  it("solo domani alert (oggi Livello0)", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 1, url: "https://salute.gov.it/bol.pdf" },
    };
    const msg = messaggioCalore(r);
    expect(msg).not.toBeNull();
    expect(msg).not.toContain("Oggi:");
    expect(msg).toContain("Domani: 🟡 Gialla");
  });

  it("entrambi Livello0 ritorna null", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
    };
    expect(messaggioCalore(r)).toBeNull();
  });

  it("errore: true produce messaggio di avviso", () => {
    const msg = messaggioCalore({ errore: true });
    expect(msg).not.toBeNull();
    expect(msg).toContain("Ondata di calore");
    expect(msg).toContain("non disponibili");
    expect(msg).not.toContain("Bollettino calore");
  });

  it("oggi=null domani=null ritorna null", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "",
      oggi: null, domani: null,
    };
    expect(messaggioCalore(r)).toBeNull();
  });
});
```

- [ ] **Step 2: Esegui test — expected FAIL**

Run: `npx vitest run tests/bot/messages.test.ts`
Expected: FAIL (messaggioCalore not imported)

---

### Task 5: Implementa helper in messages.ts

**Files:**
- Modify: `src/bot/messages.ts`

- [ ] **Step 1: Aggiungi helper export in `src/bot/messages.ts`** (dopo `escHtml`)

```ts
import type { DatiMeteo, ParteGiorno, RisultatoAllertaCalore, LivelloCalore } from "../types/index.js";

export function livelloCaloreToEmoji(l: LivelloCalore): string {
  const map: Record<number, string> = { 0: "🟢", 1: "🟡", 2: "🟠", 3: "🔴" };
  return map[l] ?? "⚪";
}

export function livelloCaloreToNome(l: LivelloCalore): string {
  const map: Record<number, string> = { 0: "Verde", 1: "Gialla", 2: "Arancione", 3: "Rossa" };
  return map[l] ?? "Sconosciuto";
}

export function messaggioCalore(r: RisultatoAllertaCalore): string | null {
  if (r.errore) {
    return `🌡️ <b>Ondata di calore — Toscana</b>\n\n⚠️ Dati ondata calore non disponibili`;
  }
  const righe: string[] = [];
  if (r.oggi && r.oggi.livello > 0) {
    righe.push(`Oggi: ${livelloCaloreToEmoji(r.oggi.livello)} ${livelloCaloreToNome(r.oggi.livello)}`);
  }
  if (r.domani && r.domani.livello > 0) {
    righe.push(`Domani: ${livelloCaloreToEmoji(r.domani.livello)} ${livelloCaloreToNome(r.domani.livello)}`);
  }
  if (righe.length === 0) return null;

  const url = r.oggi?.url ?? r.domani?.url ?? "";
  return (
    `🌡️ <b>Ondata di calore — Toscana</b>\n` +
    `<i>Aggiornamento: ${r.dataEstrazione}</i>\n\n` +
    righe.join("\n") + "\n\n" +
    `📄 <a href="${url}">Bollettino calore</a>`
  );
}
```

Also add `RisultatoAllertaCalore` and `LivelloCalore` to the existing import from `../types/index.js`.

- [ ] **Step 2: Esegui test — expected PASS**

Run: `npx vitest run tests/bot/messages.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/bot/messages.ts tests/bot/messages.test.ts
git commit -m "feat: helper messaggioCalore per ondata di calore"
```

---

### Task 6: Aggiorna handler on-demand

**Files:**
- Modify: `src/bot/handlers.ts:6,13,26-42`

- [ ] **Step 1: Aggiungi import e aggiorna BotServices e handleAllerta**

```ts
// line 5
import type { HeatWaveService } from "../services/heatwave.js";
// line 6
import { messages, costruisciAlbumImmagini, escHtml, messaggioCalore } from "./messages.js";

export interface BotServices {
  comuni: ArchivioComuni;
  users: UsersRepository;
  meteo: MeteoService;
  heatwave: HeatWaveService;
}
```

Update `handleAllerta`:
```ts
async function handleAllerta(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComunePrevisioni, { reply_markup: mainMenuKeyboard() });
    return;
  }
  const r = await services.heatwave.fetchAllertaCalore();
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(messages.allerta(dati), { reply_markup: mainMenuKeyboard() });
    } catch {
      await ctx.reply(messages.errore);
    }
  }
  const msgCalore = messaggioCalore(r);
  if (msgCalore) {
    await ctx.reply(msgCalore, { link_preview_options: { is_disabled: true } });
  }
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck` — expected PASS

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers.ts
git commit -m "feat: integra messaggio ondata calore in handleAllerta"
```

---

### Task 7: Aggiorna scheduler

**Files:**
- Modify: `src/bot/scheduler.ts:1-33`

- [ ] **Step 1: Aggiungi messaggioCalore e heatwave call**

```ts
import type { Bot } from "grammy";
import type { BotServices } from "./handlers.js";
import { messages, messaggioCalore } from "./messages.js";
import { mappeMeteoInlineKeyboard } from "./keyboards.js";

export async function broadcastNotifiche(
  bot: Bot,
  services: BotServices
): Promise<{ totali: number; inviati: number }> {
  const users = await services.users.findAllWithComuni();
  const r = await services.heatwave.fetchAllertaCalore();
  const msgCalore = messaggioCalore(r);
  let inviati = 0;

  for (const user of users) {
    for (const comune of user.comuni) {
      try {
        const dati = await services.meteo.fetchDatiMeteo(comune.url);
        const msg = comune.notificheMeteo
          ? messages.completo(dati)
          : messages.allerta(dati);
        const reply_markup = comune.notificheMeteo
          ? mappeMeteoInlineKeyboard()
          : undefined;
        await bot.api.sendMessage(user.idTelegram, msg, { link_preview_options: { is_disabled: true }, reply_markup });
        inviati++;
      } catch (err) {
        console.error("notifica fallita", { user: user.idTelegram, comune: comune.nome, err });
        continue;
      }
    }
    if (msgCalore) {
      try {
        await bot.api.sendMessage(user.idTelegram, msgCalore, { link_preview_options: { is_disabled: true } });
        inviati++;
      } catch (err) {
        console.error("notifica calore fallita", { user: user.idTelegram, err });
      }
    }
  }

  return { totali: users.length, inviati };
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck` — expected PASS

- [ ] **Step 3: Commit**

```bash
git add src/bot/scheduler.ts
git commit -m "feat: integra ondata calore in broadcastNotifiche schedulato"
```

---

### Task 8: Composition roots

**Files:**
- Modify: `src/index.ts:6-7,24-28`
- Modify: `src/dev.ts:5-6,10-14`

- [ ] **Step 1: Aggiungi import e istanza in `src/index.ts`**

```ts
import { createHeatWaveService } from "./services/heatwave.js";
// ...
  const services: BotServices = {
    comuni: createArchivioComuni(db),
    users: createUsersRepository(db),
    meteo: createMeteoService(),
    heatwave: createHeatWaveService(),
  };
```

- [ ] **Step 2: Aggiungi import e istanza in `src/dev.ts`**

```ts
import { createHeatWaveService } from "./services/heatwave.js";
// ...
const services = {
  comuni: createArchivioComuni(_db),
  users: createUsersRepository(_db),
  meteo: createMeteoService(),
  heatwave: createHeatWaveService(),
};
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck` — expected PASS

- [ ] **Step 4: Commit**

```bash
git add src/index.ts src/dev.ts
git commit -m "feat: composition root heatwave nei due entry point"
```

---

### Task 9: Aggiorna test scheduler

**Files:**
- Modify: `tests/bot/scheduler.test.ts`

- [ ] **Step 1: Aggiungi heatwave al mock e aggiorna assert**

```ts
describe("broadcastNotifiche", () => {
  it("invia messaggio per ogni comune + messaggio calore una volta per utente", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendMediaGroup = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage, sendMediaGroup } } as any;

    const fetchAllertaCalore = vi.fn().mockResolvedValue({
      errore: false,
      dataEstrazione: "2026-06-25",
      oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
      domani: null,
    } as const);

    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          {
            idTelegram: 1,
            comuni: [
              { url: "firenze", notificheMeteo: true },
              { url: "pisa", notificheMeteo: false },
            ],
          },
          {
            idTelegram: 2,
            comuni: [{ url: "siena", notificheMeteo: true }],
          },
        ]),
      },
      meteo: {
        fetchDatiMeteo: vi.fn().mockResolvedValue({
          comune: "Test",
          aggiornamento: "01/01/2026",
          allerta: "VERDE",
          rischi: {
            idraulico: "ASSENTE",
            idrogeologico: "ASSENTE",
            temporali: "ASSENTE",
            vento: "ASSENTE",
            neve: "ASSENTE",
            ghiaccio: "ASSENTE",
          },
          temperatura: { min: 10, max: 20 },
          temperaturaAttuale: 15,
          temperaturaPercepita: 14,
          uv: 4,
          quotaNeve: 2000,
          umidita: 50,
          probabilitaPioggia: 0,
          alba: "06:00",
          tramonto: "18:00",
          parteGiorno: "mattina",
        }),
      },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.totali).toBe(2);
    expect(result.inviati).toBe(5); // 3 comuni + 2 messaggi calore (uno per utente)
    expect(fetchAllertaCalore).toHaveBeenCalledTimes(1);
    expect(sendMediaGroup).not.toHaveBeenCalled();

    const expectedKeyboard = expect.objectContaining({
      inline_keyboard: [[
        { text: "🖼️ Mostra mappe meteo", callback_data: "img" },
      ]],
    });

    // meteo messages
    expect(sendMessage).toHaveBeenCalledWith(1, expect.any(String), expect.objectContaining({ reply_markup: expectedKeyboard }));
    expect(sendMessage).toHaveBeenCalledWith(1, expect.any(String), expect.objectContaining({ reply_markup: undefined }));
    expect(sendMessage).toHaveBeenCalledWith(2, expect.any(String), expect.objectContaining({ reply_markup: expectedKeyboard }));
    // calore messages
    expect(sendMessage).toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.objectContaining({ link_preview_options: { is_disabled: true } }));
    expect(sendMessage).toHaveBeenCalledWith(2, expect.stringContaining("Ondata di calore"), expect.objectContaining({ link_preview_options: { is_disabled: true } }));
  });

  it("nessun messaggio calore se messaggioCalore ritorna null", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;

    const fetchAllertaCalore = vi.fn().mockResolvedValue({
      errore: false,
      dataEstrazione: "2026-06-25",
      oggi: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
    } as const);

    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          {
            idTelegram: 1,
            comuni: [{ url: "firenze", notificheMeteo: true }],
          },
        ]),
      },
      meteo: {
        fetchDatiMeteo: vi.fn().mockResolvedValue({
          comune: "Test",
          aggiornamento: "01/01/2026",
          allerta: "VERDE",
          rischi: {
            idraulico: "ASSENTE",
            idrogeologico: "ASSENTE",
            temporali: "ASSENTE",
            vento: "ASSENTE",
            neve: "ASSENTE",
            ghiaccio: "ASSENTE",
          },
          temperatura: { min: 10, max: 20 },
          temperaturaAttuale: 15,
          temperaturaPercepita: 14,
          uv: 4,
          quotaNeve: 2000,
          umidita: 50,
          probabilitaPioggia: 0,
          alba: "06:00",
          tramonto: "18:00",
          parteGiorno: "mattina",
        }),
      },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.inviati).toBe(1); // solo meteo, no calore
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.anything());
  });
});
```

- [ ] **Step 2: Esegui test**

Run: `npx vitest run tests/bot/scheduler.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/bot/scheduler.test.ts
git commit -m "test: aggiorna test scheduler per ondata calore"
```

---

### Task 10: README aggiornamenti

**Files:**
- Modify: `README.md` multiple sections

- [ ] **Step 1: Aggiorna sezioni come da spec**

1. **"Funzionalità"** — aggiungi bullet ondata calore
2. **"Fonti dati"** — nuova sezione per CSV ondata calore + colonne + scala livelli
3. **"Struttura del progetto"** — aggiungi `src/services/heatwave.ts` e tipo
4. **"Notifiche programmate"** — correggi cron stale e menziona calore

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: aggiorna README per servizio ondata calore e fix cron"
```

---

### Task 11: Verifica finale

- [ ] **Step 1: typecheck + test**

Run: `npm run typecheck && npm test`
Expected: entrambi PASS

- [ ] **Step 2: Se tutto ok, commit finale**

```bash
git add -A
git commit -m "chore: verifica finale feat ondata calore"
```
