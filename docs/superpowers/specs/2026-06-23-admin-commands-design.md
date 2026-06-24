# Admin Commands Design

**Date:** 2026-06-23
**Status:** Approved

## Problem

Il bot manca di un'interfaccia per l'amministratore per gestire gli utenti registrati, visualizzare statistiche e inviare messaggi broadcast. Esiste già `ADMIN_CHAT_ID` nelle variabili d'ambiente ma non è utilizzato.

## Architecture

Nuovo modulo separato:

```
src/bot/admin/
  middleware.ts   — guard isAdmin(adminChatId)
  handlers.ts     — registrazione comandi admin
  messages.ts     — template messaggi admin
```

L'admin rimane anche un utente normale (può usare /allerta, /previsioni, ecc.). I comandi admin semplicemente non esistono per chi non è admin.

## Middleware — `isAdmin`

```typescript
export function isAdmin(adminChatId: number) {
  return (ctx: Context, next: NextFunction) => {
    if (ctx.from?.id === adminChatId) return next();
  };
}
```

Se non chiama `next()` il comando non arriva all'handler. Silenzioso — nessun messaggio di "accesso negato".

Registrato in `bot.ts` prima degli admin handlers, dopo quelli utente.

## Comandi

| Comando | Azione |
|---|---|
| `/admin` | Messaggio di benvenuto admin con elenco comandi disponibili |
| `/admin utenti` | Statistiche: totale utenti, totale comuni seguiti |
| `/admin info <id>` | Dettaglio utente: ID, username, nome, data registrazione, comuni con stato notifiche |
| `/admin broadcast <testo>` | Invia testo a tutti gli utenti registrati |

### `/admin`

Mostra messaggio con elenco comandi admin. Usa `mainMenuKeyboard()` (admin torna al menu normale).

### `/admin utenti`

Usa `findAllWithComuni()`. Mostra:
- Totale utenti registrati
- Totale comuni seguiti
- Nessun dettaglio personale visibile in lista

### `/admin info <id>`

Cerca utente per ID Telegram via `findByTelegramId()`. Mostra:
- ID Telegram
- Username Telegram
- Nome Telegram
- Data di registrazione (`creatoIl`)
- Per ogni comune: nome, notifiche allerta ✅/❌, notifiche meteo ✅/❌

Se ID non trovato → messaggio "Utente non trovato".

### `/admin broadcast <testo>`

Itera tutti gli utenti da `findAllWithComuni()` e chiama `bot.api.sendMessage()` per ciascuno (senza deduplicazione — un messaggio per utente, non per comune).

Errori (bot bloccato, chat terminata, ecc.) silenziosamente ignorati — `try/catch` per-utente.

Al termine: riepilogo in chat admin.

## Modifiche a file esistenti

### `src/bot/bot.ts`

```typescript
import { registerAdminHandlers } from "./admin/handlers.js";
import { isAdmin } from "./admin/middleware.js";

// in createBot(), dopo registerHandlers:
const adminChatId = Number(config.ADMIN_CHAT_ID);
bot.use(isAdmin(adminChatId));
registerAdminHandlers(bot, services, adminChatId);
```

### `src/services/users.ts`

Aggiungere campo `creatoIl` alla `User` interface:

```typescript
export interface User {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  creatoIl: Date;          // NUOVO
  comuni: UserComune[];
}
```

Aggiornare `rowToUser` per includere `creatoIl` dal DB (esiste già nello schema `utenti.creatoIl`).

Aggiungere metodo `count()`:

```typescript
count(): Promise<number>;
```

Implementazione: `SELECT COUNT(*) FROM utenti`.

## Messages

### `src/bot/admin/messages.ts`

```typescript
export const adminMessages = {
  welcome: (
    "👑 <b>Pannello Admin</b>\n\n" +
    "/admin utenti — Statistiche utenti\n" +
    "/admin info &lt;id&gt; — Info su un utente\n" +
    "/admin broadcast &lt;testo&gt; — Invia messaggio a tutti"
  ),

  riepilogoUtenti: (totale: number, comuniTotali: number) =>
    `👥 <b>Utenti registrati:</b> ${totale}\n📍 <b>Comuni seguiti:</b> ${comuniTotali}`,

  infoUtente: (u: { idTelegram: number; usernameTelegram: string | null; nomeTelegram: string; creatoIl: Date; comuni: { nome: string; notificheMeteo: boolean }[] }) =>
    `<b>👤 Utente</b>\n` +
    `🆔 <code>${u.idTelegram}</code>\n` +
    `👤 Username: ${u.usernameTelegram ? "@" + escHtml(u.usernameTelegram) : "—"}\n` +
    `📛 Nome: ${escHtml(u.nomeTelegram)}\n` +
    `📅 Registrato: ${u.creatoIl.toLocaleDateString("it-IT")}\n\n` +
    `<b>📍 Comuni (${u.comuni.length})</b>\n` +
    u.comuni.map(c => `• ${escHtml(c.nome)}  🔔 ${c.notificheMeteo ? "✅" : "❌"}`).join("\n"),

  utenteNonTrovato: "❌ Utente non trovato.",

  broadcastRiepilogo: (inviato: number, totale: number, falliti: number) =>
    falliti === 0
      ? `✅ Messaggio inviato a ${inviato}/${totale} utenti.`
      : `⚠️ Messaggio inviato a ${inviato}/${totale} utenti (${falliti} falliti).`,

  broadcastVuoto: "❌ Inserisci un messaggio da inviare: /admin broadcast &lt;testo&gt;",
};
```

## Error handling

- Middleware non chiama `next` → comandi admin invisibili ai non-admin
- `/admin info` con ID non valido → messaggio "Utente non trovato"
- `/admin broadcast` senza testo → messaggio "Inserisci un messaggio"
- Broadcast falliti → silenziosi, solo conteggio nel riepilogo
- Se `ADMIN_CHAT_ID` non è un numero valido → errore al caricamento (già in config)

## Test

### Nuovi test

- `src/bot/admin/middleware.ts`:
  - Chiama `next()` se `ctx.from.id === adminChatId`
  - Non chiama `next()` se diverso

- `src/bot/admin/handlers.ts`:
  - `/admin utenti` → messaggio con statistiche
  - `/admin info <id>` esistente → dettaglio utente
  - `/admin info <id>` inesistente → "Utente non trovato"
  - `/admin broadcast <testo>` → chiama sendMessage per ogni utente
  - `/admin broadcast` senza testo → prompt

### Modifiche a test esistenti

- `tests/bot/handlers.test.ts`: nessuna modifica (admin è separato)
- `tests/services/users.test.ts`: aggiornare test `findByTelegramId` per includere `creatoIl`

## Files modificati

| File | Modifiche |
|---|---|
| `src/bot/admin/middleware.ts` | NUOVO — isAdmin guard |
| `src/bot/admin/handlers.ts` | NUOVO — comandi admin |
| `src/bot/admin/messages.ts` | NUOVO — messaggi admin |
| `src/bot/bot.ts` | Registra middleware + admin handlers |
| `src/services/users.ts` | Aggiunge `creatoIl` a User; aggiunge `count()` |
| `tests/services/users.test.ts` | Aggiorna test per `creatoIl` |
