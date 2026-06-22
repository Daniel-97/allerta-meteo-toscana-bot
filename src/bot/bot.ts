import { Bot } from "grammy";
import type { Config } from "../config.js";
import { registerHandlers, type BotServices } from "./handlers.js";

export function createBot(config: Config, services: BotServices) {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
  registerHandlers(bot, services);
  return bot;
}
