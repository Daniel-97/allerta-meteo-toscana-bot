# Integrazione Turso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire SQLite/better-sqlite3 con Turso (`@libsql/client`) come database gestito, mantenendo Drizzle ORM e lo schema esistente invariato.

**Architecture:** 3 layer invariati (`config` → `db client` → consumer). Si scambia solo il driver: `better-sqlite3` (sync) → `@libsql/client` (async, remoto Turso). Lo schema `src/db/schema.ts` non si tocca (Turso è drop-in per SQLite). Le migrazioni si applicano via CLI manuale (`drizzle-kit migrate`, dialect `turso`).

**Tech Stack:** TypeScript (NodeNext, strict), Drizzle ORM, `@libsql/client` (Turso), grammY, vitest, tsx, drizzle-kit.

## Global Constraints

- **SDK:** `@libsql/client` (Turso, async, fetch-based) sostituisce `better-sqlite3`. Rimuovere anche `@types/better-sqlite3`.
- **Ambiente:** dev e prod entrambi su Turso remoto (`libsql://…` + auth token). Nessun file DB locale.
- **Env vars:** `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` obbligatori anche in dev. Credenziali già pronte (l'utente le mette in `.env`, gitignored). Rimuovere `DATABASE_PATH`.
- **Schema invariato:** `src/db/schema.ts` non si modifica (tabelle `utenti`, `utenti_comuni`, `sessioni` con FK cascade, unique, timestamp).
- **Migrazioni:** CLI manuale (`npm run db:migrate` / drizzle-kit migrate). Nessun `migrate()` programmatico all'avvio.
- **Pragma:** nessun pragma nel client (Turso gestisce WAL internamente; `foreign_keys = ON` è il default su libSQL).
- **Test DB harness out of scope:** niente `createTestDb()`/migrazioni-in-test ora. Solo smoke test minimale `:memory:` + e2e Turso.
- **Module system:** ESM NodeNext, import path con estensione `.js`.
- **envSchema resta in `src/config.ts`** (niente split in file separato, come da scelta utente). Il test usa dynamic import + mock di `process.env` in `beforeAll` per evitare `process.exit(1)` durante i test.
- **Typecheck baseline (pre-esistente):** il branch `redesign-typescript` ha 2 errori `TS6059` pre-esistenti in `tsconfig.json` (rootDir `src` in conflitto con `include: ["src/**/*", "tests/**/*", "drizzle.config.ts"]`). Verificato al baseline `80d5965`. Tutti gli step `npx tsc --noEmit` di questo piano si intendono come "0 errori nuovi introdotti dal task", non "0 errori assoluti". Il fix di `tsconfig.json` è fuori scope e va tracciato come follow-up separato.

## File Structure

| File | Azione | Responsabilità |
|---|---|---|
| `.env.example` | Modifica | Template variabili d'ambiente (TURSO_*) |
| `.env` | Modifica (locale, gitignored) | Credenziali reali Turso (riempite dall'utente) |
| `.gitignore` | Modifica | Rimuove righe `data/*.db*` obsolete + dedup `.env` |
| `tests/config.test.ts` | **Crea** | Unit test TDD dello schema Zod (dynamic import) |
| `src/config.ts` | Riscrivi | Eager parse + exit, esporta `config` + `envSchema` |
| `src/db/index.ts` | Riscrivi | Client `@libsql/client` + `drizzle-orm/libsql` + `config.TURSO_*`; esporta singleton `db` |
| `package.json` | Modifica (via npm) | Aggiungi `@libsql/client`, rimuovi `better-sqlite3` + `@types/better-sqlite3` |
| `drizzle.config.ts` | Riscrivi | `dialect: "turso"` + `dotenv/config` + credenziali Turso |
| `src/db/migrations/*` | **Genera** | Primo migration snapshot dallo schema (3 tabelle) |
| `src/db/schema.ts` | Invariato | — |

---

### Task 1: Variabili d'ambiente & gitignore

**Files:**
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `.env` (locale, gitignored — l'utente riempie i valori reali)

**Interfaces:**
- Produces: `.env.example` con `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`; `.gitignore` pulito.

- [ ] **Step 1: Riscrivi `.env.example`**

```
TELEGRAM_BOT_TOKEN=
ADMIN_CHAT_ID=
TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io
TURSO_AUTH_TOKEN=
NODE_ENV=development
```

- [ ] **Step 2: Riscrivi `.gitignore`** (rimuovi righe `data/*.db*` e il `.env` duplicato)

```
node_modules/
dist/
.env
log/
*.js.map
```

- [ ] **Step 3: Aggiorna `.env` locale con le nuove variabili Turso**

Sostituisci `DATABASE_PATH=data/bot.db` con:
```
TURSO_DATABASE_URL=<incolla il tuo URL Turso reale>
TURSO_AUTH_TOKEN=<incolla il tuo token Turso reale>
```
(Valori reali forniti dall'utente; il file è gitignored.)

- [ ] **Step 4: Verifica**

Run: `git status --short`
Expected: `.env.example` e `.gitignore` modificati; `.env` NON listato (gitignored).

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: switch env vars to Turso credentials and clean gitignore"
```

---

### Task 2: Swap DB layer a Turso (TDD su config schema)

**Files:**
- Create: `tests/config.test.ts`
- Rewrite: `src/config.ts`
- Rewrite: `src/db/index.ts`
- Modify: `package.json` (via `npm install`/`uninstall`)

**Interfaces:**
- Consumes: `.env.example` var names (Task 1)
- Produces: `config` con `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` ed `envSchema` esportato (da `src/config.ts`); singleton `db` Drizzle su Turso (da `src/db/index.ts`); dipendenza `@libsql/client`

- [ ] **Step 1: Installa `@libsql/client`**

Run: `npm install @libsql/client`
Expected: `@libsql/client` aggiunto a `dependencies` in `package.json`. (`better-sqlite3` ancora presente, inattivo.)

- [ ] **Step 2: Scrivi il test fallente**

Crea `tests/config.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.TELEGRAM_BOT_TOKEN = "token";
  process.env.ADMIN_CHAT_ID = "123";
  process.env.TURSO_DATABASE_URL = "libsql://db-org.turso.io";
  process.env.TURSO_AUTH_TOKEN = "auth-token";
  process.env.NODE_ENV = "development";
});

describe("envSchema", () => {
  it("accetta env valide con tutte le variabili Turso", async () => {
    const { envSchema } = await import("../src/config.js");
    const res = envSchema.safeParse({
      TELEGRAM_BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "123",
      TURSO_DATABASE_URL: "libsql://db-org.turso.io",
      TURSO_AUTH_TOKEN: "auth-token",
      NODE_ENV: "development",
    });
    expect(res.success).toBe(true);
  });

  it("respinge se manca TURSO_DATABASE_URL", async () => {
    const { envSchema } = await import("../src/config.js");
    const res = envSchema.safeParse({
      TELEGRAM_BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "123",
      TURSO_AUTH_TOKEN: "auth-token",
    });
    expect(res.success).toBe(false);
  });

  it("respinge se TURSO_AUTH_TOKEN è vuoto", async () => {
    const { envSchema } = await import("../src/config.js");
    const res = envSchema.safeParse({
      TELEGRAM_BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "123",
      TURSO_DATABASE_URL: "libsql://db-org.turso.io",
      TURSO_AUTH_TOKEN: "",
      NODE_ENV: "development",
    });
    expect(res.success).toBe(false);
  });
});
```

- [ ] **Step 3: Verifica che il test fallisca**

Run: `npm test -- tests/config.test.ts`
Expected: FAIL — `envSchema` non è esportato da `src/config.ts` (oppure errore di import a causa di `DATABASE_PATH` mancante in `.env`).

- [ ] **Step 4: Riscrivi `src/config.ts`**

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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variabili d'ambiente mancanti o non valide:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
```

- [ ] **Step 5: Verifica che il test passi**

Run: `npm test -- tests/config.test.ts`
Expected: PASS — 3 test superati.

- [ ] **Step 6: Riscrivi `src/db/index.ts`**

```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "../config.js";
import * as schema from "./schema.js";

const client = createClient({
  url: config.TURSO_DATABASE_URL,
  authToken: config.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 7: Rimuovi `better-sqlite3` e i suoi tipi**

Run: `npm uninstall better-sqlite3 @types/better-sqlite3`
Expected: entrambi rimossi da `package.json` (`dependencies` e `devDependencies`).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori. (Nessun riferimento residuo a `better-sqlite3`, `DATABASE_PATH` o pragma.)

- [ ] **Step 9: Smoke test `:memory:`** (verifica indipendente dal runtime che `@libsql/client` + `drizzle-orm/libsql` funzionino nell'ambiente)

Run:
```bash
npx tsx -e "(async () => { const { createClient } = await import('@libsql/client'); const { drizzle } = await import('drizzle-orm/libsql'); const { sql } = await import('drizzle-orm'); const c = createClient({ url: ':memory:' }); const d = drizzle(c); const r = await d.all(sql\`SELECT 1 AS n\`); console.log('smoke OK', JSON.stringify(r[0])); })()"
```
Expected: `smoke OK {"n":1}`

Nota: Drizzle 0.45 con adapter `drizzle-orm/libsql` espone `.all()` / `.get()` / `.run()` per le raw SQL query, non `.execute()` (l'API `.execute()` esiste solo per i query builder dei driver sync come D1/workers).

- [ ] **Step 10: Commit**

```bash
git add src/config.ts src/db/index.ts tests/config.test.ts package.json package-lock.json
git commit -m "feat: swap DB layer from better-sqlite3 to Turso (@libsql/client)"
```

---

### Task 3: Drizzle Kit config (dialect turso) & prima migrazione

**Files:**
- Rewrite: `drizzle.config.ts`
- Generate: `src/db/migrations/*`

**Interfaces:**
- Consumes: `src/db/schema.ts` (invariato), env vars `TURSO_*` via dotenv
- Produces: `drizzle.config.ts` con dialect turso; migration snapshot in `src/db/migrations/` (CREATE TABLE per `utenti`, `utenti_comuni`, `sessioni`)

- [ ] **Step 1: Riscrivi `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

- [ ] **Step 2: Genera la prima migrazione** (offline: legge lo schema, scrive SQL, non contatta Turso)

Run: `npm run db:generate`
Expected: output del tipo `[✓] Your SQL migration file ➔ src/db/migrations/0000_*.sql` e creazione di `src/db/migrations/meta/`.

- [ ] **Step 3: Verifica il contenuto della migrazione**

Run: `ls src/db/migrations`
Expected: un file `0000_<hash>.sql` + directory `meta/`.

Apri `src/db/migrations/0000_*.sql` e verifica la presenza di:
- `CREATE TABLE "utenti" (id_telegram INTEGER PRIMARY KEY, username_telegram TEXT, nome_telegram TEXT NOT NULL, creato_il INTEGER)`
- `CREATE TABLE "utenti_comuni" (...)` con `FOREIGN KEY (id_telegram) REFERENCES utenti(id_telegram) ON DELETE CASCADE` + `CREATE UNIQUE INDEX` su `(id_telegram, comune_url)`
- `CREATE TABLE "sessioni" (key TEXT PRIMARY KEY, value TEXT NOT NULL)`

- [ ] **Step 4: Typecheck** (tsconfig include `drizzle.config.ts`)

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts src/db/migrations
git commit -m "feat: configure drizzle-kit for Turso dialect and generate first migration"
```

---

### Task 4: Applica la migrazione a Turso & smoke test end-to-end

**Files:** nessuna modifica a file (verifica su DB remoto + runtime)

**Interfaces:**
- Consumes: `drizzle.config.ts`, `src/db/migrations/*`, `.env` con credenziali reali, singleton `db` da `src/db/index.ts`

- [ ] **Step 1: Verifica pre-condizione — DB Turso remoto vuoto**

Se hai la Turso CLI:
Run: `turso db shell <nome-db> ".tables"`
Expected: nessuna tabella utente (DB vuoto). Se vuoto → vai a Step 2.
Se il DB ha già tabelle, o non hai la CLI: procedi al Step 2 e gestisci l'errore (Step 2b).

- [ ] **Step 2: Applica la migrazione**

Run: `npm run db:migrate`
Expected: migrazione applicata senza errori (drizzle-kit connette al DB Turso via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` e crea le 3 tabelle).

- [ ] **Step 2b (fallback): se `db:migrate` fallisce con "table already exists"**

Il DB remoto non è vuoto. Usa push (applica lo schema direttamente, senza journal migrazioni):
Run: `npx drizzle-kit push`
Expected: schema sincronizzato, nessun errore. (Nota: con `push` il journal migrazioni non viene aggiornato — accettabile per questo caso.)

- [ ] **Step 3: Verifica che le tabelle esistano su Turso**

Con Turso CLI:
Run: `turso db shell <nome-db> ".tables"`
Expected: `utenti  utenti_comuni  sessioni` (più eventuali `libsql_*` / `_cf_KV` di sistema).

- [ ] **Step 4: Smoke test end-to-end contro Turso** (verifica il singleton `db` reale)

Run:
```bash
npx tsx -e "(async () => { const { db } = await import('./src/db/index.js'); const { sql } = await import('drizzle-orm'); const r = await db.all(sql\`SELECT 1 AS n\`); console.log('Turso OK', JSON.stringify(r[0])); })()"
```
Expected: `Turso OK {"n":1}` (prova che config + client + credenziali + connessione di rete a Turso funzionano end-to-end).

Nota: stesso caveat di Task 2 Step 9 — usare `.all()` non `.execute()`.

- [ ] **Step 5: Verifica finale**

Run: `npm test`
Expected: tutti i test passano (almeno i 3 di `config.test.ts`).

- [ ] **Step 6: Nessun commit**

Questo task non modifica file (verifica su DB remoto + runtime). Se al Step 2b hai usato `push`, verifica che `src/db/migrations` sia coerente con lo stato del DB per futuri `db:migrate`.

---

## Self-Review

**Spec coverage:**
- Dipendenze swap (package.json) → Task 2 Step 1, 7 ✓
- Env vars Turso (.env/.env.example) → Task 1 ✓
- .gitignore pulizia → Task 1 Step 2 ✓
- Config Zod (rimuovi DATABASE_PATH, aggiungi TURSO_*) → Task 2 Step 4 ✓
- Client DB async (@libsql/client, niente pragma) → Task 2 Step 6 ✓
- drizzle.config dialect turso + dotenv → Task 3 Step 1 ✓
- Schema invariato → dichiarato nei constraints, nessun task lo tocca ✓
- Migrazioni CLI manuale + pre-condizione stato DB → Task 4 Step 1, 2, 2b ✓
- Smoke e2e (ping SELECT 1) → Task 4 Step 4 ✓
- :memory: smoke (verifica libsql+drizzle) → Task 2 Step 9 ✓
- Fuori scope (handlers/services, legacy, test harness) → non presenti nel piano ✓

**Placeholder scan:** nessun TBD/TODO; tutti gli step contengono codice o comandi esatti.

**Type consistency:** `envSchema` (Task 2 Step 4) usato in `config.ts` (Step 4) e nel test (Step 2) — nome coerente. `config.TURSO_DATABASE_URL` / `config.TURSO_AUTH_TOKEN` (Step 4 schema) usati in `db/index.ts` (Step 6) — coerenti. Singleton `db` (Step 6) usato in Task 4 Step 4 — coerente.
