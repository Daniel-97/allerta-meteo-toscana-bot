# Mappe meteo su richiesta — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rimuovere album immagini automatico dalle previsioni meteo, aggiungere pulsante inline "Mostra mappe meteo" per richiedere l'album volontariamente.

**Architecture:** Nuova funzione `mappeMeteoInlineKeyboard()` in keyboards.ts; modifica handler previsioni e scheduler per non inviare più album; nuovo callback `img` in `handleCallbackQuery`.

**Tech Stack:** grammY, TypeScript, Vitest

## Global Constraints

- ESM puro, `"type": "module"`, import con `.js`
- `strict: true` TypeScript
- No classi, solo factory functions
- Test con Vitest (`globals: true`)

---

### Task 1: Aggiungere `mappeMeteoInlineKeyboard` in keyboards.ts

**Files:**
- Modify: `src/bot/keyboards.ts`

- [ ] **Step 1: Aggiungere funzione**

Aggiungere dopo `confermaInlineKeyboard`:

```typescript
export function mappeMeteoInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🖼️ Mostra mappe meteo", callback_data: "img" }],
    ],
  };
}
```

### Task 2: Modificare handlePrevisioni e aggiungere callback img

**Files:**
- Modify: `src/bot/handlers.ts`

- [ ] **Step 1: Aggiungere import**

```typescript
import { mainMenuKeyboard, mappeMeteoInlineKeyboard, comuniInlineKeyboard, ... } from "./keyboards.js";
```

- [ ] **Step 2: Modificare handlePrevisioni**

Rimuovere `ctx.replyWithMediaGroup(costruisciAlbumImmagini())` e sostituire `mainMenuKeyboard()` con `mappeMeteoInlineKeyboard()`.

- [ ] **Step 3: Aggiungere handler `img` in handleCallbackQuery**

Prima del `return` finale:

```typescript
if (action === "img") {
  await ctx.answerCallbackQuery();
  await ctx.replyWithMediaGroup(costruisciAlbumImmagini());
  return;
}
```

### Task 3: Modificare broadcastNotifiche in scheduler.ts

**Files:**
- Modify: `src/bot/scheduler.ts`

- [ ] **Step 1: Aggiungere import**

```typescript
import { costruisciAlbumImmagini, messages } from "./messages.js";
import { mappeMeteoInlineKeyboard } from "./keyboards.js";
```

- [ ] **Step 2: Sostituire blocco sendMediaGroup**

Invece di inviare album, passare `reply_markup` al `sendMessage` quando `notificheMeteo=true`.

### Task 4: Aggiornare test

**Files:**
- Modify: `tests/bot/handlers.test.ts`
- Modify: `tests/bot/scheduler.test.ts`

- [ ] **Step 1: Aggiornare test handlePrevisioni**

Rimuovere asserzioni `replyWithMediaGroup`, aggiungere verifica `reply_markup` con bottone `img`.

- [ ] **Step 2: Aggiornare test broadcastNotifiche**

`sendMediaGroup` non deve essere chiamato. `sendMessage` deve ricevere `reply_markup` se notificheMeteo=true.

### Task 5: Aggiornare README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Aggiornare sezione "Album immagini meteo"**

Documentare che le immagini vengono inviate solo su richiesta tramite pulsante.

### Task 6: Verifica finale

- [ ] **Step 1: Eseguire i test**

```bash
npm test
```
Expected: tutti i test passano.
