# Bot + Scheduler + Bootstrap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Bot Telegram grammY su Cloudflare Workers con webhook, stateless via callback_data, notifiche programmate via Cron Triggers, dual-mode dev/prod.

**Architecture:** Refactor config/db a factory. `src/bot/bot.ts` crea Bot + registra handlers. `src/index.ts` Worker entry (fetch + scheduled). `src/dev.ts` Node entry (polling). Scheduler itera utenti, fetch LAMMA, invia.

**Tech Stack:** TypeScript, grammY, Drizzle ORM, `@libsql/client`, `fast-xml-parser`, `wrangler`, vitest.

---

## File Structure

| File | Azione | Dipende da |
|---|---|---|
| `src/config.ts` | Riscrivi | — |
| `src/db/index.ts` | Riscrivi | config |
| `src/bot/strings.ts` | Crea | — |
| `src/bot/keyboards.ts` | Crea | strings |
| `src/bot/handlers.ts` | Crea | services, keyboards, strings |
| `src/bot/bot.ts` | Crea | handlers |
| `src/bot/scheduler.ts` | Crea | services, strings |
| `src/dev.ts` | Crea | bot, config, db |
| `src/index.ts` | Crea | bot, scheduler |
| `wrangler.toml` | Crea | — |
| `package.json` | Modifica | — |

---

### Task 1: Refactor config.ts a factory

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Riscrivi `src/config.ts`**

```ts
import "dotenv/config";
import { z } from "zod";

export const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN è obbligatorio"),
  ADMIN_CHAT_ID: z.string().min(1, "ADMIN_CHAT_ID è obbligatorio"),
  TURSO_DATABASE_URL: z.string().min(1, "TURSO_DATABASE_URL è obbligatorio"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN è obbligatorio"),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

export type Config = z.infer<typeof envSchema>;

export function createConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    console.error("❌ Variabili d'ambiente mancanti o non valide:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

// Lazy singleton per Node.js (backward compat)
let _config: Config | undefined;
export function getConfig(): Config {
  if (!_config) _config = createConfig(process.env);
  return _config;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "refactor(config): factory createConfig + lazy singleton getConfig"
```

---

### Task 2: Refactor db/index.ts a factory

**Files:**
- Modify: `src/db/index.ts`

- [ ] **Step 1: Riscrivi `src/db/index.ts`**

```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";
import type { Config } from "../config.js";

export function createDb(config: Config) {
  const client = createClient({
    url: config.TURSO_DATABASE_URL,
    authToken: config.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

// Lazy singleton per Node.js (backward compat)
import { getConfig } from "../config.js";
let _db: ReturnType<typeof createDb> | undefined;
export function getDb(): ReturnType<typeof createDb> {
  if (!_db) _db = createDb(getConfig());
  return _db;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 3: Aggiorna i consumer di `db`**

Nei file che usano `import { db } from "../db/index.js"`, sostituisci con `import { getDb } from "../db/index.js"` e chiama `getDb()`.

**Modifica `scripts/seed-comuni.ts`:**
```ts
import { getDb } from "../src/db/index.js";
// change `import { db }` to `import { getDb }`
// change `db.insert(...)` to `getDb().insert(...)`
```

Modifica uno a uno gli import.

- [ ] **Step 4: Verifica che `npm test` passi**

Run: `npm test`
Expected: tutti i test passano (37 test).

- [ ] **Step 5: Commit**

```bash
git add src/db/index.ts scripts/seed-comuni.ts
git commit -m "refactor(db): factory createDb + lazy singleton getDb"
```

---

### Task 3: stringhe + tastiere

**Files:**
- Create: `src/bot/strings.ts`
- Create: `src/bot/keyboards.ts`

- [ ] **Step 1: Crea `src/bot/strings.ts`**

```ts
export const strings = {
  welcome: "Benvenuto/a in Allerta Meteo Toscana Bot!\nSeleziona una voce dal menu o usa i comandi.",
  credits: `Servizio di notifica allerta e previsioni meteo realizzato da @DaniZ97 basato sui dati resi liberamente disponibili a tutti i cittadini dal consorzio LAMMA.`,
  impostaPrompt: "Scrivi il nome del comune (es. /imposta pisa) oppure parte del nome per cercarlo.",
  impostaNonTrovato: "Nessun comune trovato con quel nome. Riprova.",
  impostaConferma: (comune: string) =>
    `Vuoi ricevere anche le informazioni meteo per ${comune} insieme alle notifiche di allerta?`,
  impostaOk: (comune: string) =>
    `Ok! Riceverai notifiche per ${comune}`,
  impostaOkAllerta: (comune: string) =>
    `Ok! Riceverai notifiche per ${comune}. Ti avviserò anche delle condizioni meteo.`,
  nonIscritto: "Non hai ancora impostato un comune. Usa /imposta per iniziare.",
  iscrittoMultiplo: (comune: string) =>
    `Iscrizione aggiornata per ${comune}.`,
  allerta: (dati: string) => dati,
  previsioni: (dati: string) => dati,
  errore: "Si è verificato un errore. Riprova più tardi.",
};
```

- [ ] **Step 2: Crea `src/bot/keyboards.ts`**

```ts
import { Keyboard } from "grammy";

export function mainMenuKeyboard() {
  return new Keyboard()
    .text("Aggiorna allerta").text("Aggiorna meteo").row()
    .text("Imposta comune").text("Credits&Info").row()
    .resized();
}

export function comuniInlineKeyboard(
  comuni: Array<{ nome: string; url: string; provincia: string }>
) {
  return {
    inline_keyboard: comuni.map((c) => [
      {
        text: `${c.nome} (${c.provincia})`,
        callback_data: `sel:${c.url}:${c.nome}`,
      },
    ]),
  };
}

export function confermaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "SI", callback_data: `sub:${url}:${nome}:1` },
        { text: "NO", callback_data: `sub:${url}:${nome}:0` },
      ],
    ],
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/bot/strings.ts src/bot/keyboards.ts
git commit -m "feat: add bot strings and keyboards (custom + inline)"
```

---

### Task 4: Handler stateless + bot factory

**Files:**
- Create: `src/bot/handlers.ts`
- Create: `src/bot/bot.ts`

- [ ] **Step 1: Crea `src/bot/handlers.ts`**

```ts
import type { Bot, Context } from "grammy";
import type { ArchivioComuni } from "../services/comuni.js";
import type { UsersRepository } from "../services/users.js";
import type { MeteoService } from "../services/meteo.js";
import { formattaAllerta, formattaPrevisioni, formattaCompleto } from "../services/messaggi.js";
import { strings } from "./strings.js";
import { mainMenuKeyboard, comuniInlineKeyboard, confermaInlineKeyboard } from "./keyboards.js";

export interface BotServices {
  comuni: ArchivioComuni;
  users: UsersRepository;
  meteo: MeteoService;
}

export function registerHandlers(bot: Bot, services: BotServices) {
  // --- Comandi ---
  bot.command("start", async (ctx) => {
    await ctx.reply(strings.welcome, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("credits", async (ctx) => {
    await ctx.reply(strings.credits, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("annulla", async (ctx) => {
    await ctx.reply("Operazione annullata.", { reply_markup: mainMenuKeyboard() });
  });

  // Aggiorna allerta
  bot.hears("Aggiorna allerta", (ctx) => handleAllerta(ctx, services));
  bot.command("allerta", (ctx) => handleAllerta(ctx, services));

  // Aggiorna meteo / previsioni
  bot.hears("Aggiorna meteo", (ctx) => handlePrevisioni(ctx, services));
  bot.command("previsioni", (ctx) => handlePrevisioni(ctx, services));

  // Imposta comune
  bot.hears("Imposta comune", async (ctx) => {
    await ctx.reply(strings.impostaPrompt);
  });
  bot.command("imposta", async (ctx) => {
    const text = ctx.match?.trim() ?? "";
    if (!text) {
      await ctx.reply(strings.impostaPrompt);
      return;
    }
    const risultati = await services.comuni.searchByPrefix(text);
    if (risultati.length === 0) {
      await ctx.reply(strings.impostaNonTrovato);
      return;
    }
    await ctx.reply("Comuni trovati:", {
      reply_markup: comuniInlineKeyboard(risultati),
    });
  });

  // Credits
  bot.hears("Credits&Info", async (ctx) => {
    await ctx.reply(strings.credits, { reply_markup: mainMenuKeyboard() });
  });

  // --- Callback query ---
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parts = data.split(":");
    const action = parts[0];

    if (action === "sel") {
      // sel:url:nome → chiedi conferma notifiche meteo
      const [, url, nome] = parts;
      await ctx.editMessageText(strings.impostaConferma(nome), {
        reply_markup: confermaInlineKeyboard(url, nome),
      });
      return;
    }

    if (action === "sub") {
      // sub:url:nome:flag → iscrivi
      const [, url, nome, flagRaw] = parts;
      const notificheMeteo = flagRaw === "1";
      await ctx.editMessageText(strings.impostaPrompt);

      const idTelegram = ctx.from?.id;
      if (!idTelegram) return;

      await services.users.subscribe({
        idTelegram,
        usernameTelegram: ctx.from?.username ?? null,
        nomeTelegram: ctx.from?.first_name ?? "",
        comune: { nome, url },
        notificheMeteo,
      });

      const msg = notificheMeteo
        ? strings.impostaOkAllerta(nome)
        : strings.impostaOk(nome);
      await ctx.reply(msg, { reply_markup: mainMenuKeyboard() });
      return;
    }
  });

  // --- Help ---
  bot.help(async (ctx) => {
    await ctx.reply(
      "Comandi disponibili:\n/allerta — Ricevi l'allerta meteo\n" +
      "/previsioni — Ricevi le previsioni\n/imposta <nome> — Imposta un comune\n" +
      "/credits — Info sul servizio\n/annulla — Annulla operazione"
    );
  });
}
```

- [ ] **Step 2: Crea `src/bot/handlers.ts` — aggiungi funzioni helper**

Aggiungi le funzioni `handleAllerta` e `handlePrevisioni` nello stesso file, prima di `registerHandlers`:

```ts
async function handleAllerta(ctx: Context, services: BotServices) {
  // ... findByTelegramId, fetchMeteo, formatta, reply
}

async function handlePrevisioni(ctx: Context, services: BotServices) {
  // ...
}
```

- [ ] **Step 3: Crea `src/bot/bot.ts`**

```ts
import { Bot } from "grammy";
import type { Config } from "../config.js";
import { registerHandlers, type BotServices } from "./handlers.js";

export function createBot(config: Config, services: BotServices) {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  registerHandlers(bot, services);
  return bot;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add src/bot/handlers.ts src/bot/bot.ts
git commit -m "feat: add bot handlers and factory"
```

---

### Task 5: Handler implementazione

**Files:**
- Modify: `src/bot/handlers.ts`

- [ ] **Step 1: Implementa `handleAllerta` e `handlePrevisioni`**

Aggiungi le funzioni helper nel file `handlers.ts`. La funzione `handleAllerta` fa:
1. `users.findByTelegramId(ctx.from.id)` — se undefined, risponde "non iscritto"
2. Per ogni comune dell'utente: `meteo.fetchDatiMeteo(comune.url)` → `formattaAllerta(dati)` → `ctx.reply(msg, { reply_markup: mainMenuKeyboard() })`

`handlePrevisioni` fa lo stesso con `formattaPrevisioni`.

Implementazione:

```ts
import type { Context } from "grammy";

async function handleAllerta(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user) {
    await ctx.reply(strings.nonIscritto, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(formattaAllerta(dati), { reply_markup: mainMenuKeyboard() });
    } catch {
      await ctx.reply(strings.errore);
    }
  }
}

async function handlePrevisioni(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user) {
    await ctx.reply(strings.nonIscritto, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(formattaPrevisioni(dati), { reply_markup: mainMenuKeyboard() });
    } catch {
      await ctx.reply(strings.errore);
    }
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers.ts
git commit -m "feat: implement handleAllerta and handlePrevisioni with per-comune loop"
```

---

### Task 6: Scheduler notifiche

**Files:**
- Create: `src/bot/scheduler.ts`
- Create: `tests/bot/scheduler.test.ts`

- [ ] **Step 1: Crea `src/bot/scheduler.ts`**

```ts
import type { Bot } from "grammy";
import type { BotServices } from "./handlers.js";
import { formattaAllerta, formattaCompleto } from "../services/messaggi.js";

export async function broadcastNotifiche(
  bot: Bot,
  services: BotServices
): Promise<{ totali: number; inviati: number }> {
  const users = await services.users.findAllWithComuni();
  let inviati = 0;

  for (const user of users) {
    for (const comune of user.comuni) {
      try {
        const dati = await services.meteo.fetchDatiMeteo(comune.url);
        const msg = comune.notificheMeteo
          ? formattaCompleto(dati)
          : formattaAllerta(dati);
        await bot.api.sendMessage(user.idTelegram, msg);
        inviati++;
      } catch {
        // Salta utente con errore, continua con gli altri
        continue;
      }
    }
  }

  return { totali: users.length, inviati };
}
```

- [ ] **Step 2: Crea `tests/bot/scheduler.test.ts`**

Test con mock services per verificare che `broadcastNotifiche` iteri utenti e comuni e chiami `sendMessage`.

```ts
import { describe, it, expect, vi } from "vitest";
import { broadcastNotifiche } from "../../src/bot/scheduler.js";

describe("broadcastNotifiche", () => {
  it("invia messaggio per ogni comune di ogni utente", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;

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
          rischi: {},
          temperatura: { min: 10, max: 20 },
          temperaturaAttuale: 15,
          temperaturaPercepita: 14,
          umidita: 50,
          probabilitaPioggia: 0,
          alba: "06:00",
          tramonto: "18:00",
          parteGiorno: "mattina",
        }),
      },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.totali).toBe(2);
    expect(result.inviati).toBe(3);
    expect(sendMessage).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 3: Esegui i test**

Run: `npm test -- tests/bot/scheduler.test.ts`
Expected: 1 test, PASS.

- [ ] **Step 4: Commit**

```bash
git add src/bot/scheduler.ts tests/bot/scheduler.test.ts
git commit -m "feat: add broadcastNotifiche scheduler and test"
```

---

### Task 7: Entry points (dev + Worker)

**Files:**
- Create: `src/dev.ts`
- Create: `src/index.ts`
- Create: `wrangler.toml`
- Modify: `package.json`

- [ ] **Step 1: Crea `src/dev.ts`**

```ts
import { getConfig } from "./config.js";
import { getDb } from "./db/index.js";
import { createArchivioComuni } from "./services/comuni.js";
import { createUsersRepository } from "./services/users.js";
import { createMeteoService } from "./services/meteo.js";
import { createBot } from "./bot/bot.js";

const config = getConfig();
const db = getDb();
const services = {
  comuni: createArchivioComuni(db),
  users: createUsersRepository(db),
  meteo: createMeteoService(),
};
const bot = createBot(config, services);

console.log("Bot avviato in polling...");
bot.start();
```

- [ ] **Step 2: Crea `src/index.ts`**

```ts
import type { Update } from "grammy";
import type { Bot } from "grammy";
import type { BotServices } from "./bot/handlers.js";
import { createConfig } from "./config.js";
import { createDb } from "./db/index.js";
import { createArchivioComuni } from "./services/comuni.js";
import { createUsersRepository } from "./services/users.js";
import { createMeteoService } from "./services/meteo.js";
import { createBot } from "./bot/bot.js";
import { broadcastNotifiche } from "./bot/scheduler.js";
import type { Config } from "./config.js";

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  NODE_ENV: string;
}

let initialized: { bot: Bot; services: BotServices; config: Config } | null = null;

function initialize(env: Env) {
  if (initialized) return initialized;
  const config = createConfig(env);
  const db = createDb(config);
  const services: BotServices = {
    comuni: createArchivioComuni(db),
    users: createUsersRepository(db),
    meteo: createMeteoService(),
  };
  const bot = createBot(config, services);
  initialized = { bot, services, config };
  return initialized;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { bot } = initialize(env);
    const update = await request.json() as Update;
    await bot.handleUpdate(update);
    return new Response("OK");
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const { bot, services } = initialize(env);
    await broadcastNotifiche(bot, services);
  },
};
```

- [ ] **Step 3: Crea `wrangler.toml`**

```toml
name = "allerta-meteo-toscana-bot"
main = "src/index.ts"
compatibility_date = "2026-06-22"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "production"

[triggers]
crons = ["30 9,15 * * *"]
```

- [ ] **Step 4: Aggiorna `package.json`**

Aggiungi `wrangler` a `devDependencies`:
```bash
npm install --save-dev wrangler
```

Aggiorna script:
```json
"dev": "tsx watch src/dev.ts",
"start": "tsx src/dev.ts",
"deploy": "wrangler deploy",
```

Rimuovi `node-cron`:
```bash
npm uninstall node-cron @types/node-cron
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 6: Verifica tutti i test**

Run: `npm test`
Expected: tutti passano (compresi scheduler test).

- [ ] **Step 7: Commit**

```bash
git add src/dev.ts src/index.ts wrangler.toml package.json package-lock.json
git rm src/logger.ts  # Se pino-pretty non più usato
git commit -m "feat: add Worker entry, dev entry, wrangler config, remove node-cron"
```

---

## Self-Review

**Spec coverage:**
- Config factory → Task 1 ✓
- DB factory → Task 2 ✓
- strings/keyboards → Task 3 ✓
- Handler stateless con callback_data → Task 4-5 ✓
- Scheduler broadcast → Task 6 ✓
- Entry point Worker (fetch + scheduled) → Task 7 ✓
- Entry point dev (polling) → Task 7 ✓
- wrangler.toml → Task 7 ✓
- package.json update → Task 7 ✓

**Placeholder scan:** nessun TBD/TODO.

**Type consistency:** `BotServices` interfaccia in handlers.ts, `Config` da config.ts, `Env` in index.ts. `createBot` prende Config + BotServices. Nomi coerenti.
