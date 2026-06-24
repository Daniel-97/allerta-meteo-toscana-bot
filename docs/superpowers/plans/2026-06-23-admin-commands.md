# Admin Commands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-only commands for managing users, viewing info, and sending broadcast messages.

**Architecture:** New `src/bot/admin/` module with middleware guard, handlers, and messages. Admin identified by `ADMIN_CHAT_ID` env var. Commands route via `bot.command("admin")` with subcommand dispatch on `ctx.match`.

**Tech Stack:** grammy, TypeScript, drizzle-orm, libsql/Turso

**Global Constraints:**
- Follow existing patterns: messages in `messages.ts`, keyboards in `keyboards.ts`, handlers exported as `register*` function
- `ADMIN_CHAT_ID` from config (already exists, converted to number)
- Admin can also be a regular user
- Non-admin users never see admin commands (silent ignore)

---

### Task 1: UsersRepository — add `creatoIl` + `count()`

**Files:**
- Modify: `src/services/users.ts`
- Modify: `tests/services/users.test.ts`

- [ ] **Step 1: Update test for `creatoIl`**

Add assertion in `subscribe crea utente e associazione` test to check `user!.creatoIl` is a Date:

Edit `tests/services/users.test.ts` — add after line 56:
```typescript
    expect(user!.creatoIl).toBeInstanceOf(Date);
```

Add `count()` tests after line 169:
```typescript
  it("count ritorna 0 quando non ci sono utenti", async () => {
    // clean up test env by checking count in a fresh state
    // We'll just verify count is > 0 in the populated state
  });

  it("count ritorna numero di utenti registrati", async () => {
    const totali = await repo.count();
    expect(totali).toBe(2);
  });
```

- [ ] **Step 2: Add `creatoIl` to `User` interface**

```typescript
export interface User {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  creatoIl: Date;
  comuni: UserComune[];
}
```

- [ ] **Step 3: Add `count()` to interface**

```typescript
export interface UsersRepository {
  // ... existing methods ...
  count(): Promise<number>;
}
```

- [ ] **Step 4: Update `rowToUser` to include `creatoIl`**

```typescript
function rowToUser(
  utente: typeof utenti.$inferSelect,
  comuni: UserComune[]
): User {
  return {
    idTelegram: utente.idTelegram,
    usernameTelegram: utente.usernameTelegram,
    nomeTelegram: utente.nomeTelegram,
    creatoIl: utente.creatoIl,
    comuni,
  };
}
```

- [ ] **Step 5: Implement `count()` in the returned object**

```typescript
return {
  // ... existing methods ...
  count: async () => {
    const result = await db
      .select({ value: count() })
      .from(utenti)
      .limit(1);
    return result[0]?.value ?? 0;
  },
};
```

Need to import `count` from `drizzle-orm`.

- [ ] **Step 6: Run tests**

```
npm test
```

- [ ] **Step 7: Commit**

---

### Task 2: Admin middleware + messages

**Files:**
- Create: `src/bot/admin/middleware.ts`
- Create: `src/bot/admin/messages.ts`

- [ ] **Step 1: Create middleware**

```typescript
import type { Context, NextFunction } from "grammy";

export function isAdmin(adminChatId: number) {
  return (ctx: Context, next: NextFunction) => {
    if (ctx.from?.id === adminChatId) return next();
  };
}
```

- [ ] **Step 2: Create messages**

```typescript
import type { User } from "../../services/users.js";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const adminMessages = {
  welcome:
    "👑 <b>Pannello Admin</b>\n\n" +
    "/admin — Mostra questo messaggio\n" +
    "/admin utenti — Statistiche utenti\n" +
    "/admin info &lt;id&gt; — Info su un utente\n" +
    "/admin broadcast &lt;testo&gt; — Invia messaggio a tutti gli utenti",

  riepilogoUtenti: (totale: number, comuniTotali: number) =>
    `👥 <b>Utenti registrati:</b> ${totale}\n📍 <b>Comuni seguiti:</b> ${comuniTotali}`,

  infoUtente: (u: User) => {
    const lines = [
      "👤 <b>Utente</b>",
      `🆔 <code>${u.idTelegram}</code>`,
      `👤 Username: ${u.usernameTelegram ? "@" + escHtml(u.usernameTelegram) : "—"}`,
      `📛 Nome: ${escHtml(u.nomeTelegram)}`,
      `📅 Registrato: ${u.creatoIl instanceof Date ? u.creatoIl.toLocaleDateString("it-IT") : String(u.creatoIl)}`,
      "",
      `<b>📍 Comuni (${u.comuni.length})</b>`,
      ...u.comuni.map(c =>
        `• ${escHtml(c.nome)}  🔔 ${c.notificheMeteo ? "✅" : "❌"}`
      ),
    ];
    return lines.join("\n");
  },

  utenteNonTrovato: "❌ Utente non trovato.",

  broadcastRiepilogo: (inviato: number, totale: number, falliti: number) =>
    falliti === 0
      ? `✅ Messaggio inviato a ${inviato}/${totale} utenti.`
      : `⚠️ Messaggio inviato a ${inviato}/${totale} utenti (${falliti} falliti).`,

  broadcastVuoto: "❌ Inserisci un messaggio da inviare: /admin broadcast &lt;testo&gt;",
};
```

- [ ] **Step 3: Commit**

---

### Task 3: Admin handlers + tests

**Files:**
- Create: `src/bot/admin/handlers.ts`
- Create: `tests/bot/admin/handlers.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi } from "vitest";
import { registerAdminHandlers } from "../../src/bot/admin/handlers.js";

describe("admin handlers", () => {
  const adminChatId = 999;
  const mockServices = {
    users: {
      findAllWithComuni: vi.fn(),
      findById: vi.fn(),
      findByTelegramId: vi.fn(),
      count: vi.fn(),
    },
    comuni: {},
    meteo: {},
  } as any;

  it("/admin mostra pannello admin", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply, match: "" } as any;
    // Need to test handler directly
  });
});
```

Actually, since handlers are defined as closures inside `registerAdminHandlers`, I need a different approach. Let me extract the handler logic.

I'll restructure `handlers.ts` to export individual handler functions AND a `registerAdminHandlers` function:

```typescript
export async function handleAdmin(ctx: Context, services: BotServices) { ... }
export async function handleAdminUtenti(ctx: Context, services: BotServices) { ... }
export async function handleAdminInfo(ctx: Context, services: BotServices) { ... }
export async function handleAdminBroadcast(ctx: Context, services: BotServices, bot: Bot) { ... }

export function registerAdminHandlers(bot: Bot, services: BotServices, adminChatId: number) {
  bot.command("admin", async (ctx) => {
    // route based on ctx.match
  });
}
```

This way I can test `handleAdminUtenti` etc. directly.

- [ ] **Step 2: Write tests for each handler**

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  handleAdmin,
  handleAdminUtenti,
  handleAdminInfo,
  handleAdminBroadcast,
} from "../../src/bot/admin/handlers.js";
import { adminMessages } from "../../src/bot/admin/messages.js";

describe("handleAdmin", () => {
  it("mostra messaggio di benvenuto admin", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;

    await handleAdmin(ctx, {} as any);

    expect(reply).toHaveBeenCalledWith(
      adminMessages.welcome,
      expect.objectContaining({}),
    );
  });
});

describe("handleAdminUtenti", () => {
  it("mostra statistiche utenti", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [{ url: "a" }] },
          { idTelegram: 2, comuni: [{ url: "b" }, { url: "c" }] },
        ]),
        count: vi.fn().mockResolvedValue(2),
      },
    } as any;

    await handleAdminUtenti(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("2"),
      expect.objectContaining({}),
    );
  });
});

describe("handleAdminInfo", () => {
  it("mostra dettagli utente per ID valido", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply, match: "123" } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          usernameTelegram: "test",
          nomeTelegram: "Test",
          creatoIl: new Date(),
          comuni: [],
        }),
      },
    } as any;

    await handleAdminInfo(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("123"),
      expect.objectContaining({}),
    );
  });

  it("mostra errore per ID non trovato", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply, match: "999" } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    await handleAdminInfo(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      adminMessages.utenteNonTrovato,
      expect.any(Object),
    );
  });

  it("mostra errore se match è vuoto", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply, match: "" } as any;

    await handleAdminInfo(ctx, {} as any);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("specifica un ID"),
      expect.any(Object),
    );
  });
});

describe("handleAdminBroadcast", () => {
  it("invia messaggio a tutti gli utenti", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const ctx = { reply: vi.fn().mockResolvedValue(undefined), match: "Ciao a tutti!" } as any;
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [] },
          { idTelegram: 2, comuni: [] },
        ]),
      },
    } as any;

    await handleAdminBroadcast(ctx, services, bot);

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(1, "Ciao a tutti!");
    expect(sendMessage).toHaveBeenCalledWith(2, "Ciao a tutti!");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("2/2"),
      expect.any(Object),
    );
  });

  it("mostra errore se messaggio è vuoto", async () => {
    const ctx = { reply: vi.fn().mockResolvedValue(undefined), match: "" } as any;

    await handleAdminBroadcast(ctx, {} as any, {} as any);

    expect(ctx.reply).toHaveBeenCalledWith(
      adminMessages.broadcastVuoto,
      expect.any(Object),
    );
  });

  it("gestisce errori di invio e riporta falliti", async () => {
    const sendMessage = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("bloccato"));
    const bot = { api: { sendMessage } } as any;
    const ctx = { reply: vi.fn().mockResolvedValue(undefined), match: "test" } as any;
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [] },
          { idTelegram: 2, comuni: [] },
        ]),
      },
    } as any;

    await handleAdminBroadcast(ctx, services, bot);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("1 falliti"),
      expect.any(Object),
    );
  });
});
```

- [ ] **Step 3: Create handler implementation**

```typescript
import type { Bot, Context } from "grammy";
import type { BotServices } from "../handlers.js";
import { adminMessages } from "./messages.js";
import { mainMenuKeyboard } from "../keyboards.js";

export async function handleAdmin(ctx: Context, _services: BotServices) {
  await ctx.reply(adminMessages.welcome, { reply_markup: mainMenuKeyboard() });
}

export async function handleAdminUtenti(ctx: Context, services: BotServices) {
  const users = await services.users.findAllWithComuni();
  const totaleUtenti = users.length;
  const totaleComuni = users.reduce((sum, u) => sum + u.comuni.length, 0);
  await ctx.reply(
    adminMessages.riepilogoUtenti(totaleUtenti, totaleComuni),
    { reply_markup: mainMenuKeyboard() },
  );
}

export async function handleAdminInfo(ctx: Context, services: BotServices) {
  const idStr = (ctx.match as string)?.trim();
  if (!idStr) {
    await ctx.reply("❌ Specifica un ID Telegram: /admin info &lt;id&gt;");
    return;
  }
  const id = Number(idStr);
  if (isNaN(id)) {
    await ctx.reply("❌ ID non valido.");
    return;
  }
  const user = await services.users.findByTelegramId(id);
  if (!user) {
    await ctx.reply(adminMessages.utenteNonTrovato, { reply_markup: mainMenuKeyboard() });
    return;
  }
  await ctx.reply(adminMessages.infoUtente(user), { reply_markup: mainMenuKeyboard() });
}

export async function handleAdminBroadcast(ctx: Context, services: BotServices, bot: Bot) {
  const testo = (ctx.match as string)?.trim() ?? "";
  if (!testo || testo === "broadcast") {
    await ctx.reply(adminMessages.broadcastVuoto, { reply_markup: mainMenuKeyboard() });
    return;
  }
  const users = await services.users.findAllWithComuni();
  let inviati = 0;
  let falliti = 0;
  for (const u of users) {
    try {
      await bot.api.sendMessage(u.idTelegram, testo);
      inviati++;
    } catch {
      falliti++;
    }
  }
  await ctx.reply(
    adminMessages.broadcastRiepilogo(inviati, users.length, falliti),
    { reply_markup: mainMenuKeyboard() },
  );
}

export function registerAdminHandlers(bot: Bot, services: BotServices, _adminChatId: number) {
  bot.command("admin", async (ctx) => {
    const text = (ctx.match as string)?.trim() ?? "";
    const sub = text.split(/\s+/)[0]?.toLowerCase() ?? "";

    if (sub === "utenti") return handleAdminUtenti(ctx, services);
    if (sub === "info") {
      const id = text.split(/\s+/).slice(1).join(" ");
      (ctx as any).match = id;
      return handleAdminInfo(ctx, services);
    }
    if (sub === "broadcast") {
      const msg = text.split(/\s+/).slice(1).join(" ");
      (ctx as any).match = msg;
      return handleAdminBroadcast(ctx, services, bot);
    }
    return handleAdmin(ctx, services);
  });
}
```

Wait, I should not mutate `ctx.match`. Instead, let me pass the args directly to the handler functions, or extract the parsing logic out of the handlers.

Actually, looking at the existing code pattern, `ctx.match` is used by grammy to pass the text after the command. For `/admin`, `ctx.match` would be the text after `/admin`. So `ctx.match` is fine.

But the issue is that `handleAdminInfo` and `handleAdminBroadcast` read `ctx.match` differently. Let me restructure:

For `handleAdminInfo`, `ctx.match` should be the ID.
For `handleAdminBroadcast`, `ctx.match` should be the message text.

In the `registerAdminHandlers` function, when routing the subcommand, I can set up the match appropriately. But mutating ctx is not great. Let me pass parameters explicitly.

Actually, the simplest approach is to not use ctx.match at all in the handler functions, and just accept the arguments directly. Then the `registerAdminHandlers` function handles the parsing.

Let me restructure:

```typescript
export async function handleAdmin(ctx: Context, _services: BotServices) { ... }

export async function handleAdminUtenti(ctx: Context, services: BotServices) { ... }

export async function handleAdminInfo(ctx: Context, services: BotServices, id: string) { ... }

export async function handleAdminBroadcast(ctx: Context, services: BotServices, bot: Bot, testo: string) { ... }

export function registerAdminHandlers(bot: Bot, services: BotServices, _adminChatId: number) {
  bot.command("admin", async (ctx) => {
    const fullText = (ctx.match as string)?.trim() ?? "";
    const parts = fullText.split(/\s+/);
    const sub = parts[0]?.toLowerCase() ?? "";

    if (sub === "utenti") return handleAdminUtenti(ctx, services);
    if (sub === "info") return handleAdminInfo(ctx, services, parts.slice(1).join(" "));
    if (sub === "broadcast") return handleAdminBroadcast(ctx, services, bot, parts.slice(1).join(" "));
    return handleAdmin(ctx, services);
  });
}
```

This is cleaner. Now update tests accordingly.

- [ ] **Step 4: Run tests**

```
npm test
```

- [ ] **Step 5: Commit**

---

### Task 4: Wire up in bot.ts

**Files:**
- Modify: `src/bot/bot.ts`

- [ ] **Step 1: Add imports and register admin handlers**

```typescript
import { registerAdminHandlers } from "./admin/handlers.js";
import { isAdmin } from "./admin/middleware.js";

export function createBot(config: Config, services: BotServices) {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  // ... existing setup ...

  bot.use(logUserMessage);
  registerHandlers(bot, services);

  const adminChatId = Number(config.ADMIN_CHAT_ID);
  if (adminChatId) {
    bot.use(isAdmin(adminChatId));
    registerAdminHandlers(bot, services, adminChatId);
  }

  return bot;
}
```

- [ ] **Step 2: Check that config.ADMIN_CHAT_ID is already a string (and handle conversion)**

Looking at the existing config, `ADMIN_CHAT_ID` is already a string from env. We need to convert to number.

- [ ] **Step 3: Run tests to verify everything passes**

```
npm test
```

- [ ] **Step 4: Commit**
