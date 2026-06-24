# Design: Comuni DB Repository

**Data:** 2026-06-22 · **Branch:** `redesign-typescript` · **Sub-project:** 1 di 4

## Contesto e scopo

Il legacy `archivioLocalita.js` carica `XML/lista_comuni.xml` a runtime con `xml2js` e offre ricerca per prefisso su un array in memoria. Si vuole spostare la lista comuni in una tabella Turso per: uniformare il data layer con `utenti`/`utenti_comuni`, abilitare search via SQL, eliminare I/O file all'avvio del bot, e permettere modifiche future ai comuni via DB senza toccare XML.

**Obiettivo:** tabella `comuni` su Turso + seed script one-shot + repository async testabile in `src/services/comuni.ts`. Sostituisce interamente `archivioLocalita.js`.

## File structure

| File | Azione | Responsabilità |
|---|---|---|
| `src/db/schema.ts` | Modifica | Aggiunge tabella `comuni` |
| `src/db/migrations/0001_*.sql` + `meta/*` | Genera | Migration snapshot per `CREATE TABLE comuni` + index |
| `scripts/seed-comuni.ts` | Crea | Legge `XML/lista_comuni.xml`, inserisce righe via Drizzle (idempotente) |
| `src/services/comuni.ts` | Crea | Factory `createArchivioComuni(db)` con `searchByPrefix`/`findByNome`/`all` async |
| `tests/helpers/test-db.ts` | Crea | Helper `createTestDb()` che istanzia `:memory:` + migrate |
| `tests/services/comuni.test.ts` | Crea | Unit test con `:memory:` libsql + migrate + seed fixture |
| `package.json` | Modifica | Aggiunge script `db:seed` |
| `data/lista_comuni.xml` | Fuori scope | Duplicato; rimozione in sub-project 4 |

## Schema — tabella `comuni`

Aggiunta in `src/db/schema.ts`:

```ts
export const comuni = sqliteTable(
  "comuni",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    url: text("url").notNull(),
    provincia: text("provincia").notNull(),
    zona: text("zona").notNull(),
  },
  (t) => ({
    urlUnico: unique().on(t.url),
    nomeIdx: index("comuni_nome_idx").on(t.nome),
  })
);
```

**Scelte:**
- `id` auto-increment PK (coerente con `utenti_comuni.id`)
- `url` unique — identificatore LAMMA usato per costruire l'URL di fetch
- `nome` index — supporta search by prefix
- Tutti i campi `notNull` (XML li ha sempre)
- Niente FK da `utenti_comuni.comune_url` a `comuni.url` (FK logico, non fisico — evita problemi di ordering col seed)

## Migrazione & seed

**Migrazione** (CLI manuale):
```bash
npm run db:generate   # genera 0001_<hash>.sql con CREATE TABLE comuni + CREATE INDEX + UNIQUE
npm run db:migrate    # applica a Turso
```

**Seed script** `scripts/seed-comuni.ts`:
- Apre `XML/lista_comuni.xml` risolvendo il path via `import.meta.url`
- Parsa con `fast-xml-parser` (`isArray: (name) => name === 'link'`)
- Mappa ogni `<link>` a `{ nome: title, url, provincia, zona }`
- Insert bulk via `db.insert(comuni).values(rows).onConflictDoNothing({ target: comuni.url })` — idempotente
- Logga conteggio inseriti/saltati via `pino`
- Esce con codice 0/1

**Script npm:** `"db:seed": "tsx scripts/seed-comuni.ts"`

## Repository API — `src/services/comuni.ts`

```ts
export interface ArchivioComuni {
  searchByPrefix(prefix: string): Promise<Comune[]>;
  findByNome(nome: string): Promise<Comune | undefined>;
  all(): Promise<Comune[]>;
}

export function createArchivioComuni(db: LibSQLDatabase): ArchivioComuni;
```

- `searchByPrefix` case-insensitive via `LOWER()` + `LIKE`, ordinato per nome
- `findByNome` match esatto case-sensitive, ritorna primo risultato o `undefined`
- `all()` — debug/admin, ordinato per nome
- Factory prende `db` iniettabile → testabile con `:memory:`

## Test — `tests/services/comuni.test.ts`

**Test harness:** `tests/helpers/test-db.ts` con `createTestDb()`:
- `createClient({ url: ":memory:" })` + `drizzle()` con schema
- `migrate()` programmatico carica `src/db/migrations/0000_*` e `0001_*`
- Ritorna `db` tipizzato

**Fixture seed inline:** `[{ nome: "Firenze", url: "firenze", provincia: "FI", zona: "A3" }, ...]`

**Casi:**
- `searchByPrefix("fire")` → `[Firenze]` (case-insensitive)
- `searchByPrefix("se")` → `[Scandicci, Sesto Fiorentino]` (prefisso multi-match, ordinato)
- `searchByPrefix("xyz")` → `[]`
- `findByNome("Firenze")` → `Comune` con tutti i campi
- `findByNome("NonEsiste")` → `undefined`
- `all()` → 4 comuni ordinati per nome

## Error handling

- **Seed:** XML mancante/invalido → pino error + `process.exit(1)`
- **Repository:** propaga Promise reject al chiamante. Niente catch silente
- **Migrazione:** errori escono da `drizzle-kit` (CLI), visibili in fase di deploy

## Fuori scope

- Rimozione `archivioLocalita.js`, `comandi.js`, `utente.js`, ecc. → sub-project 4
- Handler bot che consumano `ArchivioComuni` → sub-project 4
- Admin CRUD comuni → YAGNI
- Full-text search su `provincia`/`zona` → YAGNI
- Import incrementale del XML → seed one-shot
