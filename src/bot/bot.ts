import { Bot } from "grammy";
import type { Config } from "../config.js";
import { registerHandlers, type BotServices } from "./handlers.js";

export function createBot(config: Config, services: BotServices) {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  bot.api.config.use((prev, method, payload: any) => {
    if (method === "sendMessage" || method === "editMessageText") {
      payload.parse_mode = "HTML";
    }
    return prev(method, payload);
  });

  registerHandlers(bot, services);
  return bot;
}
