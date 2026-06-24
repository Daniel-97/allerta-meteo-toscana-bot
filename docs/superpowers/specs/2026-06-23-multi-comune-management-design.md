# Multi-comune Management Design

**Date:** 2026-06-23
**Status:** Approved (updated)

## Problem

Il bot attualmente permette di impostare un solo comune via `/imposta`. Con l'introduzione del supporto multi-comune (già presente a livello DB con `utentiComuni`), servono comandi dedicati per gestire la lista dei propri comuni.

## Comandi

| Comando | Descrizione |
|---|---|
| `/aggiungi <nome>` | Cerca e aggiunge un comune (sostituisce `/imposta`) |
| `/elimina` | Mostra selezione comuni → sceglie → conferma → elimina |
| `/modifica` | Mostra selezione comuni → sceglie → SI/NO notifiche → aggiorna |
| `/lista` | Mostra lista comuni con impostazioni |

## Tastiera

- `mainMenuKeyboard`: bottone `"Imposta comune"` → `"Gestisci comuni"`
- Alla pressione di "Gestisci comuni":
  1. Mostra lista comuni utente formattata
  2. Mostra tastiera reply `gestisciSubMenuKeyboard`:
     - `[Modifica] [Aggiungi]`
     - `[Elimina] [Lista]`
- Ogni bottone del submenu gestisce l'azione corrispondente
- Al termine di ogni azione → ritorno a `mainMenuKeyboard`

## Flussi

### Gestisci comuni / `/lista`
1. Carica comuni utente via `findByTelegramId`
2. Se nessun comune → messaggio `nessunComune` + `mainMenuKeyboard`
3. Se ha comuni → `gestisciComuni(comuni)` + `gestisciSubMenuKeyboard()`

### `/aggiungi <nome>` (ex `/imposta`)
1. Se nessun argomento → prompt `impostaPrompt`
2. Cerca per nome via `searchByPrefix`
3. Mostra risultati con `comuniInlineKeyboard` (callback `sel:url:nome`)
4. Utente seleziona → mostra conferma con `confermaInlineKeyboard` (callback `sub:url:nome:flag`)
5. Salva/subscribe → `mainMenuKeyboard`

### `/elimina` — o tasto "Elimina"
1. Messaggio "Seleziona comune da eliminare:" + `comuniSelezioneInlineKeyboard(comuni, "del")`
2. Utente seleziona → callback `del:url:nome` → conferma "Eliminare {nome}?" con `confermaEliminaInlineKeyboard`
3. Utente conferma → `removeComune` → messaggio `eliminato(nome)` + `mainMenuKeyboard`

### `/modifica` — o tasto "Modifica"
1. Messaggio "Seleziona comune da modificare:" + `comuniSelezioneInlineKeyboard(comuni, "mod")`
2. Utente seleziona → callback `mod:url:nome` → stato attuale + `confermaModificaInlineKeyboard`
3. Utente sceglie SI/NO → `updateNotificheMeteo` → messaggio `modificato(nome, stato)` + `mainMenuKeyboard`

## Callback Data

```
manage              → mostra lista + submenu keyboard
sel:url:nome        → seleziona comune (esistente)
sub:url:nome:flag   → conferma subscribe (esistente)
mod:url:nome        → mostra modifica SI/NO
mod-set:url:nome:flag → esegui modifica
del:url:nome        → mostra elimina SI/NO
del-confirm:url:nome → esegui eliminazione
annulla             → annulla operazione
```

RIMOSSO: `add` (non più necessario, il flusso aggiungi parte dal tasto "Aggiungi" reply)

## Service Layer — 2 nuovi metodi

```typescript
interface UsersRepository {
  findByTelegramId(id: number): Promise<User | undefined>;
  subscribe(input: SubscribeInput): Promise<void>;
  findAllWithComuni(): Promise<User[]>;
  removeComune(idTelegram: number, comuneUrl: string): Promise<void>;
  updateNotificheMeteo(idTelegram: number, comuneUrl: string, notificheMeteo: boolean): Promise<void>;
}
```

### `removeComune`
DELETE da `utentiComuni` WHERE `idTelegram` = ? AND `comuneUrl` = ?

### `updateNotificheMeteo`
UPDATE `utentiComuni` SET `notificheMeteo` = ? WHERE `idTelegram` = ? AND `comuneUrl` = ?

## Keyboard

### `gestisciSubMenuKeyboard()`
```
Keyboard reply:
  [Modifica]  [Aggiungi]
  [Elimina]   [Lista]
```

### `comuniSelezioneInlineKeyboard(comuni, action)`
Inline keyboard — ogni comune è un bottone con callback `action:url:nome`

### `confermaEliminaInlineKeyboard(url, nome)`
- `[SI, elimina]` → callback `del-confirm:url:nome`
- `[NO, annulla]` → callback `annulla`

### `confermaModificaInlineKeyboard(url, nome)`
- `[SI]` → callback `mod-set:url:nome:1`
- `[NO]` → callback `mod-set:url:nome:0`

### `comuniInlineKeyboard(comuni)` (esistente)
Per risultati ricerca /aggiungi.

### `confermaInlineKeyboard(url, nome)` (esistente)
Per conferma subscribe SI/NO.

RIMOSSA: `gestisciComuniKeyboard` (non più necessaria)

## Messages

```typescript
nessunComune: "Non hai ancora impostato comuni. Usa /aggiungi per iniziare."

confermaElimina: (nome) => `Eliminare ${nome} dalla tua lista?`

eliminato: (nome) => `✅ ${nome} rimosso dalla tua lista.`

confermaModifica: (nome, stato) =>
  `Notifiche meteo per ${nome}: attualmente ${stato}. Modificare?`

modificato: (nome, stato) =>
  `✅ Notifiche meteo per ${nome}: ${stato}.`

selezionaComuneDaEliminare: "📍 Seleziona il comune che vuoi eliminare:"

selezionaComuneDaModificare: "📍 Seleziona il comune che vuoi modificare:"
```

### `gestisciComuni(comuni)` — Formato lista
```
📍 I tuoi comuni:

• Firenze
  🔔 Allerta: ✅  Meteo: ✅
  
• Pisa
  🔔 Allerta: ✅  Meteo: ❌
```

### Help aggiornato
```
/aggiungi <nome> — Aggiungi un comune
/elimina — Elimina un comune
/modifica — Modifica le notifiche di un comune
/lista — Mostra i tuoi comuni
/allerta — Ricevi l'allerta meteo
/previsioni — Ricevi le previsioni
/credits — Info sul servizio
/annulla — Annulla operazione
```

## Database

Nessuna modifica allo schema.

## Test

### UsersRepository — test esistenti
- removeComune (3 test)
- updateNotificheMeteo (3 test)

### Handler — test da aggiornare
- `manage` callback mostra lista + submenu keyboard
- `hears("Aggiungi")` → avvia flusso /aggiungi
- `hears("Elimina")` → mostra comuni inline per selezione
- `hears("Modifica")` → mostra comuni inline per selezione
- `hears("Lista")` → mostra lista + submenu
- Rimuovere test per `add` callback
- `del`, `del-confirm`, `mod`, `mod-set` callback invariati

## Files modificati

| File | Modifiche |
|---|---|
| `src/bot/keyboards.ts` | Aggiungere `gestisciSubMenuKeyboard()`, `comuniSelezioneInlineKeyboard()`. Rimuovere `gestisciComuniKeyboard` |
| `src/bot/handlers.ts` | Aggiungere hears per Modifica/Aggiungi/Elimina/Lista. Cambiare hears("Gestisci comuni") e callback manage. Rimuovere callback add |
| `src/bot/messages.ts` | Aggiungere `selezionaComuneDaEliminare`, `selezionaComuneDaModificare` |
| `tests/bot/handlers.test.ts` | Aggiornare test per nuovi hears, rimuovere test add |
