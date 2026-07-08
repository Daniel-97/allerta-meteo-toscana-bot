import type { BotServices } from "./bot/handlers.js";
import { createConfig } from "./config.js";
import { createDb } from "./db/index.js";
import { createArchivioComuni } from "./services/comuni.js";
import { createUsersRepository } from "./services/users.js";
import { createMeteoService } from "./services/meteo.js";
import { createHeatWaveService } from "./services/heatwave.js";
import { createAlertStateService } from "./services/alert-state.js";
import { createBot } from "./bot/bot.js";
import { broadcastNotifiche } from "./bot/scheduler.js";

export interface Env extends Record<string, string | undefined> {
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_CHAT_ID: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  NODE_ENV: string;
}

let initialized: { bot: any; services: BotServices } | null = null;

async function getInitialized(env: Env) {
  if (initialized) return initialized;
  const config = createConfig(env);
  const db = createDb(config) as any;
  const services: BotServices = {
    comuni: createArchivioComuni(db),
    users: createUsersRepository(db),
    meteo: createMeteoService(),
    heatwave: createHeatWaveService(),
    alertState: createAlertStateService(db),
  };
  const bot = createBot(config, services);
  await bot.init();
  initialized = { bot, services };
  return initialized;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const { bot } = await getInitialized(env);
    try {
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response("OK");
    } catch (err) {
      console.error("fetch handler error", err, request.url);
      return new Response("Internal error", { status: 500 });
    }
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    const now = new Date();
    const oraIt = parseInt(
      new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "numeric", hourCycle: "h23" }).format(now),
      10,
    );
    if (oraIt !== 8 && oraIt !== 15) {
      console.log(`scheduled: skipped (Italian hour ${oraIt})`);
      return;
    }

    const { bot, services } = await getInitialized(env);
    try {
      const isMattina = oraIt === 8;
      const adminChatId = Number(env.ADMIN_CHAT_ID);
      const result = await broadcastNotifiche(bot, services, isMattina, adminChatId);
      console.log(`scheduled: ${result.inviati}/${result.totali} notifiche inviate`);
    } catch (err) {
      console.error("scheduled handler error", err);
    }
  },
};
