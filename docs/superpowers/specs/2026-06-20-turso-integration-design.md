# Design: Integrazione Turso come database gestito

**Data:** 2026-06-20
**Branch:** `redesign-typescript`
**Stato:** Approvato (in attesa di review finale)

## Contesto

Il progetto `allerta-meteo-toscana-bot` è in fase di migrazione da JavaScript/MySQL (legacy v1, file alla root) a TypeScript/Drizzle ORM (v2, codice in `src/`). Lo stack DB attuale usa **SQLite** via `better-sqlite3` + `drizzle-orm/better-sqlite3` (sync). Il database file `data/bot.db` non esiste ancora, le cartelle `src/bot/handlers/`, `src/bot/conversations/`, `src/services/` sono vuote e `src/db/migrations/` è vuota: nessuna migrazione è stata generata.

Si vuole sostituire SQLite locale con **Turso** (database SQLite gestito su cloud) per avere un database gestito, accessibile da ovunque, senza manutenzione del file locale. Il momento è ideale perché non c'è ancora codice query consumer da riscrivere.

## Decisioni prese

| Decisione | Scelta |
|---|---|
| SDK TypeScript | `@libsql/client` (SDK ufficiale Turso per Drizzle ORM, production-ready) |
| Ambiente dev | Turso remoto (stesso DB/credential pattern di prod) |
| Ambiente prod | Turso remoto (`libsql://...` + auth token) |
| Migrazioni | CLI manuale: `npm run db:migrate` (drizzle-kit migrate), niente `migrate()` programmatico all'avvio |
| Provisioning | Account + DB + credenziali Turso già pronti |

## Opzioni considerate

| # | Approccio | Pro | Contro |
|---|---|---|---|
| 1 (scelta) | `@libsql/client` remoto, dev+prod su Turso | Codebase unica, ambiente identico dev/prod, zero file locali, SDK raccomandato da Drizzle per Turso | Ogni query viaggia sulla rete (latenza); dev richiede internet |
| 2 | `@libsql/client` con file locale in dev + remoto in prod | Dev offline e veloce, env-driven | Due behavior, gestione file `data/bot.db`, `.gitignore` |
| 3 | Embedded replicas (locale + sync cloud) | Letture locali a bassa latenza, dati gestiti | Complesso (sync, conflitti, file locale); overkill per un bot |

## Architettura

L'architettura rimane a 3 layer, invariata nella forma:

```
src/config.ts  ──env validati (Zod)──►  src/db/index.ts  ──istanza Drizzle──►  consumer
                                             │
                                             ▼
                                        @libsql/client
                                             │
                                             ▼
                                        Turso Cloud (remoto)
```

Lo schema (`src/db/schema.ts`) **non si tocca**: Turso è drop-in per SQLite, quindi `sqliteTable`/`integer`/`text`/FK/`unique` funzionano identici. Le 3 tabelle restano: `utenti`, `utenti_comuni`, `sessioni`.

## Modifiche ai file

### 1. Dipendenze (`package.json`)

**Rimuovere:**
- `better-sqlite3` (dependencies)
- `@types/better-sqlite3` (devDependencies)

**Aggiungere:**
- `@libsql/client` (dependencies) — async, fetch-based, zero dipendenze native

**Invariati:** `drizzle-orm`, `drizzle-kit`, script `db:generate`/`db:migrate`.

### 2. Variabili d'ambiente (`.env`, `.env.example`)

Sostituire `DATABASE_PATH` con le credenziali Turso:

```
TELEGRAM_BOT_TOKEN=
ADMIN_CHAT_ID=
TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io
TURSO_AUTH_TOKEN=<token>
NODE_ENV=development
```

### 3. Config (`src/config.ts`)

Aggiornare lo schema Zod:
- Rimuovere `DATABASE_PATH: z.string().default("data/bot.db")`
- Aggiungere `TURSO_DATABASE_URL: z.string().min(1)` (validazione URL opzionale — Turso usa `libsql://`, schema non standard per `z.url()`, quindi validazione minima con `min(1)`)
- Aggiungere `TURSO_AUTH_TOKEN: z.string().min(1)`

Il token è obbligatorio anche in dev (connessione remota).

### 4. Client DB (`src/db/index.ts`) — riscrittura completa

Da sync (`better-sqlite3`) ad **async** (`@libsql/client`):

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

**Cambiamenti chiave:**
- `better-sqlite3` è **sincrono**; `@libsql/client` è **async** (tutte le query tornano Promise). Vincolo architetturale: tutti i consumer futuri (handlers/conversations/services) devono usare `await`. Nessuna riscrittura necessaria ora perché quei file sono vuoti.
- I pragma `journal_mode = WAL` e `foreign_keys = ON` **spariscono**: Turso gestisce WAL internamente; `foreign_keys = ON` è il default su libSQL/Turso. Nessuna azione equivalente nel client.
- Il client è un singleton esportato come `db`, come prima.

### 5. Drizzle Kit config (`drizzle.config.ts`)

Cambio dialect da `sqlite` a `turso` (dedicato, evolve indipendentemente, supporta più `ALTER` nativi libSQL):

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

Aggiungere `import "dotenv/config"` in testa: drizzle-kit non carica `.env` automaticamente e le credenziali sono env-based.

### 6. Schema (`src/db/schema.ts`) — invariato

Nessuna modifica. Le 3 tabelle (`utenti`, `utenti_comuni`, `sessioni`) con FK, unique constraint e timestamp sono compatibili con Turso.

### 7. `.gitignore` — pulizia opzionale

Le righe `data/bot.db`, `data/*.db-shm`, `data/*.db-wal` diventano obsolete (nessun file locale). Si possono rimuovere per pulizia. Non blocca nulla lasciarle.

## Migrazioni

Stato attuale: `src/db/migrations/` vuota, nessuna migrazione generata.

1. Dopo l'integrazione, eseguire `npm run db:generate` → genera il primo migration snapshot dallo schema esistente (3 tabelle).
2. Eseguire `npm run db:migrate` → drizzle-kit connette al DB Turso remoto e applica la migrazione (crea le tabelle sul cloud).
3. Strategia **CLI manuale** (scelta dell'utente): nessun `migrate()` programmatico all'avvio del bot. Le migrazioni si applicano esplicitamente prima del deploy.

**Pre-condizione da verificare allo startup:** se il DB Turso remoto ha già tabelle o dati, la prima migrazione può fallire su `CREATE TABLE`. Verificare lo stato del DB remoto prima di migrare:
- Se vuoto/pulito → procedere con `db:migrate`.
- Se popolato/allineato → usare `drizzle-kit push` (applica schema senza journal migrazioni) o allineare manualmente il migration snapshot.

## Test, error handling, rollback

### Test (`vitest`)
- `tests/services/` è vuota. Quando si scriveranno test DB: usare `createClient({ url: ":memory:" })` per DB in-memory (no rete, no token). `@libsql/client` lo supporta nativamente.
- Servirà un helper/factory `createTestDb()` che istanzia Drizzle su `:memory:` + applica lo schema via `migrate()` programmatico nei test (separato dalla strategia CLI del runtime).

### Error handling connessione
- `@libsql/client` non ha un metodo `.connect()` esplicito: la connessione è **lazy** (prima query). Gli errori di rete/auth emergono alla prima operazione.
- Nel bootstrap del bot (future `src/index.ts`), eseguire una query "ping" (`SELECT 1`) all'avvio per **fail fast** se le credenziali sono sbagliate, prima di avviare il polling Telegram. Logga l'errore e notifica l'admin (pattern già usato nel legacy `index.js:37-49`).

### Rollback
- drizzle-kit non supporta rollback automatico. Ogni migrazione è un file SQL in `src/db/migrations/`; per rollback manuale scrivere SQL inverso. Accettabile per un bot single-instance.

## Fuori scope

- Scrittura di handlers/conversations/services (logic bot TS)
- Rimozione file legacy JS alla root (`index.js`, `archivioUtenti.js`, `databaseConfig.js`, ecc.) — scope separato
- Implementazione test DB (solo designato, non implementato ora)
- Embedded replicas / Turso Sync (architettura opzione 3, scartata)
- Provisioning Turso (account/DB/token già pronti)

## Riepilogo scope

| File | Azione |
|---|---|
| `package.json` | Rimuovi `better-sqlite3` + `@types/better-sqlite3`; aggiungi `@libsql/client` |
| `src/db/index.ts` | Riscrivi: `@libsql/client` + `drizzle-orm/libsql` async |
| `src/config.ts` | Sostituisci `DATABASE_PATH` con `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (Zod) |
| `drizzle.config.ts` | `dialect: "turso"` + credenziali Turso; aggiungi `dotenv/config` |
| `.env` / `.env.example` | Nuove env vars Turso |
| `.gitignore` | (Opzionale) rimuovi righe `data/*.db*` obsolete |
| `src/db/schema.ts` | Invariato |
| `package.json` scripts | Invariati (`db:generate`, `db:migrate`) |
| Esegui | `npm run db:generate` → `npm run db:migrate` (dopo verifica stato DB remoto) |
