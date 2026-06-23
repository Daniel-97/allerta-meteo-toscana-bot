import { Bot } from "grammy";
import type { Config } from "../config.js";
import { registerHandlers, type BotServices } from "./handlers.js";
import { logUserMessage } from "./logging.js";
import { registerAdminHandlers } from "./admin/handlers.js";
import { isAdmin } from "./admin/middleware.js";

export function createBot(config: Config, services: BotServices) {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  bot.api.config.use((prev, method, payload: any) => {
    if (method === "sendMessage" || method === "editMessageText") {
      payload.parse_mode = "HTML";
    }
    return prev(method, payload);
  });

  bot.use(logUserMessage);
  const adminChatId = Number(config.ADMIN_CHAT_ID);
  registerHandlers(bot, services, adminChatId);
  if (adminChatId) {
    bot.use(isAdmin(adminChatId));
    registerAdminHandlers(bot, services, adminChatId);
  }

  return bot;
}
