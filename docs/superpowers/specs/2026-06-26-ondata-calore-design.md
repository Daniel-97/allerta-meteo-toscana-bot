# Spec: Servizio allerta ondata di calore

**Data:** 2026-06-26
**Stato:** Approvata
**Scope:** Aggiunta al bot di un messaggio "Ondata di calore — Toscana" inviato separatamente, sugli stessi trigger delle allerte meteo esistenti (on-demand via bottone `🚨 Allerta meteo` e broadcast schedulato). Nessun nuovo comando, bottone, o migrazione DB.

## 1. Contesto e obiettivo

Il bot invia due tipi di messaggio meteo:
- **On-demand** via bottone `🚨 Allerta meteo` (`src/bot/handlers.ts:26-42`): un messaggio per ogni comune dell'utente.
- **Schedulato** via `broadcastNotifiche` (`src/bot/scheduler.ts:6-33`) alle 08:00 e 15:00 ora italiana (`src/index.ts:57-60`): per ogni utente, per ogni comune, `messages.completo` (se `notificheMeteo`) o `messages.allerta`.

Obiettivo: aggiungere ai due flussi un messaggio autonomo "Ondata di calore — Toscana" usando il bollettino nazionale del Ministero della Salute esposto come CSV da ondata-calore. Poiché il CSV copre 27 capoluoghi italiani ma per la Toscana è presente **solo FIRENZE**, l'allerta calore è un dato **regionale unico** — uguale per ogni utente del bot, indipendentemente dai comuni monitorati. Per questo motivo (dato regionale vs dati per-comune) il messaggio calore è **separato** da quelli meteo per-comune: niente hack "primo comune", niente modifica alle signature `messages.allerta`/`completo`.

## 2. Fonte dati

- **URL CSV:** `https://raw.githubusercontent.com/ondata/ondate-calore/main/data/ondate-calore_latest.csv`
- **Colonne:** `citta,data,livello,data_estrazione,URL`.
- **Filtro:** si considerano esclusivamente le righe con `citta === "FIRENZE"`.
- **Formato `data`:** `YYYY-MM-DD` (es. `2026-06-27`).
- **Scala `livello` (Ministero della Salute):**

  | Codice CSV | Nome italiano | Emoji | Significato |
  |---|---|---|---|
  | `Livello0` | Verde | 🟢 | nessuna allerta |
  | `Livello1` | Gialla | 🟡 | allerta |
  | `Livello2` | Arancione | 🟠 | allerta |
  | `Livello3` | Rossa | 🔴 | allerta |

- **`URL`:** link al PDF del bollettino calore del Ministero della Salute (stesso URL per tutte le righe di una stessa `data_estrazione`).
- **`data_estrazione`:** timestamp del bollettino (mostrato come "Aggiornamento" nel messaggio).

## 3. Decisioni di design

1. **Messaggio separato (opzione B):** il messaggio calore è autonomo, inviato dopo i messaggi meteo per-comune, sugli stessi trigger esistenti. Niente nuovo bottone, niente nuovo comando.
2. **Dove appare:** on-demand (`handleAllerta`) e broadcast (`broadcastNotifiche`). `messages.previsioni` non toccata.
3. **Combinazione oggi/domani:** mostra solo giorni con allerta (`livello > 0`). Se entrambi Livello0 → nessun messaggio calore inviato. Il PDF del bollettino calore compare solo se il messaggio è inviato.
4. **Nomenclatura:** italiano con emoji (🟢🟡🟠🔴 + "Verde"/"Gialla"/"Arancione"/"Rossa"); Livello0 non viene mai renderizzato come riga (omesso), quindi l'utente vede solo Gialla/Arancione/Rossa — nessuna ambiguità con la palette meteo.
5. **Audience:** tutti gli utenti con almeno un comune ricevono il messaggio calore (calore regionale toscano; FIRENZE è solo il capoluogo di riferimento nel bollettino nazionale).
6. **Deduplicazione:** fetch del CSV una sola volta per invocazione (on-demand) e una sola volta per broadcast (fuori dal loop utenti). Il messaggio calore è inviato una sola volta per utente (dopo il loop dei suoi comuni).
7. **Errore fetch CSV:** messaggio calore inviato con `⚠️ Dati ondata calore non disponibili` (header + avviso, niente PDF, niente giorni). Log in console.

## 4. Architettura

### 4.1 Nuovo servizio `src/services/heatwave.ts`

Stateless, no `db` — parallelo formale a `src/services/meteo.ts` (che pure non prende `db`).

```ts
export interface HeatWaveService {
  fetchAllertaCalore(oggi: Date): Promise<RisultatoAllertaCalore>;
}
export function createHeatWaveService(): HeatWaveService;
```

Comportamento di `fetchAllertaCalore`:
1. `fetch(HEATWAVE_CSV_URL)`. Se `!res.ok` → ritorna `{ errore: true }` (dopo log `Errore HTTP ${res.status}`).
2. Body come testo, `split("\n")` righe, salta l'header. Per ogni riga `split(",")` → 5 campi. Validazione Zod solo per righe con `citta === "FIRENZE"`:
   - `data`: regex `^\d{4}-\d{2}-\d{2}$`
   - `livello`: enum `Livello0 | Livello1 | Livello2 | Livello3`
   - `data_estrazione`: stringa non-vuota
   - `URL`: stringa non-vuota
3. Calcolo "oggi" e "domani" in `Europe/Rome` via `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year/month/day numeric })` → `YYYY-MM-DD` (il locale `en-CA` produce direttamente il formato ISO short).
4. Match righe FIRENZE per `data === oggiIso` → `oggi = { livello, url }` (o `null` se assente); stesso per domani.
5. `dataEstrazione` = primo `data_estrazione` trovato tra le righe FIRENZE valide (o stringa vuota se nessuna riga FIRENZE).
6. Qualsiasi eccezione (parse, rete) → catch → `{ errore: true }`. La funzione **non throwa mai**.

Niente nuova dipendenza: il CSV non ha campi quoted con virgole interne (URL e città sono semplici), quindi `split(",")` è sufficiente.

### 4.2 Tipi in `src/types/index.ts`

```ts
export type LivelloCalore = 0 | 1 | 2 | 3;
// 0=Verde(nessuna), 1=Gialla, 2=Arancione, 3=Rossa

export type RisultatoAllertaCalore =
  | {
      errore: false;
      dataEstrazione: string;
      oggi: { livello: LivelloCalore; url: string } | null;
      domani: { livello: LivelloCalore; url: string } | null;
    }
  | { errore: true };
```

### 4.3 `BotServices` (`src/bot/handlers.ts:9-13`)

```ts
export interface BotServices {
  comuni: ArchivioComuni;
  users: UsersRepository;
  meteo: MeteoService;
  heatwave: HeatWaveService;  // nuovo
}
```

### 4.4 Composition roots

- `src/index.ts:24-28`: `services = { ..., heatwave: createHeatWaveService() }`.
- `src/dev.ts:10-14`: identico.

## 5. Formatter `src/bot/messages.ts`

Le funzioni `messages.allerta`, `messages.completo`, `messages.previsioni` **non vengono modificate** (signature invariata → backward compat totale per i test esistenti).

Nuovi helper export:

```ts
export function livelloCaloreToEmoji(l: LivelloCalore): string; // 0→🟢, 1→🟡, 2→🟠, 3→🔴
export function livelloCaloreToNome(l: LivelloCalore): string;  // 0→"Verde", 1→"Gialla", 2→"Arancione", 3→"Rossa"
export function messaggioCalore(r: RisultatoAllertaCalore): string | null;
```

### `messaggioCalore` — struttura output

**Caso `r.errore === true`:**

```
🌡️ <b>Ondata di calore — Toscana</b>

⚠️ Dati ondata calore non disponibili
```

(niente PDF, niente data di aggiornamento)

**Caso `r.errore === false`:**

Raccoglie in `righe`:
- se `r.oggi && r.oggi.livello > 0` → `Oggi: <emoji> <Nome>`
- se `r.domani && r.domani.livello > 0` → `Domani: <emoji> <Nome>`

Se `righe.length === 0` → ritorna `null` (nessun messaggio calore inviato).

Altrimenti ritorna:

```
🌡️ <b>Ondata di calore — Toscana</b>
<i>Aggiornamento: <dataEstrazione></i>

Oggi: 🟠 Arancione
Domani: 🔴 Rossa

📄 <a href="<url>">Bollettino calore</a>
```

URL = `r.oggi?.url ?? r.domani?.url` (garantito non-null perché almeno una riga alert → almeno un url).

## 6. Integrazione on-demand `src/bot/handlers.ts`

```ts
async function handleAllerta(ctx, services) {
  const comuni = services.users.findComuniByUser(...);
  if (comuni.length === 0) return ctx.reply(messages.nessunComune);
  const r = await services.heatwave.fetchAllertaCalore(new Date());
  for (const c of comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(messages.allerta(dati));   // signature singola, invariata
    } catch (e) { console.error(...); await ctx.reply(messages.errore); }
  }
  const msgCalore = messaggioCalore(r);
  if (msgCalore) {
    await ctx.reply(msgCalore, { link_preview_options: { is_disabled: true } });
  }
}
```

Fetch heatwave una sola volta per invocazione comando; messaggio calore inviato una sola volta dopo il loop comuni. Link preview disabilitato per non rendere enorme il messaggio con l'anteprima del PDF.

## 7. Integrazione schedulata `src/bot/scheduler.ts`

```ts
export async function broadcastNotifiche(bot, services) {
  const users = services.users.findAllWithComuni();
  const r = await services.heatwave.fetchAllertaCalore(new Date()); // fuori dal loop, 1 sola fetch
  const msgCalore = messaggioCalore(r);   // precomputato una volta
  let inviati = 0;
  for (const user of users) {
    for (const comune of user.comuni) {
      try {
        const dati = await services.meteo.fetchDatiMeteo(comune.url);
        const msg = comune.notificheMeteo ? messages.completo(dati) : messages.allerta(dati);
        const reply_markup = comune.notificheMeteo ? mappeMeteoInlineKeyboard() : undefined;
        await bot.api.sendMessage(user.idTelegram, msg, {
          link_preview_options: { is_disabled: true }, reply_markup,
        });
        inviati++;
      } catch (e) { console.error(...); continue; }
    }
    if (msgCalore) {
      try {
        await bot.api.sendMessage(user.idTelegram, msgCalore, {
          link_preview_options: { is_disabled: true },
        });
        inviati++;
      } catch (e) { console.error(...); }
    }
  }
  return { totali: users.length, inviati };
}
```

Fetch heatwave una sola volta prima del loop utenti (dato regionale condiviso). Messaggio calore inviato una sola volta per utente dopo i suoi comuni. Anche utenti con `notificheMeteo=false` ricevono il messaggio calore (è un'allerta, non una previsione). Orari `wrangler.toml` e filtro `src/index.ts:57-60` restano invariati (08:00 e 15:00 IT).

## 8. Gestione errori

- `fetchAllertaCalore` catch interno → `{ errore: true }`; il messaggio utente resta integro con sola riga `⚠️ Dati ondata calore non disponibili`.
- Log via `console.error` con codice/causa (HTTP status, parse error) — coerente con lo stile scheduler (`src/bot/scheduler.ts:25-28`).
- Nessun `process.exit` (servizio runtime, non config mancante in dev).

## 9. Test

### 9.1 `tests/services/heatwave.test.ts` (new)

Clone di stile di `tests/services/meteo.test.ts` con `vi.stubGlobal("fetch", mockFn)` che ritorna body CSV string. Casi:

1. **Happy path**: body contiene FIRENZE oggi (Livello2) + domani (Livello3) + altre città non-toscane → `{ errore: false, oggi: { livello: 2, url }, domani: { livello: 3, url }, dataEstrazione }`.
2. **FIRENZE oggi Livello0**: body con FIRENZE oggi Livello0, domani Livello1 → `oggi.livello === 0` (non `null`), `domani.livello === 1`.
3. **FIRENZE assente per una data**: CSV contiene FIRENZE solo per data esterna a oggi/domani → `oggi === null` e `domani === null`, `errore: false`.
4. **FIRENZE completamente assente**: CSV senza alcuna riga FIRENZE → `{ errore: false, oggi: null, domani: null, dataEstrazione: "" }`.
5. **HTTP 404**: `res.ok = false` → `{ errore: true }`.
6. **Body malformato** (non CSV valido): parsing non throwa, ritorna `{ errore: true }` o, se parsabile ma nessuna riga valida, `{ errore: false, ... null }`.
7. **Rete down**: `fetch` throws → catch → `{ errore: true }`.

Mock di `Date` via `vi.useFakeTimers().setSystemTime(new Date("2026-06-26T10:00:00Z"))` per rendere deterministici oggi/domani; `afterAll` reset.

### 9.2 `tests/bot/messages.test.ts` (edit)

I test meteo esistenti **non vengono toccati** (signature `allerta`/`completo` invariata). Nuovi test su `messaggioCalore(r)` come funzione standalone:

- (a) oggi=Livello2, domani=Livello3 → contiene header + `Oggi: 🟠 Arancione` + `Domani: 🔴 Rossa` + `Bollettino calore`;
- (b) oggi=Livello0, domani=Livello1 → contiene `Domani: 🟡 Gialla`; non contiene `Oggi:`;
- (c) solo oggi=Livello2, domani=null → `Oggi: 🟠 Arancione`; non contiene `Domani:`;
- (d) entrambi Livello0 → ritorna `null`;
- (e) `r.errore` → ritorna stringa con `non disponibili`; non contiene `Bollettino calore`.

### 9.3 `tests/bot/scheduler.test.ts` (edit)

Aggiungere al mock `services` il campo `heatwave: { fetchAllertaCalore: vi.fn().mockResolvedValue({ errore: false, dataEstrazione: "...", oggi: { livello: 2, url: "..." }, domani: null }) }`. Assert:

- `services.heatwave.fetchAllertaCalore` chiamato **esattamente 1 volta** (prima del loop utenti).
- `bot.api.sendMessage` chiamato una volta in più per utente con corpo contenente "Ondata di calore" quando `messaggioCalore(r)` non-null.
- Quando `messaggioCalore(r)` null (entrambi Livello0) → nessun `sendMessage` extra (count = comuni × utenti).
- Caso `r.errore=true` → `sendMessage` extra con testo "non disponibili".

## 10. README (`README.md`) — aggiornamenti

- **"Funzionalità" (linea 11):** nuovo bullet — "Allerta ondata di calore (regione Toscana) inviata come messaggio autonomo insieme alle allerte meteo, con link al bollettino del Ministero della Salute".
- **"Fonti dati" (linea 210):** nuova sotto-sezione "Bollettino ondata di calore" — URL CSV, colonne usate, scala livelli (0=Verde nessuna / 1=Gialla / 2=Arancione / 3=Rossa), copertura (Toscana tramite capoluogo FIRENZE nel bollettino nazionale), frequenza aggiornamento (`data_estrazione`).
- **"Struttura del progetto" (linea 265):** aggiungere `src/services/heatwave.ts` e tipo `RisultatoAllertaCalore`/`LivelloCalore`.
- **"Notifiche programmate" (linea 142):** menzione messaggio calore autonoma nel broadcast + **bugfix cron stale**: testo corretto a orari reali `08:00 / 15:00` (cron `["0 6-14 * * *"]`) invece di "11:30 e 17:30".
- **"Comandi bot" / "Menu a bottoni" / "Pannello Admin":** non modificati (nessun nuovo comando/bottone).

## 11. File toccati

| File | Tipo | Modifica |
|---|---|---|
| `src/services/heatwave.ts` | new | interfaccia + factory + parser CSV + Zod |
| `src/types/index.ts` | edit | `LivelloCalore`, `RisultatoAllertaCalore` |
| `src/bot/handlers.ts` | edit | `BotServices.heatwave` + messaggio calore post-loop in `handleAllerta` |
| `src/bot/scheduler.ts` | edit | fetch heatwave pre-loop + messaggio calore post-comuni utente |
| `src/bot/messages.ts` | edit | helpers + `messaggioCalore` (no modifica a `allerta`/`completo`/`previsioni`) |
| `src/index.ts` | edit | composition root `heatwave` |
| `src/dev.ts` | edit | composition root `heatwave` |
| `tests/services/heatwave.test.ts` | new | test servizio (7 casi) |
| `tests/bot/messages.test.ts` | edit | test `messaggioCalore` (5 casi a–e) |
| `tests/bot/scheduler.test.ts` | edit | mock + assert 1 fetch + 1 sendExtra per utente |
| `README.md` | edit | sez. Funzionalità, Fonti dati, Struttura, Notifiche programmate |

Nessuna migrazione DB. Nessun nuovo bottone. Nessun nuovo comando.

## 12. Verifica post-implementazione

```bash
npm run typecheck
npm test
```