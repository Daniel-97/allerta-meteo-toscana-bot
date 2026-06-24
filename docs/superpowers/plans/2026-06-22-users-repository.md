# Users Repository — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare repository `createUsersRepository(db)` async su Turso con `findByTelegramId`, `subscribe` (transazionale), `findAllWithComuni`. Reuse `createTestDb()` da sub-project 1.

**Architecture:** Factory `createUsersRepository(db)` in `src/services/users.ts` con upsert transazionale (`db.transaction`) su `utenti` + `utentiComuni`. Niente schema change, niente migrazione — le tabelle esistono già.

**Tech Stack:** TypeScript (NodeNext, strict), Drizzle ORM, `@libsql/client`, vitest, tsx.

---

## File Structure

| File | Azione | Dipende da |
|---|---|---|
| `src/services/users.ts` | Crea | schema (`utenti`, `utentiComuni`), types |
| `tests/services/users.test.ts` | Crea | test-db helper, services/users |

Nessuna modifica a file esistenti (`schema.ts` invariato, niente migrazione).

---

### Task 1: Repository `createUsersRepository`

**Files:**
- Create: `src/services/users.ts`

- [ ] **Step 1: Crea `src/services/users.ts`**

```ts
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { utenti, utentiComuni } from "../db/schema.js";

export interface UserComune {
  nome: string;
  url: string;
  notificheMeteo: boolean;
}

export interface User {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  comuni: UserComune[];
}

export interface SubscribeInput {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  comune: { nome: string; url: string };
  notificheMeteo: boolean;
}

export interface UsersRepository {
  findByTelegramId(id: number): Promise<User | undefined>;
  subscribe(input: SubscribeInput): Promise<void>;
  findAllWithComuni(): Promise<User[]>;
}

export function createUsersRepository(db: LibSQLDatabase): UsersRepository {
  function rowToUserComune(row: typeof utentiComuni.$inferSelect): UserComune {
    return {
      nome: row.comuneNome,
      url: row.comuneUrl,
      notificheMeteo: row.notificheMeteo,
    };
  }

  function rowToUser(
    utente: typeof utenti.$inferSelect,
    comuni: UserComune[]
  ): User {
    return {
      idTelegram: utente.idTelegram,
      usernameTelegram: utente.usernameTelegram,
      nomeTelegram: utente.nomeTelegram,
      comuni,
    };
  }

  return {
    findByTelegramId: async (id) => {
      const userRows = await db
        .select()
        .from(utenti)
        .where(eq(utenti.idTelegram, id))
        .limit(1);
      if (userRows.length === 0) return undefined;
      const comuniRows = await db
        .select()
        .from(utentiComuni)
        .where(eq(utentiComuni.idTelegram, id));
      return rowToUser(userRows[0], comuniRows.map(rowToUserComune));
    },

    subscribe: async (input) => {
      await db.transaction(async (tx) => {
        await tx
          .insert(utenti)
          .values({
            idTelegram: input.idTelegram,
            usernameTelegram: input.usernameTelegram,
            nomeTelegram: input.nomeTelegram,
          })
          .onConflictDoUpdate({
            target: utenti.idTelegram,
            set: {
              usernameTelegram: input.usernameTelegram,
              nomeTelegram: input.nomeTelegram,
            },
          });
        await tx
          .insert(utentiComuni)
          .values({
            idTelegram: input.idTelegram,
            comuneNome: input.comune.nome,
            comuneUrl: input.comune.url,
            notificheMeteo: input.notificheMeteo,
          })
          .onConflictDoUpdate({
            target: [utentiComuni.idTelegram, utentiComuni.comuneUrl],
            set: { notificheMeteo: input.notificheMeteo },
          });
      });
    },

    findAllWithComuni: async () => {
      const userRows = await db.select().from(utenti);
      const comuniRows = await db.select().from(utentiComuni);
      const comuniByUser = new Map<number, UserComune[]>();
      for (const row of comuniRows) {
        const arr = comuniByUser.get(row.idTelegram) ?? [];
        arr.push(rowToUserComune(row));
        comuniByUser.set(row.idTelegram, arr);
      }
      return userRows.map((u) =>
        rowToUser(u, comuniByUser.get(u.idTelegram) ?? [])
      );
    },
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/services/users.ts
git commit -m "feat: add UsersRepository (findByTelegramId, subscribe, findAllWithComuni)"
```

---

### Task 2: Test del repository

**Files:**
- Create: `tests/services/users.test.ts`

- [ ] **Step 1: Crea `tests/services/users.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../helpers/test-db.js";
import {
  createUsersRepository,
  type UsersRepository,
} from "../../src/services/users.js";
import { utenti, utentiComuni } from "../../src/db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

describe("UsersRepository", () => {
  let db: LibSQLDatabase;
  let repo: UsersRepository;

  const utente1 = {
    idTelegram: 111,
    usernameTelegram: "user1",
    nomeTelegram: "User Uno",
  };
  const utente2 = {
    idTelegram: 222,
    usernameTelegram: null,
    nomeTelegram: "User Due",
  };
  const comuneFi = { nome: "Firenze", url: "firenze" };
  const comunePi = { nome: "Pisa", url: "pisa" };

  beforeAll(async () => {
    db = await createTestDb();
    repo = createUsersRepository(db);
  });

  it("findByTelegramId ritorna undefined per utente inesistente", async () => {
    const res = await repo.findByTelegramId(999);
    expect(res).toBeUndefined();
  });

  it("subscribe crea utente e associazione", async () => {
    await repo.subscribe({
      ...utente1,
      comune: comuneFi,
      notificheMeteo: true,
    });
    const user = await repo.findByTelegramId(111);
    expect(user).toBeDefined();
    expect(user!.idTelegram).toBe(111);
    expect(user!.usernameTelegram).toBe("user1");
    expect(user!.nomeTelegram).toBe("User Uno");
    expect(user!.comuni).toHaveLength(1);
    expect(user!.comuni[0].nome).toBe("Firenze");
    expect(user!.comuni[0].url).toBe("firenze");
    expect(user!.comuni[0].notificheMeteo).toBe(true);
  });

  it("subscribe aggiunge secondo comune senza perdere il primo", async () => {
    await repo.subscribe({
      ...utente1,
      comune: comunePi,
      notificheMeteo: false,
    });
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni).toHaveLength(2);
    expect(user!.comuni.find((c) => c.url === "firenze")?.notificheMeteo).toBe(
      true
    );
    expect(user!.comuni.find((c) => c.url === "pisa")?.notificheMeteo).toBe(
      false
    );
  });

  it("subscribe re-iscrizione stesso comune aggiorna flag", async () => {
    await repo.subscribe({
      ...utente1,
      comune: comuneFi,
      notificheMeteo: false,
    });
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni).toHaveLength(2);
    expect(
      user!.comuni.find((c) => c.url === "firenze")!.notificheMeteo
    ).toBe(false);
  });

  it("subscribe aggiorna profilo utente (username/nome)", async () => {
    await repo.subscribe({
      idTelegram: 111,
      usernameTelegram: "user1_updated",
      nomeTelegram: "User Uno Updated",
      comune: comuneFi,
      notificheMeteo: true,
    });
    const user = await repo.findByTelegramId(111);
    expect(user!.usernameTelegram).toBe("user1_updated");
    expect(user!.nomeTelegram).toBe("User Uno Updated");
    // comuni preserved
    expect(user!.comuni).toHaveLength(2);
  });

  it("subscribe utente null username gestito", async () => {
    await repo.subscribe({
      ...utente2,
      comune: comunePi,
      notificheMeteo: true,
    });
    const user = await repo.findByTelegramId(222);
    expect(user).toBeDefined();
    expect(user!.usernameTelegram).toBeNull();
    expect(user!.comuni).toHaveLength(1);
  });

  it("findAllWithComuni ritorna tutti gli utenti con relativi comuni", async () => {
    const all = await repo.findAllWithComuni();
    expect(all).toHaveLength(2);
    const u1 = all.find((u) => u.idTelegram === 111)!;
    expect(u1.comuni).toHaveLength(2);
    const u2 = all.find((u) => u.idTelegram === 222)!;
    expect(u2.comuni).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Esegui i test**

Run: `npm test -- tests/services/users.test.ts`
Expected: 8 test, tutti PASS.

Se falliscono, analizza l'errore, correggi, riprova.

- [ ] **Step 3: Commit**

```bash
git add tests/services/users.test.ts
git commit -m "test: add UsersRepository tests (findByTelegramId, subscribe, findAllWithComuni)"
```

---

## Self-Review

**Spec coverage:**
- `findByTelegramId` (trovato/undefined) → Task 1 + Task 2 ✓
- `subscribe` transazionale (nuovo utente, nuovo comune, re-iscrizione, aggiornamento profilo) → Task 1 + Task 2 ✓
- `findAllWithComuni` → Task 1 + Task 2 ✓
- Upsert via `onConflictDoUpdate` → Task 1 ✓
- Niente JOIN con `comuni` → implementato con merge JS su `utentiComuni` ✓
- Niente schema change → nessun file schema/migrazione toccato ✓

**Placeholder scan:** nessun TBD/TODO — ogni step ha codice completo.

**Type consistency:** `LibSQLDatabase` da `drizzle-orm/libsql` (già usato in `comuni.ts`), `utenti`/`utentiComuni` da schema (già esistenti), tipi `User`/`UserComune`/`SubscribeInput` definiti nel repository. Nomi coerenti tra Task 1 e Task 2.
