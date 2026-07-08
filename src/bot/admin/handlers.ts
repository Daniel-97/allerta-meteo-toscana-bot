import type { Composer, Context } from "grammy";
import type { BotServices } from "../handlers.js";
import { adminMessages } from "./messages.js";
import { mainMenuKeyboard } from "../keyboards.js";

export async function handleAdmin(ctx: Context, _services: BotServices) {
  await ctx.reply(adminMessages.welcome, { reply_markup: mainMenuKeyboard() });
}

export async function handleAdminStat(ctx: Context, services: BotServices) {
  const users = await services.users.findAllWithComuni();
  const totaleUtenti = users.length;
  const totaleComuni = users.reduce((sum, u) => sum + u.comuni.length, 0);
  await ctx.reply(adminMessages.riepilogoUtenti(totaleUtenti, totaleComuni), {
    reply_markup: mainMenuKeyboard(),
  });
}

export async function handleAdminUtenti(ctx: Context, services: BotServices) {
  const users = await services.users.findAllWithComuni();
  await ctx.reply(adminMessages.listaUtenti(users), {
    reply_markup: mainMenuKeyboard(),
  });
}

export async function handleAdminInfo(ctx: Context, services: BotServices, id: string) {
  if (!id) {
    await ctx.reply("❌ Specifica un ID Telegram: /admin_info &lt;id&gt;");
    return;
  }
  const idNum = Number(id);
  if (isNaN(idNum)) {
    await ctx.reply("❌ ID non valido.");
    return;
  }
  const user = await services.users.findByTelegramId(idNum);
  if (!user) {
    await ctx.reply(adminMessages.utenteNonTrovato, {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }
  await ctx.reply(adminMessages.infoUtente(user), {
    reply_markup: mainMenuKeyboard(),
  });
}

export async function handleAdminBroadcast(
  ctx: Context,
  services: BotServices,
  testo: string,
) {
  if (!testo) {
    await ctx.reply(adminMessages.broadcastVuoto, {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }
  const users = await services.users.findAllWithComuni();
  let inviati = 0;
  let falliti = 0;
  for (const u of users) {
    try {
      await ctx.api.sendMessage(u.idTelegram, testo);
      inviati++;
    } catch {
      falliti++;
    }
  }
  await ctx.reply(
    adminMessages.broadcastRiepilogo(inviati, users.length, falliti),
    { reply_markup: mainMenuKeyboard() },
  );
}

export function registerAdminHandlers(
  composer: Composer<Context>,
  services: BotServices,
) {
  composer.command("admin", (ctx) => handleAdmin(ctx, services));
  composer.command("admin_stat", (ctx) => handleAdminStat(ctx, services));
  composer.command("admin_utenti", (ctx) => handleAdminUtenti(ctx, services));
  composer.command("admin_info", (ctx) =>
    handleAdminInfo(ctx, services, (ctx.match as string)?.trim() ?? ""),
  );
  composer.command("admin_broadcast", (ctx) =>
    handleAdminBroadcast(ctx, services, (ctx.match as string)?.trim() ?? ""),
  );
}
