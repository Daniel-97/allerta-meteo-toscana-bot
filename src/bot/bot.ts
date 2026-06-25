import { Bot, Composer } from "grammy";
import type { Context } from "grammy";
import type { Config } from "../config.js";
import { registerHandlers, handleRichiestaTestoLibero, type BotServices } from "./handlers.js";
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

  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message?.text?.trim();
    if (!text || text.startsWith("/") || text.length < 3) {
      return await next();
    }
    await handleRichiestaTestoLibero(ctx, services);
  });

  if (adminChatId) {
    const adminScope = new Composer<Context>();
    adminScope.use(isAdmin(adminChatId));
    registerAdminHandlers(adminScope, services);
    bot.use(adminScope);
  }

  return bot;
}