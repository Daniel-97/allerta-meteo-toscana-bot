# Design: Album immagini meteo nelle previsioni

**Data:** 2026-06-23 · **Branch:** `redesign-typescript`

## Contesto

Il bot invia messaggi di previsioni meteo testuali ma non include le mappe meteorologiche
disponibili dal Consorzio LAMMA. Le immagini esistono già a URL pubblico ma la funzione
`ottieniUrlImmagine` non viene mai chiamata.

## Obiettivo

Inviare un album (media group) di 9 immagini meteo subito dopo il messaggio di previsioni
testuale, sia su richiesta (`/previsioni`) che nelle notifiche programmate (`broadcastNotifiche`).

## Pattern URL immagini

```
https://www.lamma.toscana.it/previ/ita/immagini/image_{1|2|3}_{M|P|S}.jpg
```

- `{1|2|3}` = giorno: 1 (oggi), 2 (domani), 3 (dopodomani)
- `{M|P|S}` = fascia oraria: M (mattina ~8), P (pomeriggio ~14), S (sera ~20)

Esempio immagine oggi pomeriggio:
`https://www.lamma.toscana.it/previ/ita/immagini/image_1_P.jpg`

## Modifiche

### 1. `src/bot/messages.ts`

- **`ottieniUrlImmagine(giorno: number, parteGiorno: ParteGiorno): string`**
  - Costruisce URL senza `timeMs` (irrilevante)
  - Suffix: `"mattina" → "M"`, `"pomeriggio" → "P"`, `"sera" → "S"`
  - Giorno: 1, 2, 3

- **Nuova `costruisciAlbumImmagini(): InputMediaPhoto[]`**
  - 9 oggetti `InputMediaPhoto` con caption vuota (il testo è già stato inviato)
  - Ordine: giorno 1 M/P/S → giorno 2 M/P/S → giorno 3 M/P/S
  - Cache buster via `Date.now()` opzionale

### 2. `src/bot/handlers.ts`

- In `handlePrevisioni`: dopo `ctx.reply(messages.previsioni(dati), ...)`,
  chiamare `ctx.replyWithMediaGroup(costruisciAlbumImmagini())`
- Stessa logica per ogni comune iterato

### 3. `src/bot/scheduler.ts`

- In `broadcastNotifiche`: dopo `bot.api.sendMessage(...)`,
  chiamare `bot.api.sendMediaGroup(user.idTelegram, costruisciAlbumImmagini())`
- Solo quando `notificheMeteo === true` (stessa condizione del messaggio completo)

### 4. `docs/superpowers/specs/2026-06-22-meteo-service-design.md`

- Aggiornare il pattern URL (era `image_1_{M|P|S}`, ora `image_{1|2|3}_{M|P|S}`)
- Rimuovere `timeMs` dalla firma

### 5. `tests/bot/messages.test.ts`

- Aggiornare test di `ottieniUrlImmagine` per la nuova firma
- Aggiungere test per `costruisciAlbumImmagini`: verifica che restituisca 9 oggetti
  con URL attesi

## Non in scope

- Allerta meteo (`/allerta`) — solo testuali, senza immagini
- Upload file (le immagini sono URL pubblici, mai `InputFile`)
- Caching delle immagini
- Modifiche al tipo `DatiMeteo` o al servizio meteo
