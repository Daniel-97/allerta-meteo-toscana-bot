# Inline keyboard semplificata per utenti senza comuni

## Obiettivo

Se l'utente non ha impostato nessun comune, mostrare una tastiera inline
semplificata con i soli pulsanti per aggiungere un comune e per credits&info,
invece della reply keyboard completa.

## Specifica

### Nuova funzione in `src/bot/keyboards.ts`

```
noComuniInlineKeyboard()
```

Restituisce un oggetto inline_keyboard con due bottoni:

- `[ "➕ Aggiungi comune" ]` → callback_data: `"add"`
- `[ "ℹ️ Credits&Info" ]` → callback_data: `"credits"`

### Nuove callback in `src/bot/handlers.ts`

Aggiungere due branch nell'handler `handleCallbackQuery`:

| Action | Comportamento |
|---|---|
| `"add"` | `ctx.answerCallbackQuery()`, poi `ctx.reply(messages.aggiungiPrompt)` |
| `"credits"` | `ctx.answerCallbackQuery()`, poi `ctx.reply(messages.credits, { reply_markup: noComuniInlineKeyboard() })` |

### Sostituzioni puntuali

Ovunque in `handlers.ts` ci sia `!user || user.comuni.length === 0` seguito da
`reply_markup: mainMenuKeyboard()`, sostituire con
`reply_markup: noComuniInlineKeyboard()`.

Punti interessati:

- `handleAllerta` — riga 31
- `handlePrevisioni` — riga 49
- `hears("📋 Gestisci comuni")` — riga 96 (usa `gestisciSubMenuKeyboard()`)
- `hears("🗑️ Elimina")` — riga 113
- `hears("✏️ Modifica")` — riga 126
- `hears("📋 Lista")` — riga 139

### Comandi con check condizionale

Questi comandi fanno una query DB per determinare la keyboard:

- `bot.command("start")` — ora non fa query; deve chiamare
  `findByTelegramId` e scegliere keyboard in base a `user.comuni.length > 0`
- `hears("🔙 Indietro")` — idem
- `hears("ℹ️ Credits&Info")` — idem

### Dopo operazioni distruttive

- `"del-confirm"`: dopo aver rimosso il comune, fare `findByTelegramId` per
  controllare se l'utente ha ancora comuni; scegliere keyboard di conseguenza
- `"mod-set"`: non cambia il numero di comuni, nessun cambiamento necessario

### Flusso UX

```
Nuovo utente avvia bot
  ↓
Welcome + inline keyboard [➕ Aggiungi comune] [ℹ️ Credits&Info]
  ↓ (clicca "Aggiungi comune")
Prompt "Digita almeno 3 lettere..."
  ↓ (scrive "Firenze")
Lista comuni → clicca comune → conferma → ✅
  ↓
mainMenuKeyboard() — ora ha comuni, via libera
  ↓ (se elimina l'ultimo comune)
noComuniInlineKeyboard() — ritorna alla vista semplificata
```

### File modificati

- `src/bot/keyboards.ts` — nuova funzione
- `src/bot/handlers.ts` — callback handler, sostituzioni, check condizionali

### Cosa NON cambia

- Il flusso di aggiunta comuni (testo libero + callback `sel`/`sub`)
- Il flusso di gestione comuni (Elimina, Modifica, Lista) quando l'utente ha
  comuni
- I messaggi di testo
- I servizi (`users.ts`, `comuni.ts`, `meteo.ts`)
- I test
