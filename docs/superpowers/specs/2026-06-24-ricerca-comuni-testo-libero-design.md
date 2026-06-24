# Ricerca comuni a testo libero — Design

## Obiettivo

Permettere all'utente di cercare comuni digitando testo libero, senza dover usare
il comando `/aggiungi <nome>`. Il bot interpreta messaggi di testo sconosciuti
(≥3 caratteri) come intenzione di ricerca comuni.

## Vincoli

- **Stateless**: nessuna sessione conversazionale. Ogni messaggio è
  autosufficiente.
- **Minime modifiche**: riusare `searchByPrefix` e `comuniInlineKeyboard`.
- **Retrocompatibilità**: `/aggiungi <nome>` continua a funzionare.

## Flusso

1. Utente preme "➕ Aggiungi" (bottone menu o `/aggiungi` senza argomenti)
2. Bot risponde: _"🔍 Digita almeno 3 lettere del nome del comune per iniziare la ricerca."_
3. Utente scrive ≥3 caratteri (es. "pis")
4. Nessun command/hears matcha → handler generico `on("message:text")`
5. Bot chiama `services.comuni.searchByPrefix(testo)`
6. Se 0 risultati: _"Nessun comune trovato per 'X'. Se stavi cercando un comune, riprova con un nome diverso."_
7. Se ≥1 risultato: _"📍 Ho trovato N comuni per 'X':"_ + `comuniInlineKeyboard(risultati)`
8. Utente clicca comune → flow conferma (`sel:url:nome`) — invariato

## Cosa non cambia

- `/aggiungi <nome>` — identico
- `/elimina`, `/modifica`, `/lista`, `/allerta`, `/previsioni` — identici
- `bottoni menu` ("🚨 Aggiorna allerta", "🌤️ Aggiorna meteo", ecc.) — identici
- Callback handler (`sel`, `sub`, `del`, `mod`, ecc.) — identici
- `services/comuni.ts` — invariato
- `keyboards.ts` — invariato

## Modifiche

### `src/bot/messages.ts`

Aggiungere tre messaggi:

```typescript
aggiungiPrompt:
  "🔍 Digita almeno 3 lettere del nome del comune per iniziare la ricerca.",

ricercaNonTrovato: (testo: string) =>
  `Nessun comune trovato per '${escHtml(testo)}'. Se stavi cercando un comune, riprova con un nome diverso.`,

ricercaTrovati: (count: number, testo: string) =>
  `📍 Ho trovato ${count} comuni per '${escHtml(testo)}':`,
```

### `src/bot/handlers.ts`

1. **Handler `➕ Aggiungi` / `/aggiungi` senza arg**: usare `aggiungiPrompt` invece di
   `impostaPrompt`.

2. **Nuovo handler generico** — registrato DOPO tutti gli altri comandi/hears:

   ```typescript
   bot.on("message:text", async (ctx) => {
     const text = ctx.message.text.trim();
     if (text.startsWith("/") || text.length < 3) return;
     const risultati = await services.comuni.searchByPrefix(text);
     if (risultati.length === 0) {
       await ctx.reply(messages.ricercaNonTrovato(text));
       return;
     }
     await ctx.reply(messages.ricercaTrovati(risultati.length, text), {
       reply_markup: comuniInlineKeyboard(risultati),
     });
   });
   ```

   **Posizionamento**: dopo la registrazione di `bot.command("help")`, alla fine
   di `registerHandlers`. In Grammy, l'ordine conta: il primo handler che matcha
   consuma il messaggio. `on("message:text")` è un fallthrough generico.

3. **Handler `/aggiungi` senza argomenti** — modificato per usare `aggiungiPrompt`.

## Test

### Esistenti da verificare
- `tests/bot/handlers.test.ts` — verificare che i test esistenti continuino a
  passare (i command/hears hanno priorità).
- `tests/services/comuni.test.ts` — `searchByPrefix` già testato.

### Nuovi test
- Messaggio < 3 caratteri → nessuna risposta
- Messaggio ≥ 3 caratteri con match → risposta con keyboard
- Messaggio ≥ 3 caratteri senza match → messaggio `ricercaNonTrovato`
- Messaggio che inizia con `/` → ignorato (è un comando)
- `➕ Aggiungi` → mostra `aggiungiPrompt`
