# Design: Bot + Scheduler + Bootstrap (Cloudflare Workers)

**Data:** 2026-06-22 · **Branch:** `redesign-typescript` · **Sub-project:** 4 di 4

## Architettura

Worker Cloudflare con webhook Telegram per messaggi utente e Cron Triggers per notifiche programmate. Stateless via inline keyboard + callback_data. Dual-mode: `bot.start()` (polling) per dev locale, Worker per prod.

```
Telegram webhook ─POST─► fetch(request, env) ─► bot.handleUpdate(update)
Cron Trigger 9:30/15:30 ──► scheduled(event, env) ─► broadcastNotifiche()
initialize(env) ─► createConfig(env) + createDb(config) + createBot(config, services)
```

## File structure

| File | Azione | Responsabilità |
|---|---|---|
| `src/config.ts` | Riscrivi | `createConfig(env)` factory + lazy singleton backward compat |
| `src/db/index.ts` | Riscrivi | `createDb(config)` factory + lazy singleton backward compat |
| `src/bot/strings.ts` | Crea | Template messaggi |
| `src/bot/keyboards.ts` | Crea | Custom keyboard (menu) + inline keyboard (comuni selection) |
| `src/bot/handlers.ts` | Crea | Handler stateless (command + callback_query) |
| `src/bot/bot.ts` | Crea | `createBot(config, services)` → Bot con handlers registrati |
| `src/bot/scheduler.ts` | Crea | `broadcastNotifiche(bot, services)` |
| `src/dev.ts` | Crea | Dev entry: `bot.start()` polling |
| `src/index.ts` | Crea | Worker entry: `fetch` + `scheduled` |
| `wrangler.toml` | Crea | Worker config + Cron Triggers |
| `package.json` | Modifica | `wranger` devDep, script `deploy`, rimuovi `node-cron` |

## Decisioni chiave

- **Stateless**: flow "imposta comune" via `/imposta <nome>` + inline keyboard con callback_data. Niente session, niente conversations
- **Main menu**: custom keyboard 4 bottoni (come legacy)
- **Comandi**: `/start`, `/allerta`, `/previsioni`, `/imposta`, `/credits`, `/annulla` (anche via bottoni custom keyboard)
- **Scheduler**: `scheduled` handler Workers. Limite 50 subrequest/invocation (free) — per bot piccolo (≤25 utenti) basta; oltre → Cloudflare Queues
- **Dev**: `npm run dev` → `tsx watch src/dev.ts` → `bot.start()` polling. Zero setup webhook
- **Prod**: `wrangler deploy` → Worker webhook. `bot.api.setWebhook(url)` via one-shot script
- **Refactor config/db**: factory `createConfig(env)` + `createDb(config)` per Workers. Backward compat via lazy singleton per Node dev
