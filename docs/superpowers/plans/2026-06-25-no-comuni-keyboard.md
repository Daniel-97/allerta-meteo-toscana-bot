# Inline Keyboard Semplificata per Utenti Senza Comuni — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare una tastiera inline con solo "Aggiungi comune" e "Credits&Info" quando l'utente non ha comuni impostati.

**Architecture:** Nuova factory `noComuniInlineKeyboard()` in keyboards.ts, due nuove callback `add`/`credits` in handleCallbackQuery, sostituzione di `mainMenuKeyboard()` con la nuova inline in tutti i rami "no comuni" di handlers.ts.

**Tech Stack:** grammY (inline keyboard), Vitest (test)

## Global Constraints

- Tutti i nuovi file/convenzioni devono seguire `AGENTS.md`
- pattern in `tests/bot/handlers.test.ts` per test callback: mock ctx + services, vi.fn() per metodi
- Nessun export default (tranne `src/index.ts`)
- ESM puro con estensione `.js` negli import
- Nessun commento superfluo

---

### Task 1: `noComuniInlineKeyboard()` in keyboards.ts + test

**Files:**
- Modify: `src/bot/keyboards.ts`
- Create: `tests/bot/keyboards.test.ts`

**Interfaces:**
- Produces: `noComuniInlineKeyboard()` → `{ inline_keyboard: [[...], [...]] }`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { noComuniInlineKeyboard } from "../../src/bot/keyboards.js";

describe("noComuniInlineKeyboard", () => {
  it("restituisce due bottoni: Aggiungi comune e Credits&Info", () => {
    const result = noComuniInlineKeyboard();

    expect(result).toEqual({
      inline_keyboard: [
        [{ text: "➕ Aggiungi comune", callback_data: "add" }],
        [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
      ],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/bot/keyboards.test.ts
```
Expected: FAIL with `noComuniInlineKeyboard is not defined`

- [ ] **Step 3: Write minimal implementation**

In `src/bot/keyboards.ts`, aggiungere dopo `mappeMeteoInlineKeyboard()`:

```typescript
export function noComuniInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "➕ Aggiungi comune", callback_data: "add" }],
      [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/bot/keyboards.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/bot/keyboards.ts tests/bot/keyboards.test.ts
git commit -m "feat: aggiungi noComuniInlineKeyboard per utenti senza comuni"
```

---

### Task 2: Callback handlers `add` e `credits` + test

**Files:**
- Modify: `src/bot/handlers.ts`
- Modify: `tests/bot/handlers.test.ts`

**Interfaces:**
- Consumes: `noComuniInlineKeyboard()` da keyboards.ts
- Produces: handler per callback_data `"add"` e `"credits"` in `handleCallbackQuery`

- [ ] **Step 1: Write the failing tests**

Aggiungere in `tests/bot/handlers.test.ts`, prima della chiusura del `describe("handleCallbackQuery", ...)`:

```typescript
describe("action: add", () => {
  it("risponde alla callback e invia prompt aggiungi", async () => {
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "add" },
      answerCallbackQuery,
      reply,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(answerCallbackQuery).toHaveBeenCalledOnce();
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Digita almeno 3 lettere"),
    );
  });
});

describe("action: credits", () => {
  it("risponde alla callback e invia credits con inline keyboard", async () => {
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "credits" },
      answerCallbackQuery,
      reply,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(answerCallbackQuery).toHaveBeenCalledOnce();
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Come funziona"),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Aggiungi comune", callback_data: "add" }],
            [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
          ],
        },
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/bot/handlers.test.ts
```
Expected: FAIL — i nuovi test falliscono perché i branch non esistono

- [ ] **Step 3: Write minimal implementation**

In `src/bot/handlers.ts`, in `handleCallbackQuery`, aggiungere PRIMA del branch `"back"` (riga 167):

```typescript
  if (action === "add") {
    await ctx.answerCallbackQuery();
    await ctx.reply(messages.aggiungiPrompt);
    return;
  }

  if (action === "credits") {
    await ctx.answerCallbackQuery();
    await ctx.reply(messages.credits, { reply_markup: noComuniInlineKeyboard() });
    return;
  }
```

Aggiungere `noComuniInlineKeyboard` all'import da `./keyboards.js` (riga 7):

```typescript
import { mainMenuKeyboard, mappeMeteoInlineKeyboard, comuniInlineKeyboard, confermaInlineKeyboard, gestisciSubMenuKeyboard, comuniSelezioneInlineKeyboard, confermaEliminaInlineKeyboard, confermaModificaInlineKeyboard, noComuniInlineKeyboard } from "./keyboards.js";
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/bot/handlers.test.ts
```
Expected: ALL PASS (sia test nuovi che vecchi)

- [ ] **Step 5: Commit**

```bash
git add src/bot/handlers.ts tests/bot/handlers.test.ts
git commit -m "feat: aggiungi callback add e credits per tastiera no-comuni"
```

---

### Task 3: Sostituire `mainMenuKeyboard` con `noComuniInlineKeyboard` nei rami "no comuni"

**Files:**
- Modify: `src/bot/handlers.ts`

**Interfaces:**
- Consumes: `noComuniInlineKeyboard()` da keyboards.ts

Sostituire `mainMenuKeyboard()` con `noComuniInlineKeyboard()` in 6 punti dove
c'è `!user || user.comuni.length === 0`:

1. `handleAllerta` (riga 31):
   ```typescript
   await ctx.reply(messages.nessunComunePrevisioni, { reply_markup: noComuniInlineKeyboard() });
   ```

2. `handlePrevisioni` (riga 49):
   ```typescript
   await ctx.reply(messages.nessunComunePrevisioni, { reply_markup: noComuniInlineKeyboard() });
   ```

3. `hears("📋 Gestisci comuni")` (riga 96):
   ```typescript
   await ctx.reply(messages.gestisciComuni([]), { reply_markup: noComuniInlineKeyboard() });
   ```

4. `hears("🗑️ Elimina")` (riga 113):
   ```typescript
   await ctx.reply(messages.nessunComune, { reply_markup: noComuniInlineKeyboard() });
   ```

5. `hears("✏️ Modifica")` (riga 126):
   ```typescript
   await ctx.reply(messages.nessunComune, { reply_markup: noComuniInlineKeyboard() });
   ```

6. `hears("📋 Lista")` (riga 139):
   ```typescript
   await ctx.reply(messages.nessunComune, { reply_markup: noComuniInlineKeyboard() });
   ```

- [ ] **Step 1: Applicare le 6 sostituzioni in handlers.ts**

- [ ] **Step 2: Eseguire i test esistenti per verificare che non si rompa nulla**

```bash
npx vitest run
```
Expected: ALL PASS (le modifiche sono solo sul reply_markup; i test esistenti
usano `expect.any(Object)` o `expect.objectContaining({})` per reply_markup,
quindi non dovrebbero rompersi)

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers.ts
git commit -m "feat: sostituisci mainMenuKeyboard con noComuniInlineKeyboard nei rami no-comuni"
```

---

### Task 4: Keyboard condizionale su start, Indietro, Credits&Info, del-confirm

**Files:**
- Modify: `src/bot/handlers.ts`

**Interfaces:**
- Consumes: `noComuniInlineKeyboard()` da keyboards.ts

- [ ] **Step 1: Modificare `bot.command("start")`**

Da:
```typescript
bot.command("start", async (ctx) => {
  await ctx.reply(messages.welcome, { reply_markup: mainMenuKeyboard() });
});
```

A:
```typescript
bot.command("start", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  const hasComuni = user && user.comuni.length > 0;
  await ctx.reply(messages.welcome, { reply_markup: hasComuni ? mainMenuKeyboard() : noComuniInlineKeyboard() });
});
```

- [ ] **Step 2: Modificare `hears("🔙 Indietro")`**

Da:
```typescript
bot.hears("🔙 Indietro", async (ctx) => {
  await ctx.reply(messages.welcome, { reply_markup: mainMenuKeyboard() });
});
```

A:
```typescript
bot.hears("🔙 Indietro", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  const hasComuni = user && user.comuni.length > 0;
  await ctx.reply(messages.welcome, { reply_markup: hasComuni ? mainMenuKeyboard() : noComuniInlineKeyboard() });
});
```

- [ ] **Step 3: Modificare `hears("ℹ️ Credits&Info")`**

Da:
```typescript
bot.hears("ℹ️ Credits&Info", async (ctx) => {
  await ctx.reply(messages.credits, { reply_markup: mainMenuKeyboard() });
});
```

A:
```typescript
bot.hears("ℹ️ Credits&Info", async (ctx) => {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  const hasComuni = user && user.comuni.length > 0;
  await ctx.reply(messages.credits, { reply_markup: hasComuni ? mainMenuKeyboard() : noComuniInlineKeyboard() });
});
```

- [ ] **Step 4: Modificare `del-confirm` in handleCallbackQuery**

Aggiungere `findByTelegramId` dopo `removeComune` per decidere la keyboard:

```typescript
if (action === "del-confirm") {
  const [, url, nome] = parts;
  const idTelegram = ctx.from?.id;
  if (!idTelegram) return;
  await services.users.removeComune(idTelegram, url);
  await safeEditMessageText(ctx, messages.eliminato(nome), {
    reply_markup: { inline_keyboard: [] },
  });
  const user = await services.users.findByTelegramId(idTelegram);
  const hasComuni = user && user.comuni.length > 0;
  await ctx.reply(messages.eliminato(nome), { reply_markup: hasComuni ? mainMenuKeyboard() : noComuniInlineKeyboard() });
  return;
}
```

- [ ] **Step 5: Eseguire i test**

```bash
npx vitest run
```
Expected: ALL PASS. I test esistenti per del-confirm mockano `services.users`
con solo `removeComune`, quindi potrebbero rompersi perché ora serve anche
`findByTelegramId`. Se falliscono, aggiornare i mock nei test per includere
`findByTelegramId`.

- [ ] **Step 6: Se i test del-confirm falliscono, aggiornare i mock**

In `tests/bot/handlers.test.ts`, nel `describe("del-confirm callback", ...)`,
aggiornare il mock di `services`:

```typescript
it("chiama removeComune e mostra conferma", async () => {
  const removeComune = vi.fn().mockResolvedValue(undefined);
  const findByTelegramId = vi.fn().mockResolvedValue({
    idTelegram: 123,
    comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
  });
  const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
  const services = { users: { removeComune, findByTelegramId } } as any;

  await handleCallbackQuery(ctx, services);

  expect(removeComune).toHaveBeenCalledWith(123, "firenze");
  expect(ctx.reply).toHaveBeenCalledWith(
    expect.stringContaining("Firenze rimosso"),
    expect.any(Object),
  );
});

it("usa noComuniInlineKeyboard se l'utente non ha più comuni", async () => {
  const removeComune = vi.fn().mockResolvedValue(undefined);
  const findByTelegramId = vi.fn().mockResolvedValue({
    idTelegram: 123,
    comuni: [],
  });
  const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
  const services = { users: { removeComune, findByTelegramId } } as any;

  await handleCallbackQuery(ctx, services);

  expect(ctx.reply).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Aggiungi comune", callback_data: "add" }],
          [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
        ],
      },
    }),
  );
});
```

- [ ] **Step 7: Eseguire i test dopo gli aggiornamenti**

```bash
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add src/bot/handlers.ts tests/bot/handlers.test.ts
git commit -m "feat: keyboard condizionale su start, indietro, credits, del-confirm"
```

---

### Task 5: Aggiornare README

**Files:**
- Modify: `README.md`

Per AGENTS.md, ogni modifica a menu bot richiede aggiornamento README.

- [ ] **Step 1: Leggere README.md per capire la sezione menu da aggiornare**

```bash
grep -n -i "menu\|tasti\|pulsanti\|keyboard" README.md
```

- [ ] **Step 2: Aggiornare la sezione del menu per menzionare la tastiera inline semplificata per nuovi utenti**

Cercare la sezione "Menu a bottoni" o equivalente e aggiungere una nota sulla
tastiera inline semplificata mostrata agli utenti senza comuni.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: aggiorna README con tastiera inline no-comuni"
```

---

### Task 6: Verifica finale

- [ ] **Step 1: Eseguire l'intera suite di test**

```bash
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 2: Verificare il type checking**

```bash
npx tsc --noEmit
```
Expected: No errors
