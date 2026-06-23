# Multi-comune Management Design

**Date:** 2026-06-23
**Status:** Approved

## Problem

Il bot attualmente permette di impostare un solo comune via `/imposta`. Con l'introduzione del supporto multi-comune (già presente a livello DB con `utentiComuni`), servono comandi dedicati per gestire la lista dei propri comuni.

## Comandi

| Comando | Descrizione |
|---|---|
| `/aggiungi <nome>` | Cerca e aggiunge un comune (sostituisce `/imposta`) |
| `/elimina` | Mostra lista comuni → seleziona → conferma → elimina |
| `/modifica` | Mostra lista comuni → seleziona → SI/NO notifiche → aggiorna |
| `/lista` | Mostra lista comuni con impostazioni |

## Tastiera

- `mainMenuKeyboard`: bottone `"Imposta comune"` → `"Gestisci comuni"`
- Alla pressione di "Gestisci comuni" viene invocata la callback `manage`

## Flussi

### Gestisci comuni / `/lista`
1. Carica comuni utente via `findByTelegramId`
2. Se nessun comune → messaggio `nessunComune` + bottone inline `[Aggiungi comune]` (callback `add`)
3. Se ha comuni → messaggio formattato con lista comuni + per ognuno bottoni `[Modifica]` (callback `mod`) e `[Elimina]` (callback `del`), più bottone `[Aggiungi comune]` in fondo

### `/aggiungi <nome>` (ex `/imposta`)
1. Se nessun argomento → prompt `impostaPrompt`
2. Cerca per nome via `searchByPrefix`
3. Mostra risultati con `comuniInlineKeyboard` (callback `sel:url:nome`)
4. Utente seleziona → mostra conferma con `confermaInlineKeyboard` (callback `sub:url:nome:flag`)
5. Salva/subscribe — invariato rispetto a ora

### `/elimina`
1. Mostra lista comuni utente (stessa vista di "Gestisci comuni")
2. Utente clicca `[Elimina]` su un comune → callback `del:url:nome`
3. Mostra conferma: "Eliminare {nome}?" con `confermaEliminaInlineKeyboard` (callback `del-confirm:url:nome`)
4. Utente conferma → `removeComune` → messaggio `eliminato(nome)`

### `/modifica`
1. Mostra lista comuni utente
2. Utente clicca `[Modifica]` su un comune → callback `mod:url:nome`
3. Mostra stato attuale: "Notifiche meteo per {nome}: ATTIVE. Modificare?" con `confermaModificaInlineKeyboard` (callback `mod-set:url:nome:flag`)
4. Utente sceglie SI/NO → `updateNotificheMeteo` → messaggio `modificato(nome, stato)`

## Callback Data

```
manage              → mostra lista gestione
add                 → avvia flusso aggiungi
sel:url:nome        → seleziona comune (esistente)
sub:url:nome:flag   → conferma subscribe (esistente)
mod:url:nome        → mostra modifica SI/NO
mod-set:url:nome:flag → esegui modifica
del:url:nome        → mostra elimina SI/NO
del-confirm:url:nome → esegui eliminazione
```

## Service Layer — 2 nuovi metodi

```typescript
interface UsersRepository {
  // esistenti
  findByTelegramId(id: number): Promise<User | undefined>;
  subscribe(input: SubscribeInput): Promise<void>;
  findAllWithComuni(): Promise<User[]>;

  // nuovi
  removeComune(idTelegram: number, comuneUrl: string): Promise<void>;
  updateNotificheMeteo(idTelegram: number, comuneUrl: string, notificheMeteo: boolean): Promise<void>;
}
```

### `removeComune`
DELETE da `utentiComuni` WHERE `idTelegram` = ? AND `comuneUrl` = ?

### `updateNotificheMeteo`
UPDATE `utentiComuni` SET `notificheMeteo` = ? WHERE `idTelegram` = ? AND `comuneUrl` = ?

## Keyboard — Nuove

### `gestisciComuniKeyboard(comuni: UserComune[])`
Inline keyboard con per ogni comune una riga contenente:
- Bottone `[Modifica]` → callback `mod:url:nome`
- Bottone `[Elimina]` → callback `del:url:nome`

Ultima riga:
- Bottone `[Aggiungi comune]` → callback `add`

### `confermaEliminaInlineKeyboard(url, nome)`
- `[SI, elimina]` → callback `del-confirm:url:nome`
- `[NO, annulla]` → callback `annulla`

### `confermaModificaInlineKeyboard(url, nome)`
- `[SI]` → callback `mod-set:url:nome:1`
- `[NO]` → callback `mod-set:url:nome:0`

## Messages — Nuovi

```typescript
nessunComune: "Non hai ancora impostato comuni. Usa /aggiungi per iniziare."

confermaElimina: (nome) => `Eliminare ${nome} dalla tua lista?`

eliminato: (nome) => `✅ ${nome} rimosso dalla tua lista.`

confermaModifica: (nome, stato) =>
  `Notifiche meteo per ${nome}: attualmente ${stato}. Modificare?`

modificato: (nome, stato) =>
  `✅ Notifiche meteo per ${nome}: ${stato}.`
```

### `gestisciComuni(comuni)` — Formato lista
```
📍 I tuoi comuni:

• Firenze
  🔔 Allerta: ✅  Meteo: ✅
  
• Pisa
  🔔 Allerta: ✅  Meteo: ❌
  
• Livorno
  🔔 Allerta: ✅  Meteo: ✅
```

### Help aggiornato
Aggiungere `/aggiungi`, `/elimina`, `/modifica`, `/lista` ai comandi elencati.
Rimuovere `/imposta`.

## Database

Nessuna modifica allo schema. `utentiComuni` supporta già multi-comune con unique constraint su (idTelegram, comuneUrl) e flag `notificheMeteo`.

## Test

### UsersRepository — nuovi test
- `removeComune` rimuove solo il comune specificato, lascia gli altri intatti
- `removeComune` non fallisce se il comune non esiste (no-op)
- `updateNotificheMeteo` aggiorna solo il comune specificato
- `updateNotificheMeteo` non fallisce se il comune non esiste

### Handler — nuovi test
- `/aggiungi` flusso: ricerca → selezione → subscribe
- `/elimina` flusso: mostra lista → conferma → elimina
- `/modifica` flusso: mostra lista → conferma → aggiorna
- `manage` callback mostra lista comuni
- Gestione utente senza comuni

## Files modificati

| File | Modifiche |
|---|---|
| `src/services/users.ts` | Aggiungere `removeComune`, `updateNotificheMeteo` |
| `src/bot/handlers.ts` | Aggiungere `/aggiungi`, `/elimina`, `/modifica`, `/lista` + nuovi branch callback + sostituire `"Imposta comune"` nel menù |
| `src/bot/messages.ts` | Aggiungere messaggi nuovi, aggiornare `help` |
| `src/bot/keyboards.ts` | Aggiungere nuove inline keyboard, modificare `mainMenuKeyboard` |
| `tests/services/users.test.ts` | Test per nuovi metodi |
| `tests/bot/handlers.test.ts` | Test per nuovi comandi e callback |
