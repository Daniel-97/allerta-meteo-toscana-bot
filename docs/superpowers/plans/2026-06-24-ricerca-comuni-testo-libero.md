# Ricerca comuni a testo libero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to search comuni by typing free text (≥3 chars) without needing the `/aggiungi` command prefix.

**Architecture:** Stateless — a catch-all `on("message:text")` handler intercepts unrecognized messages. If text ≥3 chars and doesn't start with `/`, it calls existing `searchByPrefix` and shows results as inline keyboard. The `➕ Aggiungi` button and `/aggiungi` without args now prompt the user to type.

**Tech Stack:** Grammy, TypeScript, Vitest

---

### Task 1: Aggiungere nuovi messaggi

**Files:**
- Modify: `src/bot/messages.ts:84-87`

- [ ] **Step 1: Aggiungi messaggi a messages.ts**

In `src/bot/messages.ts`, aggiungere dopo `impostaNonTrovato`:

```typescript
  aggiungiPrompt:
    "🔍 Digita almeno 3 lettere del nome del comune per iniziare la ricerca.",

  ricercaNonTrovato: (testo: string) =>
    `Nessun comune trovato per '${escHtml(testo)}'. Se stavi cercando un comune, riprova con un nome diverso.`,

  ricercaTrovati: (count: number, testo: string) =>
    `📍 Ho trovato ${count} comuni per '${escHtml(testo)}':`,
```

- [ ] **Step 2: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: nessun errore

- [ ] **Step 3: Commit**

```bash
git add src/bot/messages.ts
git commit -m "feat: add free-text search messages"
```

---

### Task 2: Aggiungere handler per testo libero e modificare esistenti

**Files:**
- Modify: `src/bot/handlers.ts`
- Modify: `src/bot/messages.ts` (già fatto in Task 1)
- Test: `tests/bot/handlers.test.ts` (Task 3)

- [ ] **Step 1: Esporta funzione `handleRichiestaTestoLibero`**

In `src/bot/handlers.ts`, aggiungere dopo `handlePrevisioni` (riga 60) e prima di `registerHandlers`:

```typescript
export async function handleRichiestaTestoLibero(
  ctx: Context,
  services: BotServices,
) {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith("/") || text.length < 3) return;
  const risultati = await services.comuni.searchByPrefix(text);
  if (risultati.length === 0) {
    await ctx.reply(messages.ricercaNonTrovato(text));
    return;
  }
  await ctx.reply(messages.ricercaTrovati(risultati.length, text), {
    reply_markup: comuniInlineKeyboard(risultati),
  });
}
```

- [ ] **Step 2: Modifica handler `➕ Aggiungi`**

Riga 149-151, cambiare `messages.impostaPrompt` in `messages.aggiungiPrompt`:

```typescript
  bot.hears("➕ Aggiungi", async (ctx) => {
    await ctx.reply(messages.aggiungiPrompt);
  });
```

- [ ] **Step 3: Modifica handler `/aggiungi` senza argomenti**

Riga 81-85, cambiare `messages.impostaPrompt` in `messages.aggiungiPrompt`:

```typescript
  bot.command("aggiungi", async (ctx) => {
    const text = ctx.match?.trim() ?? "";
    if (!text) {
      await ctx.reply(messages.aggiungiPrompt);
      return;
    }
    // ... resto invariato
  });
```

- [ ] **Step 4: Registra handler generico alla fine di `registerHandlers`**

Dopo `bot.command("help", ...)` (riga 202-204), aggiungere:

```typescript
  bot.on("message:text", (ctx) => handleRichiestaTestoLibero(ctx, services));
```

- [ ] **Step 5: Verifica compilazione**

Run: `npx tsc --noEmit`
Expected: nessun errore

- [ ] **Step 6: Commit**

```bash
git add src/bot/handlers.ts
git commit -m "feat: add free-text search handler, update aggiungi prompt"
```

---

### Task 3: Test handler testo libero

**Files:**
- Modify: `tests/bot/handlers.test.ts`

- [ ] **Step 1: Aggiungi test per `handleRichiestaTestoLibero`**

Alla fine del file `tests/bot/handlers.test.ts`, aggiungere:

```typescript
import { handleRichiestaTestoLibero } from "../../src/bot/handlers.js";

describe("handleRichiestaTestoLibero", () => {
  const baseServices = {
    comuni: {
      searchByPrefix: vi.fn(),
    },
  };

  it("ignora testo con meno di 3 caratteri", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "ab" },
      reply,
    } as any;

    await handleRichiestaTestoLibero(ctx, baseServices as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("ignora comandi (testo che inizia con /)", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "/start" },
      reply,
    } as any;

    await handleRichiestaTestoLibero(ctx, baseServices as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("ignora testo vuoto", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "" },
      reply,
    } as any;

    await handleRichiestaTestoLibero(ctx, baseServices as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("mostra risultati quando la ricerca ha match", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "pis" },
      reply,
    } as any;
    const services = {
      comuni: {
        searchByPrefix: vi.fn().mockResolvedValue([
          { nome: "Pisa", url: "pisa" },
          { nome: "Pistoia", url: "pistoia" },
        ]),
      },
    };

    await handleRichiestaTestoLibero(ctx, services as any);

    expect(services.comuni.searchByPrefix).toHaveBeenCalledWith("pis");
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Pisa"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
  });

  it("mostra messaggio non trovato quando la ricerca non ha match", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "xyzxyz" },
      reply,
    } as any;
    const services = {
      comuni: {
        searchByPrefix: vi.fn().mockResolvedValue([]),
      },
    };

    await handleRichiestaTestoLibero(ctx, services as any);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("non trovato"),
    );
  });
});
```

- [ ] **Step 2: Esegui i test**

Run: `npx vitest run tests/bot/handlers.test.ts`
Expected: tutti i test PASS (sia nuovi che esistenti)

- [ ] **Step 3: Commit**

```bash
git add tests/bot/handlers.test.ts
git commit -m "test: add free-text search handler tests"
```

---

### Task 4: Aggiornare README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Aggiorna descrizione comando `/aggiungi`**

Cercare la riga col comando `/aggiungi` nella sezione "Comandi bot" e aggiornare la descrizione per menzionare anche la ricerca a testo libero.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with free-text search"
```
