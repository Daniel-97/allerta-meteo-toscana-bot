# Design: Mappe meteo su richiesta

**Data:** 2026-06-23
**Stato:** Bozza

## Obiettivo

Non inviare più l'album di 9 immagini meteo automaticamente nei messaggi
di previsione (sia su richiesta che in notifica programmata). Inserire invece
un pulsante inline sotto il messaggio che permetta all'utente di richiedere
l'album volontariamente, mantenendo i messaggi più puliti.

## Contesto

Il bot attualmente (al commit corrente):

- `handlePrevisioni` (`src/bot/handlers.ts`): per ogni comune dell'utente,
  invia testo previsioni + album 9 immagini
- `broadcastNotifiche` (`src/bot/scheduler.ts`): se `notificheMeteo=true`,
  invia testo completo + album 9 immagini

Le immagini sono regionali (LAMMA Toscana), identiche per tutti i comuni.

## Specifica

### 1. Nuova tastiera inline (`src/bot/keyboards.ts`)

Funzione esportata:

```typescript
export function mappeMeteoInlineKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🖼️ Mostra mappe meteo", callback_data: "img" }],
    ],
  };
}
```

### 2. `handlePrevisioni` — rimosso album, aggiunto pulsante

In `src/bot/handlers.ts`, funzione `handlePrevisioni`:

- Rimuovere `ctx.replyWithMediaGroup(costruisciAlbumImmagini())`
- Sostituire `reply_markup: mainMenuKeyboard()` con
  `reply_markup: mappeMeteoInlineKeyboard()`
- Aggiungere import di `mappeMeteoInlineKeyboard` da `./keyboards.js`

### 3. Nuovo callback handler `img`

In `handleCallbackQuery` (`src/bot/handlers.ts`), prima del `return` finale:

```typescript
if (action === "img") {
  await ctx.answerCallbackQuery();
  await ctx.replyWithMediaGroup(costruisciAlbumImmagini());
  return;
}
```

`answerCallbackQuery()` rimuove il loading state sul pulsante Telegram.

### 4. `broadcastNotifiche` — rimosso album, aggiunto pulsante

In `src/bot/scheduler.ts`:

- Aggiungere import di `mappeMeteoInlineKeyboard` da `./keyboards.js`
- Sostituire:
  ```typescript
  if (comune.notificheMeteo) {
    await bot.api.sendMediaGroup(user.idTelegram, costruisciAlbumImmagini());
  }
  ```
  Con: passare `reply_markup: mappeMeteoInlineKeyboard()` al `sendMessage`
  quando `notificheMeteo=true`.

### 5. Test

#### `tests/bot/handlers.test.ts`

- Rimuovere asserzioni `replyWithMediaGroup` in `handlePrevisioni`
- Verificare che `reply` sia chiamata con `reply_markup` contenente il
  pulsante `img`

#### `tests/bot/scheduler.test.ts`

- `sendMediaGroup` non deve essere chiamato
- `sendMessage` deve ricevere `reply_markup` se `notificheMeteo=true`,
  altrimenti no

### 6. README

Aggiornare la sezione "Album immagini meteo" per riflettere che le immagini
vengono inviate solo su richiesta tramite pulsante.

## Comportamento UX

- **Su richiesta (`/previsioni` / `🌤️ Aggiorna meteo`)**: messaggio meteo
  pulito con pulsante `[🖼️ Mostra mappe meteo]`. Cliccando → album inviato.
  Custom keyboard ricompare al prossimo messaggio del bot.
- **Notifica programmata**: stesso pattern. Se `notificheMeteo=true`,
  messaggio completo con pulsante. Se `notificheMeteo=false`, solo allerta
  senza pulsante.
- **Multi-comune**: ogni messaggio ha il suo pulsante. L'utente decide per
  quali comuni vedere le mappe. Le immagini sono regionali (identiche), ma
  ogni click produce un album separato.

## File modificati

| File | Modifica |
|---|---|
| `src/bot/keyboards.ts` | + `mappeMeteoInlineKeyboard()` |
| `src/bot/handlers.ts` | - album in `handlePrevisioni`, + handler `img`, + import |
| `src/bot/scheduler.ts` | - album in `broadcastNotifiche`, + pulsante su `notificheMeteo=true` |
| `tests/bot/handlers.test.ts` | Aggiornare test `handlePrevisioni` |
| `tests/bot/scheduler.test.ts` | Aggiornare test `broadcastNotifiche` |
| `README.md` | Aggiornare sezione immagini |
