# Design: LAMMA Meteo Service + Messaggi

**Data:** 2026-06-22 · **Branch:** `redesign-typescript` · **Sub-project:** 3 di 4

## Contesto e scopo

Il legacy `sendingFunction.js` gestisce: fetch XML dal consorzio LAMMA, parsing, formattazione messaggi di allerta/previsioni, e invio via Telegram. In questo sub-project si separano le responsabilità in due moduli indipendenti: un service meteo (fetch + parse → `DatiMeteo`) e un formatter di messaggi (funzioni pure, nessuna I/O, nessuna dipendenza grammY). Il sender (invio con tastiera grammY) rimane per sub-project 4.

## File structure

| File | Azione | Responsabilità |
|---|---|---|
| `src/services/meteo.ts` | Crea | Factory `createMeteoService()` con `fetchDatiMeteo(comuneUrl)` — fetch XML LAMMA, parse, mappa a `DatiMeteo` |
| `src/services/messaggi.ts` | Crea | Funzioni pure: `formattaAllerta`, `formattaPrevisioni`, `formattaCompleto`, `ottieniUrlImmagine` |
| `tests/services/meteo.test.ts` | Crea | Test con XML fixture inline (mock `fetch` via vitest) |
| `tests/services/messaggi.test.ts` | Crea | Test con oggetti `DatiMeteo` costruiti a mano |
| `src/types/index.ts` | Invariato | Tutti i tipi già esistenti (`DatiMeteo`, `ParteGiorno`, ecc.) |

## `src/services/meteo.ts`

### API

```ts
export interface MeteoService {
  fetchDatiMeteo(comuneUrl: string): Promise<DatiMeteo>;
}

export function createMeteoService(): MeteoService;
```

### Fetch

- URL: `http://www.lamma.rete.toscana.it/previ/ita/xml/comuni_web/dati/{comuneUrl}`
- HTTP client: `fetch` globale (Node 18+, disponibile senza librerie aggiuntive)
- Timeout: non necessario (fetch nativo con `AbortController` se serve in futuro)
- Se la fetch fallisce (`response.ok === false`), throw con messaggio descrittivo

### XML parsing

Libreria: `fast-xml-parser` (già in `package.json`).

Config:
```ts
const parser = new XMLParser({
  attributeNamePrefix: '',
  textNodeName: '_',
  ignoreAttributes: false,
  isArray: (name) => ['previsione', 'rischio'].includes(name),
});
```

**Mappatura campi** (dal parsed XML a `DatiMeteo`):

| XML path (dopo parsing) | Campo DatiMeteo | Note |
|---|---|---|
| `root.comune` | `comune` | stringa (elemento senza attributi) |
| `root.aggiornamento` | `aggiornamento` | stringa |
| `root.almanacco.sole_sorge` | `alba` | stringa |
| `root.almanacco.sole_tramonta` | `tramonto` | stringa |
| `root.previsione[0].allerta[0]._` (text) + `.value` (attr) | `allerta` | `value` contiene VERDE/GIALLO/ARANCIONE/ROSSO |
| `root.previsione[0].rischio[0].value` | `rischi.idraulico` | `value` attributo, LivelloRischio |
| `root.previsione[0].rischio[1].value` | `rischi.idrogeologico` | |
| `root.previsione[0].rischio[2].value` | `rischi.temporali` | |
| `root.previsione[0].rischio[3].value` | `rischi.vento` | |
| `root.previsione[0].rischio[4].value` | `rischi.neve` | |
| `root.previsione[0].rischio[5].value` | `rischi.ghiaccio` | |
| `root.previsione[0].temp[0]` (string) | `temperatura.min` | `Number()` |
| `root.previsione[0].temp[1]` (string) | `temperatura.max` | `Number()` |
| `root.previsione[parteGiorno].temp[0]` | `temperaturaAttuale` | `Number()`, temp corrente per fascia oraria |
| `root.previsione[parteGiorno].temp[1]` | `temperaturaPercepita` | `Number()`, temp percepita |
| `root.previsione[parteGiorno].um` (string) | `umidita` | `Number()` |
| `root.previsione[parteGiorno].prob_rain` (string) | `probabilitaPioggia` | `Number()` |
| `root.time_ms` | — | cache buster per URL immagine |
| — | `parteGiorno` | calcolato da `calcolaParteGiorno(alba, tramonto)` |

Nota: `root = parsed.dati` (il root XML è `<dati>`). `previsione` e `rischio` sono sempre array (`isArray` config). `temp`, `um`, `prob_rain` non sono in `isArray` — con valori multipli diventano array, con uno singolo sono oggetto diretto.

### `calcolaParteGiorno(soleSorge: string, soleTramonta: string): ParteGiorno`

Stessa logica legacy:
- Se ora corrente 1-13 → `"mattina"`
- Se 13-20 → `"pomeriggio"`
- Altrimenti → `"sera"`

## `src/services/messaggi.ts`

Funzioni pure (sincrone, niente async):

```ts
export function formattaAllerta(dati: DatiMeteo): string;
export function formattaPrevisioni(dati: DatiMeteo): string;
export function formattaCompleto(dati: DatiMeteo): string;
export function ottieniUrlImmagine(parteGiorno: ParteGiorno, timeMs: string): string;
```

Messaggi identici al legacy (stessi \n, emoji impliciti via testo, °, %).

URL immagine (aggiornato):
- `ottieniUrlImmagine(parteGiorno: ParteGiorno, timeMs: string)` → `ottieniUrlImmagine(giorno: number, parteGiorno: ParteGiorno): string`
- Pattern: `https://www.lamma.toscana.it/previ/ita/immagini/image_{1|2|3}_{M|P|S}.jpg`
- Giorno: 1 (oggi), 2 (domani), 3 (dopodomani)
- Fascia: M (mattina), P (pomeriggio), S (sera)

## Test

### `tests/services/messaggi.test.ts`

Fixture: oggetti `DatiMeteo` costruiti a mano (nessuna I/O, nessun DB).

Casi:
- `formattaAllerta` — messaggio contiene "Allerta:", 6 rischi, nome comune
- `formattaPrevisioni` — messaggio contiene temperature, umidità, prob pioggia, alba/tramonto
- `formattaCompleto` — contiene tutto
- `ottieniUrlImmagine("mattina", "123")` → URL corretto con `?v=123`

### `tests/services/meteo.test.ts`

XML fixture inline (stessa struttura del XML LAMMA reale). Mock di `fetch` via `vi.stubGlobal` o simile per evitare richieste HTTP.

Casi:
- `fetchDatiMeteo` con response OK → restituisce `DatiMeteo` con tutti i campi popolati
- `fetchDatiMeteo` con response HTTP error (404) → throw
- `fetchDatiMeteo` con XML malformato → throw
- `parseDatiMeteo` (funzione interna esportata per test) con fixture XML → oggetto corretto

## Error handling

- **Fetch fallito** (rete, HTTP non-OK): throw `Error`, messaggio descrittivo in italiano
- **XML malformato**: throw `Error` dal parser (gestito dal chiamante)
- **Campi mancanti**: throw `Error` con campo mancante (fail-fast, non valori di default)
- I messaggi di errore vengono gestiti dal chiamante (sub-project 4: bot handler logga e notifica admin)

## Fuori scope

- Sender grammY (keyboard, `ctx.reply` → sub-project 4)
- Cache delle risposte LAMMA (YAGNI)
- Conversione temperature °C/°F (YAGNI)
- Supporto per altre fonti meteo (solo LAMMA)
- Rimozione `sendingFunction.js` (sub-project 4)
