# Comuni DB Repository — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare tabella `comuni` su Turso, repository async `createArchivioComuni(db)`, test con `:memory:` libsql, e seed script one-shot da XML.

**Architecture:** Tabella `comuni` in `src/db/schema.ts` → migration via `drizzle-kit` → factory `createArchivioComuni(db)` in `src/services/comuni.ts` con search async → test con `createTestDb()` (`:memory:` + migrate) → seed script `scripts/seed-comuni.ts` importa `XML/lista_comuni.xml`.

**Tech Stack:** TypeScript (NodeNext, strict), Drizzle ORM, `@libsql/client`, `fast-xml-parser`, vitest, tsx.

**Note:** Il progetto ha 2 errori `TS6059` pre-esistenti in `tsconfig.json` (`rootDir: src` in conflitto con `include: ["tests/**/*", "drizzle.config.ts"]`). Tutti i typecheck di questo piano si intendono "0 errori nuovi", non "0 errori assoluti".

---

## File Structure

| File | Azione | Dipende da |
|---|---|---|
| `src/db/schema.ts` | Modifica | — |
| `src/db/migrations/0001_*.sql` + `meta/*` | Genera (drizzle-kit) | schema.ts |
| `tests/helpers/test-db.ts` | Crea | — |
| `src/services/comuni.ts` | Crea | schema, types |
| `tests/services/comuni.test.ts` | Crea | test-db helper, services/comuni |
| `scripts/seed-comuni.ts` | Crea | schema, db/index, fast-xml-parser |
| `package.json` | Modifica | — |

---

### Task 1: Aggiungi tabella `comuni` allo schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Aggiungi `index` all'import e tabella `comuni`**

Attuale:
```ts
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
```

Sostituisci con:
```ts
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
```

Dopo le tabelle esistenti (`sessioni`), aggiungi:
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

Il file completo ora esporta: `utenti`, `utentiComuni`, `sessioni`, `comuni`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: massimo 2 errori `TS6059` pre-esistenti, nessun errore nuovo.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add comuni table to schema (url unique, nome index)"
```

---

### Task 2: Genera migrazione 0001

**Files:**
- Generate: `src/db/migrations/0001_*.sql` + `meta/`

- [ ] **Step 1: Genera migrazione**

Run: `npm run db:generate`
Expected:
```
[✓] Your SQL migration file ➔ src/db/migrations/0001_<hash>.sql
```

- [ ] **Step 2: Verifica contenuto migrazione**

Run: `cat src/db/migrations/0001_*.sql`
Expected: `CREATE TABLE "comuni" (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nome TEXT NOT NULL, url TEXT NOT NULL, provincia TEXT NOT NULL, zona TEXT NOT NULL)`, `CREATE UNIQUE INDEX ... ON comuni (url)`, `CREATE INDEX "comuni_nome_idx" ON comuni (nome)`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore nuovo (2 TS6059 pre-esistenti ok).

- [ ] **Step 4: Commit**

```bash
git add src/db/migrations/
git commit -m "feat(drizzle): generate 0001 migration for comuni table"
```

---

### Task 3: Helper test DB (`createTestDb`)

**Files:**
- Create: `tests/helpers/test-db.ts`

- [ ] **Step 1: Crea `tests/helpers/test-db.ts`**

```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../../src/db/schema.js";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  return db;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore nuovo.

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/test-db.ts
git commit -m "test: add createTestDb helper (:memory: libsql + migrate)"
```

---

### Task 4: Repository `createArchivioComuni`

**Files:**
- Create: `src/services/comuni.ts`

- [ ] **Step 1: Crea `src/services/comuni.ts`**

```ts
import { eq, like, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { comuni } from "../db/schema.js";
import type { Comune } from "../types/index.js";

export interface ArchivioComuni {
  searchByPrefix(prefix: string): Promise<Comune[]>;
  findByNome(nome: string): Promise<Comune | undefined>;
  all(): Promise<Comune[]>;
}

export function createArchivioComuni(db: LibSQLDatabase): ArchivioComuni {
  function rowToComune(row: typeof comuni.$inferSelect): Comune {
    return {
      nome: row.nome,
      url: row.url,
      provincia: row.provincia,
      zona: row.zona,
    };
  }

  return {
    searchByPrefix: (prefix) =>
      db
        .select()
        .from(comuni)
        .where(like(sql`LOWER(${comuni.nome})`, `${prefix.toLowerCase()}%`))
        .orderBy(comuni.nome)
        .then((rows) => rows.map(rowToComune)),

    findByNome: (nome) =>
      db
        .select()
        .from(comuni)
        .where(eq(comuni.nome, nome))
        .limit(1)
        .then((rows) => (rows[0] ? rowToComune(rows[0]) : undefined)),

    all: () =>
      db
        .select()
        .from(comuni)
        .orderBy(comuni.nome)
        .then((rows) => rows.map(rowToComune)),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore nuovo.

- [ ] **Step 3: Commit**

```bash
git add src/services/comuni.ts
git commit -m "feat: add ArchivioComuni factory (searchByPrefix, findByNome, all)"
```

---

### Task 5: Test del repository

**Files:**
- Create: `tests/services/comuni.test.ts`

- [ ] **Step 1: Crea `tests/services/comuni.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../helpers/test-db.js";
import { createArchivioComuni } from "../../src/services/comuni.js";
import { comuni } from "../../src/db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

const FIXTURE = [
  { nome: "Firenze", url: "firenze", provincia: "FI", zona: "A3 - Arno-Firenze" },
  { nome: "Scandicci", url: "scandicci", provincia: "FI", zona: "A3 - Arno-Firenze" },
  { nome: "Sesto Fiorentino", url: "sestofiorentino", provincia: "FI", zona: "B - Bisenzio e Ombrone Pt" },
  { nome: "Pisa", url: "pisa", provincia: "PI", zona: "A1 - Basso corso Arno" },
];

describe("ArchivioComuni", () => {
  let db: LibSQLDatabase;
  let archivio: ReturnType<typeof createArchivioComuni>;

  beforeAll(async () => {
    db = await createTestDb();
    await db.insert(comuni).values(FIXTURE);
    archivio = createArchivioComuni(db);
  });

  it("searchByPrefix trovato (case-insensitive)", async () => {
    const res = await archivio.searchByPrefix("fire");
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe("Firenze");
    expect(res[0].url).toBe("firenze");
    expect(res[0].provincia).toBe("FI");
    expect(res[0].zona).toContain("Arno");
  });

  it("searchByPrefix multi-match ordinato", async () => {
    const res = await archivio.searchByPrefix("se");
    expect(res).toHaveLength(2);
    expect(res[0].nome).toBe("Scandicci");
    expect(res[1].nome).toBe("Sesto Fiorentino");
  });

  it("searchByPrefix maiuscolo funziona come minuscolo", async () => {
    const res = await archivio.searchByPrefix("PISA");
    expect(res).toHaveLength(0); // LIKE con LOWER('PISA') → 'pisa%', ma il DB ha 'Pisa'
  });

  it("searchByPrefix nessun match", async () => {
    const res = await archivio.searchByPrefix("xyz");
    expect(res).toHaveLength(0);
  });

  it("findByNome match esatto", async () => {
    const res = await archivio.findByNome("Firenze");
    expect(res).toBeDefined();
    expect(res!.nome).toBe("Firenze");
    expect(res!.url).toBe("firenze");
  });

  it("findByNome nessun match", async () => {
    const res = await archivio.findByNome("NonEsiste");
    expect(res).toBeUndefined();
  });

  it("all ritorna tutti i comuni ordinati", async () => {
    const res = await archivio.all();
    expect(res).toHaveLength(4);
    expect(res[0].nome).toBe("Firenze");
    expect(res[3].nome).toBe("Sesto Fiorentino");
  });
});
```

Wait — `LIKE` with `LOWER('PISA')` → `'pisa%'`, and DB has `'Pisa'` with lowercase `LOWER('Pisa')` → `'pisa'`. So `'pisa' LIKE 'pisa%'` → true! My test expectation is wrong. The `searchByPrefix("PISA")` test should return 1 result (Pisa), not 0. Let me fix.

- [ ] **Step 1 (fix): Correggi test `searchByPrefix maiuscolo`**

```ts
  it("searchByPrefix maiuscolo funziona come minuscolo", async () => {
    const res = await archivio.searchByPrefix("PISA");
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe("Pisa");
  });
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- tests/services/comuni.test.ts`
Expected: tutti PASS (6 test).

- [ ] **Step 3: Commit**

```bash
git add tests/services/comuni.test.ts
git commit -m "test: add ArchivioComuni tests (searchByPrefix, findByNome, all)"
```

---

### Task 6: Seed script + npm script

**Files:**
- Create: `scripts/seed-comuni.ts`
- Modify: `package.json`

- [ ] **Step 1: Crea `scripts/seed-comuni.ts`**

```ts
#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import "dotenv/config";
import { db } from "../src/db/index.js";
import { comuni } from "../src/db/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const xmlPath = resolve(__dirname, "../XML/lista_comuni.xml");

let xml: string;
try {
  xml = readFileSync(xmlPath, "utf-8");
} catch (err) {
  console.error(`Errore lettura XML: ${xmlPath}`, err);
  process.exit(1);
}

const parser = new XMLParser({ isArray: (name) => name === "link" });
let parsed: { pages: { link: Array<{ title: string; url: string; provincia: string; zona: string }> } };
try {
  parsed = parser.parse(xml);
} catch (err) {
  console.error("Errore parsing XML", err);
  process.exit(1);
}

const rows = parsed.pages.link.map((link) => ({
  nome: link.title,
  url: link.url,
  provincia: link.provincia,
  zona: link.zona,
}));

console.log(`Trovati ${rows.length} comuni nel XML. Inserimento in corso...`);

const result = await db.insert(comuni).values(rows).onConflictDoNothing();

console.log(`Inseriti/saltati: ${result.rowsAffected} righe affette`);
process.exit(0);
```

- [ ] **Step 2: Modifica `package.json` — aggiungi script `db:seed`**

Trova la sezione `"scripts"` e aggiungi dopo `"db:migrate"`:
```json
    "db:seed": "tsx scripts/seed-comuni.ts"
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore nuovo (scripts/ è fuori da rootDir, ma tsconfig include `"drizzle.config.ts"` che è anche fuori — stesso pattern TS6059 pre-esistente, ok).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-comuni.ts package.json
git commit -m "feat: add seed-comuni script (XML → Turso) and npm run db:seed"
```

---

## Self-Review

**Spec coverage:**
- Schema `comuni` table (id, nome, url, provincia, zona, url unique, nome index) → Task 1 ✓
- Migration 0001 generata con drizzle-kit → Task 2 ✓
- Helper `createTestDb()` (`:memory:` + migrate) → Task 3 ✓
- Factory `createArchivioComuni(db)` con `searchByPrefix`, `findByNome`, `all` → Task 4 ✓
- Test: prefix match, case-insensitive, multi-match, no-match, exact match, all → Task 5 ✓
- Seed script idempotente con `onConflictDoNothing` → Task 6 ✓
- Script npm `db:seed` → Task 6 ✓
- Rimozione legacy (`archivioLocalita.js`, `data/lista_comuni.xml`) → fuori scope (sub-project 4) ✓

**Placeholder scan:** nessun TBD/TODO/codice mancante — ogni step ha codice completo e comandi esatti.

**Type consistency:** `Comune` type da `src/types/index.ts` usato in Task 4, interfaccia `ArchivioComuni` definita in Task 4, `rowToComune` privata in Task 4. `comuni` table ref da schema usato in Task 5 e Task 6. Nomi coerenti.

**`searchByPrefix` case-sensitivity:** usando `LOWER()` + `LIKE 'prefix%'` — la versione con `sql\`LOWER(\${comuni.nome})\``. In Drizzle, `sql` è un template tag che produce un fragment SQL. `LIKE` da Drizzle prende una colonna a sinistra e un pattern a destra. Qui stiamo passando `sql` tag come sinistra di `like()` — funziona? In Drizzle ORM, `like` accetta `SQLWrapper | SQL` come primo argomento e `string | SQLWrapper | SQL` come pattern. `sql\`LOWER(\${comuni.nome})\`` produce un `SQL` object. Questo dovrebbe funzionare. Il test con "PISA" → "pisa" confermerà.

## Execution Handoff

Plan complete. Use `subagent-driven-development` (recommended) or `executing-plans` to run tasks.
