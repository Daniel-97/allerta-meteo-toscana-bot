# Allerta Meteo Toscana Bot

Bot Telegram per allerte meteo della Toscana, basato sui dati resi disponibili dal [Consorzio LAMMA](http://www.lamma.rete.toscana.it/).

## Architettura

```
Cloudflare Worker (webhook)──► grammY ──► Telegram Bot API
       │
       ├── Turso (libSQL) — utenti, comuni, sessioni
       ├── LAMMA XML API — dati meteo e allerte
       └── Cron Trigger (9:30, 15:30) — notifiche programmate
```

| Componente | Tecnologia |
|---|---|
| Hosting | Cloudflare Workers (serverless, zero self-hosting) |
| Database | Turso (SQLite gestito, HTTP-based) |
| Bot framework | grammY |
| ORM | Drizzle ORM |
| Stato bot | Stateless — inline keyboard + callback_data (nessuna sessione) |
| Dev locale | Polling (`bot.start()`), nessun webhook necessario |
| Deploy | `wrangler deploy` + Telegram webhook |

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

# 4. Applica migrazioni DB (crea tabelle su Turso)
npm run db:migrate

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
npm test           # 38 test, nessuna dipendenza esterna
```

Tutte le funzionalità funzionano in polling: comandi, callback query, search comuni, fetch LAMMA. Il polling e il webhook sono **mutuamente esclusivi** — Telegram invia gli update solo a uno dei due.

## Test webhook in locale (wrangler dev)

Se vuoi testare il percorso webhook (esattamente come sarà in produzione):

```bash
# Terminale 1: avvia Worker locale con URL pubblico
npx wrangler dev

# L'output mostra un URL pubblico (https://<subdomain>.trycloudflare.com/)
# Copia l'URL

# Terminale 2: imposta webhook su quell'URL
npm run webhook -- set https://<subdomain>.trycloudflare.com/

# Testa il bot su Telegram...

# Quando finisci: elimina webhook per tornare a polling
npm run webhook -- delete
```

`wrangler dev` simula l'ambiente Cloudflare Workers localmente e fornisce un URL pubblico tramite Cloudflare Tunnel.

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

## Gestione webhook

```bash
npm run webhook -- set <url>     # Imposta webhook su un URL
npm run webhook -- delete        # Elimina webhook (torna a polling)
npm run webhook -- info          # Mostra stato webhook (URL, errori, coda)
```

## Notifiche programmate

Il bot invia notifiche meteo 2 volte al giorno (9:30 e 15:30) a tutti gli utenti iscritti. Su produzione, Cloudflare Cron Trigger esegue lo `scheduled` handler del Worker.

Configurazione in `wrangler.toml`:
```toml
[triggers]
crons = ["30 9,15 * * *"]
```

Per testare il cron localmente con `wrangler dev`:
```bash
curl "http://localhost:8787/__scheduled"
```

## Comandi bot

| Comando / Bottone | Azione |
|---|---|
| `/start` | Menu principale |
| `/allerta` o "Aggiorna allerta" | Allerta meteo per i tuoi comuni |
| `/previsioni` o "Aggiorna meteo" | Previsioni meteo per i tuoi comuni |
| `/imposta <nome>` o "Imposta comune" | Cerca e iscrivi a un comune |
| `/credits` o "Credits&Info" | Info sul servizio |
| `/annulla` | Annulla operazione corrente |

## Struttura del progetto

```
src/
├── index.ts              # Worker entry point (webhook + cron)
├── dev.ts                # Dev entry point (polling)
├── config.ts             # Config factory (Zod validation)
├── logger.ts             # Logger (pino)
├── db/
│   ├── index.ts          # DB factory (@libsql/client + Drizzle)
│   ├── schema.ts         # Schema (utenti, utenti_comuni, sessioni, comuni)
│   └── migrations/       # SQL migrations (drizzle-kit)
├── services/
│   ├── comuni.ts         # Archivio comuni (searchByPrefix, findByNome, all)
│   ├── users.ts          # Users repository (subscribe, findByTelegramId, findAllWithComuni)
│   ├── meteo.ts          # Meteo service (fetch + parse XML LAMMA → DatiMeteo)
│   └── messaggi.ts       # Message formatters (allerta, previsioni, completo, image URL)
├── bot/
│   ├── handlers.ts       # Command + callback query handlers
│   ├── bot.ts            # Bot factory (createBot)
│   ├── strings.ts        # Message templates
│   ├── keyboards.ts      # Custom + inline keyboard builders
│   └── scheduler.ts      # Notifica programmata (broadcastNotifiche)
└── types/
    └── index.ts          # Tipi condivisi (Comune, DatiMeteo, LivelloAllerta, ...)

scripts/
├── seed-comuni.ts        # Import XML comuni → Turso
└── webhook.ts            # Gestione webhook Telegram

tests/
├── config.test.ts        # 3 test (env schema)
├── services/
│   ├── comuni.test.ts    # 7 test
│   ├── users.test.ts     # 7 test
│   ├── meteo.test.ts     # 8 test
│   └── messaggi.test.ts  # 12 test
├── bot/
│   └── scheduler.test.ts # 1 test
└── helpers/
    └── test-db.ts        # createTestDb (:memory: libsql + migrate)

XML/
└── lista_comuni.xml      # Lista comuni Toscana (fonte per seed)

wrangler.toml              # Config Cloudflare Workers
drizzle.config.ts          # Config Drizzle Kit (dialect turso)
tsconfig.json              # TypeScript config
```

## Test

```bash
npm test              # Esegue tutti i test (38)
npm run test:watch    # Modalità watch
```

## Licenza

ISC — Daniele Zeolla
