import type { Context, NextFunction } from "grammy";

export function isAdmin(adminChatId: number) {
  return (ctx: Context, next: NextFunction) => {
    if (ctx.from?.id === adminChatId) return next();
  };
}
