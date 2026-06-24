# Agenti

## README sync

Ogni modifica a comandi bot, pulsanti menu, handler, o fonti dati deve aggiornare
il README.md di conseguenza (sezioni "Comandi bot", "Menu a bottoni", "Pannello Admin",
"Fonti dati", "Struttura del progetto").

## Convenzioni di codice

- **ESM puro** — `"type": "module"`, import con estensione `.js` (es. `import { x } from "./foo.js"`)
- **No classi** — solo funzioni pure e object literal. Pattern dominante: **factory function** che prende dipendenze e restituisce un object che implementa un'interfaccia esportata
- **No `export default`** tranne che in `src/index.ts` (entry point CF Worker)
- **`strict: true` in TypeScript** — niente `any`, niente cast impliciti
- **No path alias** — solo import relativi
- **Zod per ogni validazione** — env config, input parsing

## Testing

- Framework: **Vitest** con `globals: true` (usa `describe`/`it`/`expect` globali)
- Helper DB: `tests/helpers/test-db.ts` — crea DB SQLite `:file:` temporaneo + migra con Drizzle
- Mocking: usa `vi.fn()` direttamente, niente librerie di mock
- Network: `vi.stubGlobal("fetch", mockFn)` per chiamate HTTP
- Pattern: prima crea servizio con `createXxx(db)`, poi testa i metodi

## Git

- Stile commit: `tipo: messaggio in italiano` (tipi: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`)
- Branches: lavorare su `main` (repo mono-branch)
- Nessun commit di secret, `.env`, o `dist/`

## DB e Drizzle

- Schema in `src/db/schema.ts` con `drizzle-orm/sqlite-core`
- Migrazioni in `src/db/migrations/` (generate con `drizzle-kit generate`)
- Query via Drizzle query builder, non raw SQL (tranne `LOWER()` in LIKE)
- Transazioni per operazioni che coinvolgono più tabelle

## Pattern architetturali

- Servizi esposti come interfacce, aggregati in `BotServices` (`comuni`, `users`, `meteo`)
- Dependency injection manuale: factory riceve `db` (libSQL), restituisce servizio
- Handler bot registrati con `registerHandlers(bot, services)`
- Admin handlers filtrati da middleware che controlla `ADMIN_CHAT_ID`
- Gestione errori: `safeEditMessageText` per GrammyError, catch generici per notifiche, `process.exit(1)` per config mancante in dev

## URL immagini meteo

Pattern: `https://www.lamma.toscana.it/previ/ita/immagini/image_{N}_{F}.jpg`
- `N` = 1 (oggi), 2 (domani), 3 (dopodomani)
- `F` = M (mattina ~8), P (pomeriggio ~14), S (sera ~20)
- Il bot invia album di 9 immagini (3×3) dopo il testo delle previsioni

## Errori comuni da evitare

- Dimenticare `.js` negli import (TypeScript con `NodeNext` lo richiede)
- Usare `process.env` in CF Worker (usare `env` passato dall'handler)
- Non aggiornare README dopo aver cambiato comandi o menu
