# Multi-comune Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire `/imposta` con `/aggiungi`, `/elimina`, `/modifica`, `/lista` per gestire più comuni per utente.

**Architecture:** Il DB (`utentiComuni`) già supporta multi-comune. Si aggiungono 2 metodi al `UsersRepository`, messaggi e keyboard nuovi, e handler per i nuovi comandi/callback. Nessuna modifica DB.

**Tech Stack:** TypeScript, grammY, Drizzle ORM, SQLite (libSQL), Vitest

## Global Constraints

- Tutti i nuovi messaggi usano `escHtml()` per i nomi comuni (come gli esistenti)
- I callback data usano formato `action:url:nome` o `action:url:nome:flag`
- Le keyboard inline seguono il pattern esistente: oggetto `{ inline_keyboard: [[...]] }`
- Test con Vitest, mock di `ctx` e servizi come nei test esistenti
- Commits frequenti con messaggi in `feat:` / `test:` / `refactor:`

---

### Task 1: Service Layer — removeComune + updateNotificheMeteo

**Files:**
- Modify: `src/services/users.ts`
- Test: `tests/services/users.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  interface UsersRepository {
    removeComune(idTelegram: number, comuneUrl: string): Promise<void>;
    updateNotificheMeteo(idTelegram: number, comuneUrl: string, notificheMeteo: boolean): Promise<void>;
  }
  ```

- [ ] **Step 1: Write tests for removeComune**

```typescript
// tests/services/users.test.ts — aggiungere dentro describe("UsersRepository", () => { ... })

it("removeComune rimuove solo il comune specificato", async () => {
  const user = await repo.findByTelegramId(111);
  expect(user!.comuni).toHaveLength(2);

  await repo.removeComune(111, "firenze");

  const after = await repo.findByTelegramId(111);
  expect(after!.comuni).toHaveLength(1);
  expect(after!.comuni[0].url).toBe("pisa");
});

it("removeComune no-op per comune inesistente", async () => {
  await repo.removeComune(111, "comune-inesistente");
  const user = await repo.findByTelegramId(111);
  expect(user!.comuni).toHaveLength(1);
});

it("removeComune su utente senza comuni non crasha", async () => {
  await repo.removeComune(999, "firenze");
  const user = await repo.findByTelegramId(999);
  expect(user).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/services/users.test.ts`
Expected: FAIL — `removeComune` not defined on `UsersRepository`

- [ ] **Step 3: Write minimal implementation for removeComune**

```typescript
// src/services/users.ts — dentro createUsersRepository, nel return

removeComune: async (idTelegram, comuneUrl) => {
  await db
    .delete(utentiComuni)
    .where(
      and(
        eq(utentiComuni.idTelegram, idTelegram),
        eq(utentiComuni.comuneUrl, comuneUrl)
      )
    );
},
```

Aggiungere import di `and`:
```typescript
import { and, eq } from "drizzle-orm";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/services/users.test.ts`
Expected: PASS

- [ ] **Step 5: Write tests for updateNotificheMeteo**

```typescript
it("updateNotificheMeteo aggiorna il flag", async () => {
  await repo.updateNotificheMeteo(111, "pisa", true);
  const user = await repo.findByTelegramId(111);
  expect(user!.comuni.find((c) => c.url === "pisa")!.notificheMeteo).toBe(true);
});

it("updateNotificheMeteo non tocca altri comuni", async () => {
  // pisa was set to true in previous test
  await repo.updateNotificheMeteo(111, "pisa", false);
  const user = await repo.findByTelegramId(111);
  expect(user!.comuni.find((c) => c.url === "pisa")!.notificheMeteo).toBe(false);
  expect(user!.comuni.find((c) => c.url === "firenze")!.notificheMeteo).toBe(false);
});

it("updateNotificheMeteo no-op per comune inesistente", async () => {
  await expect(
    repo.updateNotificheMeteo(111, "comune-inesistente", true)
  ).resolves.toBeUndefined();
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run tests/services/users.test.ts`
Expected: FAIL — `updateNotificheMeteo` not defined

- [ ] **Step 7: Write minimal implementation for updateNotificheMeteo**

```typescript
// src/services/users.ts — dentro createUsersRepository, nel return

updateNotificheMeteo: async (idTelegram, comuneUrl, notificheMeteo) => {
  await db
    .update(utentiComuni)
    .set({ notificheMeteo })
    .where(
      and(
        eq(utentiComuni.idTelegram, idTelegram),
        eq(utentiComuni.comuneUrl, comuneUrl)
      )
    );
},
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/services/users.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/services/users.ts tests/services/users.test.ts
git commit -m "feat: add removeComune and updateNotificheMeteo to UsersRepository"
```

---

### Task 2: Messages + Help update

**Files:**
- Modify: `src/bot/messages.ts`

- [ ] **Step 1: Add new messages and update help**

```typescript
// src/bot/messages.ts — aggiungere nell'oggetto messages

help:
  "📋 <b>Comandi disponibili</b>\n" +
  "/aggiungi &lt;nome&gt; — Aggiungi un comune\n" +
  "/elimina — Elimina un comune\n" +
  "/modifica — Modifica le notifiche di un comune\n" +
  "/lista — Mostra i tuoi comuni\n" +
  "/allerta — Ricevi l'allerta meteo\n" +
  "/previsioni — Ricevi le previsioni\n" +
  "/credits — Info sul servizio\n" +
  "/annulla — Annulla operazione",

nessunComune:
  "Non hai ancora impostato comuni. Usa /aggiungi per iniziare.",

confermaElimina: (nome: string) =>
  `Eliminare ${escHtml(nome)} dalla tua lista?`,

eliminato: (nome: string) =>
  `✅ ${escHtml(nome)} rimosso dalla tua lista.`,

confermaModifica: (nome: string, stato: string) =>
  `Notifiche meteo per ${escHtml(nome)}: attualmente ${stato}. Modificare?`,

modificato: (nome: string, stato: string) =>
  `✅ Notifiche meteo per ${escHtml(nome)}: ${stato}.`,

gestisciComuni: (comuni: { nome: string; notificheMeteo: boolean }[]) => {
  const items = comuni.map(
    (c) =>
      `• ${escHtml(c.nome)}\n  🔔 Allerta: ✅  Meteo: ${c.notificheMeteo ? "✅" : "❌"}`
  );
  return `📍 <b>I tuoi comuni:</b>\n\n${items.join("\n\n")}`;
},
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/bot/messages.ts
git commit -m "feat: add messages for multi-comune management"
```

---

### Task 3: Keyboards — new inline keyboards + main menu update

**Files:**
- Modify: `src/bot/keyboards.ts`

- [ ] **Step 1: Add new keyboards and update main menu**

```typescript
// src/bot/keyboards.ts — aggiungere nuove funzioni

export function gestisciComuniKeyboard(
  comuni: Array<{ url: string; nome: string }>
) {
  const keyboard = comuni.map((c) => [
    { text: `✏️ ${c.nome}`, callback_data: `mod:${c.url}:${c.nome}` },
    { text: `🗑️ ${c.nome}`, callback_data: `del:${c.url}:${c.nome}` },
  ]);
  keyboard.push([
    { text: "➕ Aggiungi comune", callback_data: "add" },
  ]);
  return { inline_keyboard: keyboard };
}

export function confermaEliminaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "SI, elimina", callback_data: `del-confirm:${url}:${nome}` },
        { text: "NO, annulla", callback_data: "annulla" },
      ],
    ],
  };
}

export function confermaModificaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "SI", callback_data: `mod-set:${url}:${nome}:1` },
        { text: "NO", callback_data: `mod-set:${url}:${nome}:0` },
      ],
    ],
  };
}
```

Aggiornare `mainMenuKeyboard`:
```typescript
export function mainMenuKeyboard() {
  return new Keyboard()
    .text("Aggiorna allerta")
    .text("Aggiorna meteo")
    .row()
    .text("Gestisci comuni")
    .text("Credits&Info")
    .row()
    .resized();
}
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/bot/keyboards.ts
git commit -m "feat: add keyboards for multi-comune management"
```

---

### Task 4: Handlers — new commands + callback handlers

**Files:**
- Modify: `src/bot/handlers.ts`
- Test: `tests/bot/handlers.test.ts`

- [ ] **Step 1: Write tests for manage callback**

```typescript
// tests/bot/handlers.test.ts

describe("manage callback", () => {
  const baseCtx = {
    callbackQuery: { data: "manage" },
    from: { id: 123, username: "testuser", first_name: "Test" },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };

  it("mostra lista comuni quando utente ne ha", async () => {
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [
        { nome: "Firenze", url: "firenze", notificheMeteo: true },
        { nome: "Pisa", url: "pisa", notificheMeteo: false },
      ],
    });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(findByTelegramId).toHaveBeenCalledWith(123);
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("I tuoi comuni"),
      expect.any(Object),
    );
  });

  it("mostra messaggio se utente non ha comuni", async () => {
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [],
    });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Non hai ancora"),
      expect.any(Object),
    );
  });
});
```

- [ ] **Step 2: Write tests for add callback**

```typescript
// tests/bot/handlers.test.ts

describe("add callback", () => {
  it("mostra prompt per cercare comune", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "add" },
      editMessageText,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Scrivi il nome del comune"),
      { reply_markup: { inline_keyboard: [] } },
    );
  });
});
```

- [ ] **Step 3: Write tests for del and del-confirm callbacks**

```typescript
// tests/bot/handlers.test.ts

describe("del callback", () => {
  it("mostra conferma eliminazione", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "del:firenze:Firenze" },
      editMessageText,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Eliminare Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
  });
});

describe("del-confirm callback", () => {
  const baseCtx = {
    callbackQuery: { data: "del-confirm:firenze:Firenze" },
    from: { id: 123, username: "testuser", first_name: "Test" },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };

  it("chiama removeComune e mostra conferma", async () => {
    const removeComune = vi.fn().mockResolvedValue(undefined);
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { removeComune } } as any;

    await handleCallbackQuery(ctx, services);

    expect(removeComune).toHaveBeenCalledWith(123, "firenze");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze rimosso"),
      expect.any(Object),
    );
  });

  it("non fa nulla se ctx.from è undefined", async () => {
    const removeComune = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      ...baseCtx,
      from: undefined,
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handleCallbackQuery(ctx, { users: { removeComune } } as any);

    expect(removeComune).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Write tests for mod and mod-set callbacks**

```typescript
// tests/bot/handlers.test.ts

describe("mod callback", () => {
  it("mostra conferma con stato attuale", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "mod:firenze:Firenze" },
      editMessageText,
      from: { id: 123 },
    } as any;

    // Simula lo stato attuale
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [
        { nome: "Firenze", url: "firenze", notificheMeteo: true },
      ],
    });
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.any(Object),
    );
  });
});

describe("mod-set callback", () => {
  const baseCtx = {
    callbackQuery: { data: "mod-set:firenze:Firenze:1" },
    from: { id: 123 },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };

  it("chiama updateNotificheMeteo con flag corretto", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(updateNotificheMeteo).toHaveBeenCalledWith(123, "firenze", true);
  });

  it("imposta notificheMeteo a false quando flag è 0", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      ...baseCtx,
      callbackQuery: { data: "mod-set:firenze:Firenze:0" },
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(updateNotificheMeteo).toHaveBeenCalledWith(123, "firenze", false);
  });

  it("mostra messaggio di conferma", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      ...baseCtx,
      editMessageText: vi.fn().mockResolvedValue(undefined),
      reply,
    } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.any(Object),
    );
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx vitest run tests/bot/handlers.test.ts`
Expected: FAIL — new callback actions not handled in `handleCallbackQuery`

- [ ] **Step 6: Implement handler changes**

```typescript
// src/bot/handlers.ts — modifiche al file

// 1. Aggiungere import per le nuove keyboard
import {
  mainMenuKeyboard,
  comuniInlineKeyboard,
  confermaInlineKeyboard,
  gestisciComuniKeyboard,
  confermaEliminaInlineKeyboard,
  confermaModificaInlineKeyboard,
} from "./keyboards.js";

// 2. Aggiungere comandi in registerHandlers
bot.command("aggiungi", async (ctx) => {
  const text = ctx.match?.trim() ?? "";
  if (!text) {
    await ctx.reply(messages.impostaPrompt);
    return;
  }
  const risultati = await services.comuni.searchByPrefix(text);
  if (risultati.length === 0) {
    await ctx.reply(messages.impostaNonTrovato);
    return;
  }
  await ctx.reply(messages.comuniTrovati, {
    reply_markup: comuniInlineKeyboard(risultati),
  });
});

bot.command("elimina", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
    return;
  }
  await ctx.reply(messages.gestisciComuni(user.comuni), {
    reply_markup: gestisciComuniKeyboard(user.comuni),
  });
});

bot.command("modifica", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
    return;
  }
  await ctx.reply(messages.gestisciComuni(user.comuni), {
    reply_markup: gestisciComuniKeyboard(user.comuni),
  });
});

bot.command("lista", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
    return;
  }
  await ctx.reply(messages.gestisciComuni(user.comuni), {
    reply_markup: mainMenuKeyboard(),
  });
});

// 3. Sostituire hears("Imposta comune") con hears("Gestisci comuni")
bot.hears("Gestisci comuni", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComune, {
      reply_markup: { inline_keyboard: [[{ text: "➕ Aggiungi comune", callback_data: "add" }]] },
    });
    return;
  }
  await ctx.reply(messages.gestisciComuni(user.comuni), {
    reply_markup: gestisciComuniKeyboard(user.comuni),
  });
});

// 4. Aggiornare handleCallbackQuery
export async function handleCallbackQuery(
  ctx: Filter<Context, "callback_query:data">,
  services: BotServices,
) {
  const data = ctx.callbackQuery.data;
  const parts = data.split(":");
  const action = parts[0];

  if (action === "manage") {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await safeEditMessageText(ctx, messages.nessunComune, {
        reply_markup: { inline_keyboard: [[{ text: "➕ Aggiungi comune", callback_data: "add" }]] },
      });
      return;
    }
    await safeEditMessageText(ctx, messages.gestisciComuni(user.comuni), {
      reply_markup: gestisciComuniKeyboard(user.comuni),
    });
    return;
  }

  if (action === "add") {
    await safeEditMessageText(ctx, messages.impostaPrompt, {
      reply_markup: { inline_keyboard: [] },
    });
    return;
  }

  if (action === "sel") {
    // ... esistente
  }

  if (action === "sub") {
    // ... esistente
  }

  if (action === "del") {
    const [, url, nome] = parts;
    await safeEditMessageText(ctx, messages.confermaElimina(nome), {
      reply_markup: confermaEliminaInlineKeyboard(url, nome),
    });
    return;
  }

  if (action === "del-confirm") {
    const [, url, nome] = parts;
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    await services.users.removeComune(idTelegram, url);
    await safeEditMessageText(ctx, messages.eliminato(nome), {
      reply_markup: { inline_keyboard: [] },
    });
    await ctx.reply(messages.eliminato(nome), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (action === "mod") {
    const [, url, nome] = parts;
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    const user = await services.users.findByTelegramId(idTelegram);
    if (!user) return;
    const comune = user.comuni.find((c) => c.url === url);
    if (!comune) return;
    const stato = comune.notificheMeteo ? "ATTIVE" : "DISATTIVE";
    await safeEditMessageText(ctx, messages.confermaModifica(nome, stato), {
      reply_markup: confermaModificaInlineKeyboard(url, nome),
    });
    return;
  }

  if (action === "mod-set") {
    const [, url, nome, flagRaw] = parts;
    const notificheMeteo = flagRaw === "1";
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    await services.users.updateNotificheMeteo(idTelegram, url, notificheMeteo);
    const stato = notificheMeteo ? "ATTIVE" : "DISATTIVE";
    await safeEditMessageText(ctx, messages.modificato(nome, stato), {
      reply_markup: { inline_keyboard: [] },
    });
    await ctx.reply(messages.modificato(nome, stato), { reply_markup: mainMenuKeyboard() });
    return;
  }
}
```

Rimuovere il vecchio handler per `/imposta` e `hears("Imposta comune")`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add src/bot/handlers.ts tests/bot/handlers.test.ts
git commit -m "feat: add multi-comune management commands and callbacks"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "chore: final adjustments after multi-comune feature"
```
