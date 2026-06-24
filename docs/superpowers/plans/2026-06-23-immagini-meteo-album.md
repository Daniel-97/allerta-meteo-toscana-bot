# Album immagini meteo nelle previsioni — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inviare un album di 9 immagini meteo (3 giorni × 3 fasce) dopo il messaggio di previsioni, sia su richiesta che nelle notifiche programmate.

**Architecture:** Modifiche minime a file esistenti. `ottieniUrlImmagine` viene aggiornata per accettare il parametro `giorno` (1/2/3). Nuova funzione `costruisciAlbumImmagini` genera 9 `InputMediaPhoto`. I chiamanti (`handlePrevisioni`, `broadcastNotifiche`) inviano l'album dopo il messaggio di testo.

**Tech Stack:** TypeScript, grammY (`replyWithMediaGroup`, `sendMediaGroup`), fast-xml-parser

## Global Constraints

- ESM puro: import con estensione `.js`
- No classi, solo funzioni pure e object literal
- Nessuna modifica a `DatiMeteo` o `MeteoService`
- `ottieniUrlImmagine` senza parametro `timeMs`
- Immagini inviate solo per previsioni meteo, NON per allerte

---

### Task 1: Aggiornare `ottieniUrlImmagine` e aggiungere `costruisciAlbumImmagini` in `messages.ts`

**Files:**
- Modify: `src/bot/messages.ts:135-142` — `ottieniUrlImmagine` nuova firma
- Modify: `src/bot/messages.ts` — aggiungere `costruisciAlbumImmagini`
- Modify: `tests/bot/messages.test.ts` — aggiornare/ad aggiungere test

**Interfaces:**
- Consumes: `ParteGiorno` da `../types/index.js`
- Produces: `ottieniUrlImmagine(giorno: number, parteGiorno: ParteGiorno): string`
- Produces: `costruisciAlbumImmagini(): InputMediaPhoto[]`

- [ ] **Step 1: Leggere i file correnti**

```bash
cat src/bot/messages.ts
cat tests/bot/messages.test.ts
```

- [ ] **Step 2: Aggiornare i test di `ottieniUrlImmagine`**

Modificare in `tests/bot/messages.test.ts`: aggiornare il test esistente per la nuova firma e aggiungere casi per tutti i 3 giorni.

Modificare `describe("ottieniUrlImmagine", ...)`:
```typescript
describe("ottieniUrlImmagine", () => {
  it("dovrebbe restituire l'URL per oggi mattina", () => {
    const url = ottieniUrlImmagine(1, "mattina");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_M.jpg",
    );
  });

  it("dovrebbe restituire l'URL per oggi pomeriggio", () => {
    const url = ottieniUrlImmagine(1, "pomeriggio");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_P.jpg",
    );
  });

  it("dovrebbe restituire l'URL per oggi sera", () => {
    const url = ottieniUrlImmagine(1, "sera");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_S.jpg",
    );
  });

  it("dovrebbe restituire l'URL per domani mattina", () => {
    const url = ottieniUrlImmagine(2, "mattina");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_2_M.jpg",
    );
  });

  it("dovrebbe restituire l'URL per dopodomani sera", () => {
    const url = ottieniUrlImmagine(3, "sera");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_3_S.jpg",
    );
  });
});
```

Aggiungere un nuovo `describe("costruisciAlbumImmagini", ...)`:
```typescript
import { InputMediaBuilder } from "grammy";

describe("costruisciAlbumImmagini", () => {
  it("dovrebbe restituire 9 InputMediaPhoto", () => {
    const album = costruisciAlbumImmagini();
    expect(album).toHaveLength(9);
  });

  it("dovrebbe contenere URL per tutte le combinazioni giorno/fascia", () => {
    const album = costruisciAlbumImmagini();
    const urls = album.map((m) => m.media);

    // Giorno 1: M, P, S
    expect(urls[0]).toContain("image_1_M.jpg");
    expect(urls[1]).toContain("image_1_P.jpg");
    expect(urls[2]).toContain("image_1_S.jpg");
    // Giorno 2: M, P, S
    expect(urls[3]).toContain("image_2_M.jpg");
    expect(urls[4]).toContain("image_2_P.jpg");
    expect(urls[5]).toContain("image_2_S.jpg");
    // Giorno 3: M, P, S
    expect(urls[6]).toContain("image_3_M.jpg");
    expect(urls[7]).toContain("image_3_P.jpg");
    expect(urls[8]).toContain("image_3_S.jpg");
  });

  it("tutti gli elementi dovrebbero essere di tipo photo", () => {
    const album = costruisciAlbumImmagini();
    for (const media of album) {
      expect(media.type).toBe("photo");
    }
  });
});
```

- [ ] **Step 3: Eseguire i test per verificare che falliscano**

```bash
npx vitest run tests/bot/messages.test.ts -t "ottieniUrlImmagine|costruisciAlbumImmagini" 2>&1
```

Expected: FAIL — `ottieniUrlImmagine` non ha più la stessa firma, `costruisciAlbumImmagini` non esiste.

- [ ] **Step 4: Aggiornare `ottieniUrlImmagine` in `src/bot/messages.ts`**

Sostituire la funzione esistente:
```typescript
import { InputMediaBuilder } from "grammy";

export function ottieniUrlImmagine(
  giorno: number,
  parteGiorno: ParteGiorno,
): string {
  const base = "https://www.lamma.toscana.it/previ/ita/immagini/image_";
  const suffix = parteGiorno === "mattina" ? "M" : parteGiorno === "pomeriggio" ? "P" : "S";
  return `${base}${giorno}_${suffix}.jpg`;
}
```

- [ ] **Step 5: Aggiungere `costruisciAlbumImmagini` in `src/bot/messages.ts`**

Dopo la funzione `ottieniUrlImmagine`:
```typescript
export function costruisciAlbumImmagini(): ReturnType<typeof InputMediaBuilder.photo>[] {
  const fasce: ParteGiorno[] = ["mattina", "pomeriggio", "sera"];
  const album: ReturnType<typeof InputMediaBuilder.photo>[] = [];

  for (let giorno = 1; giorno <= 3; giorno++) {
    for (const fascia of fasce) {
      const url = ottieniUrlImmagine(giorno, fascia);
      album.push(InputMediaBuilder.photo(url));
    }
  }

  return album;
}
```

- [ ] **Step 6: Eseguire i test per verificare che passino**

```bash
npx vitest run tests/bot/messages.test.ts -t "ottieniUrlImmagine|costruisciAlbumImmagini" 2>&1
```

Expected: PASS

- [ ] **Step 7: Eseguire tutti i test per verificare regressioni**

```bash
npx vitest run 2>&1
```

Expected: 79+ test PASS (o comunque nessun fallimento in più del previsto)

- [ ] **Step 8: Commit**

```bash
git add src/bot/messages.ts tests/bot/messages.test.ts
git commit -m "feat: aggiorna ottieniUrlImmagine per multi-giorno e aggiungi costruisciAlbumImmagini"
```

---

### Task 2: Inviare l'album in `handlePrevisioni`

**Files:**
- Modify: `src/bot/handlers.ts:44-60` — aggiungere album dopo reply testo
- Test: `tests/bot/handlers.test.ts` — aggiornare test

**Interfaces:**
- Consumes: `costruisciAlbumImmagini()` da `./messages.js`
- Uses: `ctx.replyWithMediaGroup(album)` da grammY

- [ ] **Step 1: Leggere i file correnti**

```bash
cat src/bot/handlers.ts
cat tests/bot/handlers.test.ts
```

- [ ] **Step 2: Aggiornare i test di `handlePrevisioni`**

In `tests/bot/handlers.test.ts`, trovare il test per `handlePrevisioni` e aggiungere verifica che `replyWithMediaGroup` sia chiamato con 9 elementi.

```typescript
// Nell'esistente it che testa handlePrevisioni, aggiungere:
expect(ctx.replyWithMediaGroup).toHaveBeenCalledTimes(1);
const album = ctx.replyWithMediaGroup.mock.calls[0][0];
expect(album).toHaveLength(9);
expect(album[0].type).toBe("photo");
```

- [ ] **Step 3: Eseguire i test per verificare che falliscano**

```bash
npx vitest run tests/bot/handlers.test.ts -t "previsioni" 2>&1
```

Expected: FAIL — `replyWithMediaGroup` non viene chiamato.

- [ ] **Step 4: Aggiornare `handlePrevisioni` in `src/bot/handlers.ts`**

Aggiungere import e chiamata album:

```typescript
// Aggiungere in cima al file:
import { costruisciAlbumImmagini } from "./messages.js";

// In handlePrevisioni, dopo ctx.reply(messages.previsioni(dati), ...):
await ctx.replyWithMediaGroup(costruisciAlbumImmagini());
```

Il corpo di `handlePrevisioni` diventa:
```typescript
async function handlePrevisioni(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user) {
    await ctx.reply(messages.nonIscritto, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(messages.previsioni(dati), { reply_markup: mainMenuKeyboard() });
      await ctx.replyWithMediaGroup(costruisciAlbumImmagini());
    } catch {
      await ctx.reply(messages.errore);
    }
  }
}
```

- [ ] **Step 5: Eseguire i test per verificare che passino**

```bash
npx vitest run tests/bot/handlers.test.ts -t "previsioni" 2>&1
```

Expected: PASS

- [ ] **Step 6: Eseguire tutti i test per regressioni**

```bash
npx vitest run 2>&1
```

Expected: tutti PASS

- [ ] **Step 7: Commit**

```bash
git add src/bot/handlers.ts tests/bot/handlers.test.ts
git commit -m "feat: invia album immagini in handlePrevisioni"
```

---

### Task 3: Inviare l'album in `broadcastNotifiche`

**Files:**
- Modify: `src/bot/scheduler.ts:10-30` — aggiungere album dopo messaggio

**Interfaces:**
- Consumes: `costruisciAlbumImmagini()` da `./bot/messages.js` (o path relativo corretto)
- Uses: `bot.api.sendMediaGroup(chatId, album)` da grammY

- [ ] **Step 1: Leggere i file correnti**

```bash
cat src/bot/scheduler.ts
cat tests/bot/scheduler.test.ts
```

- [ ] **Step 2: Aggiornare `broadcastNotifiche` in `src/bot/scheduler.ts`**

Aggiungere import in cima:
```typescript
import { costruisciAlbumImmagini } from "./messages.js";
```

Modificare il ramo `notificheMeteo` in `broadcastNotifiche`:
```typescript
// Dentro if (comune.notificheMeteo) { ... }
await bot.api.sendMessage(user.idTelegram, msg);
await bot.api.sendMediaGroup(
  user.idTelegram,
  costruisciAlbumImmagini(),
);
```

La sezione completa dello scheduler diventa:
```typescript
for (const comune of user.comuni) {
  try {
    const dati = await services.meteo.fetchDatiMeteo(comune.url);
    const msg = comune.notificheMeteo
      ? messages.completo(dati)
      : messages.allerta(dati);
    await bot.api.sendMessage(user.idTelegram, msg);
    if (comune.notificheMeteo) {
      await bot.api.sendMediaGroup(
        user.idTelegram,
        costruisciAlbumImmagini(),
      );
    }
    inviati++;
  } catch {
    continue;
  }
}
```

- [ ] **Step 3: Aggiornare i test dello scheduler**

In `tests/bot/scheduler.test.ts`, aggiornare il test per verificare che `sendMediaGroup` sia chiamato quando `notificheMeteo === true` e non quando `false`.

- [ ] **Step 4: Eseguire i test per verificare che passino**

```bash
npx vitest run tests/bot/scheduler.test.ts 2>&1
```

Expected: PASS

- [ ] **Step 5: Eseguire tutti i test per regressioni**

```bash
npx vitest run 2>&1
```

Expected: tutti PASS

- [ ] **Step 6: Commit**

```bash
git add src/bot/scheduler.ts tests/bot/scheduler.test.ts
git commit -m "feat: invia album immagini in broadcastNotifiche"
```

---

### Task 4: Aggiornare README e AGENTS.md con pattern URL immagini

**Files:**
- Modify: `README.md` — sezione "Fonti dati" aggiungere pattern URL immagini e spiegazione
- Modify: `AGENTS.md` — aggiungere pattern URL immagini sotto "Errori comuni da evitare" o sezione dedicata

- [ ] **Step 1: Aprire README.md e AGENTS.md**

```bash
cat README.md
cat AGENTS.md
```

- [ ] **Step 2: Aggiornare README.md — sezione Fonti dati**

Aggiungere dopo la tabella degli endpoint:

```
### Pattern URL immagini meteo

Le mappe meteorologiche sono disponibili al pattern:

```
https://www.lamma.toscana.it/previ/ita/immagini/image_{N}_{F}.jpg
```

Dove:
- `{N}` = giorno: `1` (oggi), `2` (domani), `3` (dopodomani)
- `{F}` = fascia oraria: `M` (mattina ~8:00), `P` (pomeriggio ~14:00), `S` (sera ~20:00)

Il bot invia un album di tutte e 9 le combinazioni (3 giorni × 3 fasce) dopo il messaggio di previsioni meteo.
```

- [ ] **Step 3: Aggiornare AGENTS.md**

Aggiungere sotto a "Errori comuni da evitare":

```
## URL immagini meteo

Pattern: `https://www.lamma.toscana.it/previ/ita/immagini/image_{N}_{F}.jpg`
- N = 1 (oggi), 2 (domani), 3 (dopodomani)
- F = M (mattina ~8), P (pomeriggio ~14), S (sera ~20)
- Il bot invia album di 9 immagini dopo il testo previsioni
```

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: documenta pattern URL immagini meteo"
```

---

### Task 5: Aggiornare vecchio design doc

**Files:**
- Modify: `docs/superpowers/specs/2026-06-22-meteo-service-design.md:98-101`

- [ ] **Step 1: Aggiornare pattern URL e rimuovere timeMs**

Sostituire:
```
URL immagine:
- `"mattina"` → `http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_M.jpg?v={timeMs}`
- ...
```
con:
```
URL immagine (aggiornato):
- `ottieniUrlImmagine(giorno: number, parteGiorno: ParteGiorno): string` → `image_{1|2|3}_{M|P|S}.jpg`
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-22-meteo-service-design.md
git commit -m "docs: aggiorna pattern URL immagini in design doc"
```
