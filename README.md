# Allerta Meteo Toscana Bot

<p align="center">
  <a href="https://t.me/allerta_meteo_toscana_bot">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://t.me/allerta_meteo_toscana_bot" alt="QR Code Allerta Meteo Toscana Bot">
  </a>
  <br>
  <strong><a href="https://t.me/allerta_meteo_toscana_bot">👉 @allerta_meteo_toscana_bot</a></strong>
</p>

### Funzionalità

- 🚨 **Allerte meteo** — livelli basso / moderato / elevato / molto elevato per ogni comune (valori LAMMA originali, corrispondenti alle fasi di criticità)
- 🌤️ **Previsioni** — temperatura, umidità, pioggia, UV, quota neve, alba/tramonto
- 🖼️ **Mappe meteo** — 9 immagini (3 giorni × 3 fasce orarie)
- 🔔 **Notifiche** — 2 volte al giorno (09:00 e 15:00 ora italiana); inviate solo per i comuni con allerta in corso; il messaggio delle 15:00 è soppresso se i dati sono invariati rispetto alle 09:00
- 🌡️ **Ondata di calore** — messaggio autonomo "Ondata di calore — Toscana" insieme alle allerte meteo, con link al bollettino del Ministero della Salute
- 💬 **Messaggio generico** — se non ci sono allerte (meteo o calore), l'on-demand mostra un unico messaggio "Nessuna allerta in corso o prevista per i prossimi giorni"
- 📍 **Comuni multipli** — aggiungi, elimina e gestisci più comuni
- ⚙️ **Notifiche meteo on/off** — per singolo comune

Bot Telegram per allerte meteo della Toscana, basato sui dati resi disponibili dal [Consorzio LAMMA](https://www.lamma.toscana.it/).

## Prerequisiti

- **Node.js 18+**
- **Bot Telegram** — registrato da @BotFather
- **Database Turso** — account + DB con credenziali (URL + token)
- **Account Cloudflare** — per deploy (opzionale, per sviluppo locale non serve)

## Setup iniziale

```bash
# 1. Clona il repo
git clone <url>
cd allerta-meteo-toscana-bot

# 2. Configura variabili d'ambiente
cp .env.example .env
# Edita .env con:
#   TELEGRAM_BOT_TOKEN    → da @BotFather
#   ADMIN_CHAT_ID         → tuo ID Telegram (es. da @userinfobot)
#   TURSO_DATABASE_URL    → libsql://<db>-<org>.turso.io
#   TURSO_AUTH_TOKEN      → token Turso

# 3. Installa dipendenze
npm install

# 4. Sincronizza lo schema DB su Turso (crea/aggiorna tabelle)
npm run db:push

# 5. Importa comuni (da XML LAMMA → DB)
npm run db:seed

# 6. Avvia in modalità sviluppo (polling)
npm run dev
```

Apri Telegram, cerca il tuo bot e scrivi `/start`.

## Sviluppo locale (polling)

`npm run dev` avvia il bot in **long polling**. Il bot si connette direttamente a Telegram e riceve gli update in tempo reale. Non serve esporre nulla all'esterno.

```bash
npm run dev        # tsx watch — riavvio automatico su modifiche
npm test           # 178+ test, nessuna dipendenza esterna
```

Tutte le funzionalità funzionano in polling: comandi, callback query, search comuni, fetch LAMMA. Il polling e il webhook sono **mutuamente esclusivi** — Telegram invia gli update solo a uno dei due.

## Deploy produzione

```bash
# 1. Login Cloudflare (una tantum)
npx wrangler login

# 2. Imposta secret (una tantum — non committabili)
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put ADMIN_CHAT_ID
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN

# 3. Deploy
npm run deploy

# 4. Imposta webhook Telegram → Worker URL
npm run webhook -- set https://allerta-meteo-toscana-bot.<account>.workers.dev/

# 5. Verifica
npm run webhook -- info
```

## Notifiche programmate

Il bot invia notifiche meteo 2 volte al giorno (09:00 e 15:00 ora italiana, corrispondenti a UTC 7–14) a tutti gli utenti iscritti. Il broadcast invia messaggi solo per i comuni che hanno un'allerta in corso (oggi o domani); i comuni senza allerta vengono soppressi. Durante ogni broadcast viene inviato anche il messaggio "Ondata di calore — Toscana" (se presente un'allerta per oggi o domani). Se non c'è nessuna allerta né meteo né calore, l'utente non riceve alcuna notifica programmata in quella fascia oraria.

**Deduplica pomeridiana:** Il messaggio delle 15:00 viene inviato solo se i dati di allerta (livello + rischi per meteo, livelli oggi/domani per calore) sono cambiati rispetto alle 09:00 dello stesso giorno. Se i dati sono invariati, il messaggio viene soppresso per evitare duplicati. Lo stato delle allerte viene salvato in una tabella `stato_allerte` con un fingerprint che viene confrontato prima dell'invio pomeridiano.

Su produzione, Cloudflare Cron Trigger esegue lo `scheduled` handler del Worker.

Configurazione in `wrangler.toml`:
```toml
[triggers]
crons = ["0 7-14 * * *"]
```

Per testare il cron localmente con `wrangler dev`:
```bash
curl "http://localhost:8787/__scheduled"
```

## Comandi bot

| Comando | Azione |
|---|---|
| `/start` | Menu principale |
| `/allerta` | Richiedi le allerte meteo on demand |
| `/previsioni` | Richiedi le previsioni meteo on demand |
| `/comuni` | Apri la gestione dei comuni monitorati |
| `/credits` | Informazioni sul bot e le fonti dati |
| `/aiuto` | Elenco dei comandi disponibili |
| `/admin` | Pannello admin, solo proprietario (menu comandi) |
| `/admin_stat` | Admin: statistiche utenti |
| `/admin_utenti` | Admin: elenco utenti registrati |
| `/admin_info <id>` | Admin: info su un utente |
| `/admin_broadcast <testo>` | Admin: invia messaggio a tutti gli utenti |

> 💡 **Suggerimento:** In qualsiasi momento, puoi digitare 3 o più lettere del nome di un comune (es. "pis") per cercarlo direttamente, senza usare nessun comando.

Tutte le funzionalità sono disponibili tramite i comandi descritti nella tabella; la gestione dei comuni (`/comuni`) è a bottoni inline sotto il messaggio.

## Pannello Admin

I comandi admin sono accessibili solo dall'utente configurato come `ADMIN_CHAT_ID`:

| Comando | Azione |
|---|---|
| `/admin` | Mostra il pannello admin |
| `/admin_stat` | Statistiche: utenti registrati e comuni seguiti |
| `/admin_utenti` | Elenco completo degli utenti registrati |
| `/admin_info <id>` | Info dettagliate su un utente specifico |
| `/admin_broadcast <testo>` | Invia un messaggio a tutti gli utenti registrati |

## Fonti dati

Le informazioni meteorologiche provengono dal [Consorzio LAMMA](https://www.lamma.toscana.it/). I bollettini sulle ondate di calore sono pubblicati dal [Ministero della Salute](https://www.salute.gov.it/new/it/tema/ondate-di-calore/bollettini-sulle-ondate-di-calore-0/) e resi disponibili in formato aperto tramite l'associazione [OnData](https://github.com/ondata/ondate-calore).

### Dati meteo (Consorzio LAMMA)

| Endpoint | Uso |
|---|---|
| `https://www.lamma.toscana.it/previ/ita/xml/lista_comuni.xml` | Elenco completo dei comuni toscani (formato XML) — usato da `npm run db:seed` per popolare il DB |
| `https://www.lamma.toscana.it/previ/ita/xml/comuni_web/dati/{url}.xml` | Dati meteo e allerta per un singolo comune — `url` è l'identificativo breve (es. `firenze`, `pisa`) |
| `https://www.lamma.toscana.it/previ/ita/immagini/image_{N}_{F}.jpg` | Mappa meteorologica — `N` = 1 (oggi), 2 (domani), 3 (dopodomani); `F` = M (mattina ~8), P (pomeriggio ~14), S (sera ~20) |

#### Struttura XML (dati comune)

```xml
<dati>
  <comune>Cascina</comune>
  <aggiornamento>21/07/2026 08:39</aggiornamento>
  <previsione idday="1" ora="giorno" datadescr="Martedì">
    <allerta value="basso"/>
    <rischio descr="idraulico" value="nessuno"/>
    <rischio descr="idrogeologico" value="nessuno"/>
    <rischio descr="temporali" value="basso"/>
    <rischio descr="vento" value="nessuno"/>
    <rischio descr="neve" value="nessuno"/>
    <rischio descr="ghiaccio" value="nessuno"/>
    <temp temp_type="min">15</temp>
    <temp temp_type="max">28</temp>
  </previsione>
  <previsione ora="mattina|pomeriggio|sera">...</previsione>
  <almanacco>
    <sole_sorge>07:30</sole_sorge>
    <sole_tramonta>17:00</sole_tramonta>
  </almanacco>
</dati>
```

#### Livelli

| Campo | Valori |
|---|---|
| Allerta | `basso` · `moderato` · `elevato` · `molto elevato` · `nessuno` · `NA` |
| Rischio | `basso` · `moderato` · `elevato` · `molto elevato` · `nessuno` · `NA` |

> I valori `basso`, `moderato`, `elevato`, `molto elevato` corrispondono alle fasi di criticità LAMMA (equivalenti rispettivamente a Giallo, Arancione, Rosso della Allertameteo regionale toscana).

### Bollettino ondata di calore (Ministero della Salute / OnData)

I bollettini ufficiali del [Ministero della Salute](https://www.salute.gov.it/new/it/tema/ondate-di-calore/bollettini-sulle-ondate-di-calore-0/) sono raccolti e resi disponibili in formato CSV dall'associazione [OnData](https://github.com/ondata/ondate-calore). Il bot utilizza il capoluogo **Firenze** come riferimento regionale per la Toscana (il bollettino nazionale copre 27 città capoluogo).

| Endpoint | Uso |
|---|---|
| `https://raw.githubusercontent.com/ondata/ondate-calore/main/data/ondate-calore_latest.csv` | CSV con colonne `citta`, `data`, `livello`, `data_estrazione`, `URL` |

**Scala livelli:**

| Codice | Nome | Emoji | Significato |
|---|---|---|---|
| `Livello0` | Verde | 🟢 | nessuna allerta |
| `Livello1` | Gialla | 🟡 | allerta |
| `Livello2` | Arancione | 🟠 | allerta |
| `Livello3` | Rossa | 🔴 | allerta |

## Test

```bash
npm test              # Esegue tutti i test (178+)
npm run test:watch    # Modalità watch
```

## Licenza

ISC — Daniele Zeolla
