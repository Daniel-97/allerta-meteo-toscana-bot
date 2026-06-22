import type { Context, NextFunction } from "grammy";
import { logger } from "../logger.js";

export async function logUserMessage(ctx: Context, next: NextFunction) {
  const from = ctx.from;
  const text = ctx.message?.text ?? ctx.callbackQuery?.data;
  if (from && text) {
    logger.info({ userId: from.id, username: from.username ?? null, text }, "user_message");
  }
  await next();
}
