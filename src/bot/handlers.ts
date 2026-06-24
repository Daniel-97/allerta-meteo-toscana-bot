import type { Bot, Context, Filter } from "grammy";
import { GrammyError } from "grammy";
import type { ArchivioComuni } from "../services/comuni.js";
import type { UsersRepository } from "../services/users.js";
import type { MeteoService } from "../services/meteo.js";
import { messages, costruisciAlbumImmagini, escHtml } from "./messages.js";
import { mainMenuKeyboard, mappeMeteoInlineKeyboard, comuniInlineKeyboard, confermaInlineKeyboard, gestisciSubMenuKeyboard, comuniSelezioneInlineKeyboard, confermaEliminaInlineKeyboard, confermaModificaInlineKeyboard } from "./keyboards.js";

export interface BotServices {
  comuni: ArchivioComuni;
  users: UsersRepository;
  meteo: MeteoService;
}

async function safeEditMessageText(ctx: Context, text: string, extra?: Record<string, unknown>) {
  try {
    await ctx.editMessageText(text, extra);
  } catch (err) {
    if (err instanceof GrammyError && err.description?.includes("message is not modified")) {
      return;
    }
    throw err;
  }
}

async function handleAllerta(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComunePrevisioni, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(messages.allerta(dati), { reply_markup: mainMenuKeyboard() });
    } catch {
      await ctx.reply(messages.errore);
    }
  }
}

export async function handlePrevisioni(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComunePrevisioni, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(messages.previsioni(dati), { reply_markup: mappeMeteoInlineKeyboard(), link_preview_options: { is_disabled: true } });
    } catch {
      await ctx.reply(messages.errore);
    }
  }
}

export async function handleRichiestaTestoLibero(
  ctx: Context,
  services: BotServices,
) {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith("/") || text.length < 3) return;
  try {
    const risultati = await services.comuni.searchByPrefix(text);
    if (risultati.length === 0) {
      await ctx.reply(messages.ricercaNonTrovato(text));
      return;
    }
    await ctx.reply(messages.ricercaTrovati(risultati.length, text), {
      reply_markup: comuniInlineKeyboard(risultati),
    });
  } catch {
    await ctx.reply(messages.errore);
  }
}

export function registerHandlers(bot: Bot, services: BotServices, adminChatId?: number) {
  bot.command("start", async (ctx) => {
    await ctx.reply(messages.welcome, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("credits", async (ctx) => {
    await ctx.reply(messages.credits, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("annulla", async (ctx) => {
    await ctx.reply(messages.annulla, { reply_markup: mainMenuKeyboard() });
  });

  bot.hears("🚨 Aggiorna allerta", (ctx) => handleAllerta(ctx, services));
  bot.command("allerta", (ctx) => handleAllerta(ctx, services));

  bot.hears("🌤️ Aggiorna meteo", (ctx) => handlePrevisioni(ctx, services));
  bot.command("previsioni", (ctx) => handlePrevisioni(ctx, services));

  bot.command("aggiungi", async (ctx) => {
    const text = ctx.match?.trim() ?? "";
    if (!text) {
      await ctx.reply(messages.aggiungiPrompt);
      return;
    }
    const risultati = await services.comuni.searchByPrefix(text);
    if (risultati.length === 0) {
      await ctx.reply(messages.impostaNonTrovato);
      return;
    }
    await ctx.reply(messages.comuniTrovati, {
      reply_markup: comuniInlineKeyboard(risultati),
    });
  });

  bot.command("elimina", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.selezionaComuneDaEliminare, {
      reply_markup: comuniSelezioneInlineKeyboard(user.comuni, "del"),
    });
  });

  bot.command("modifica", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.selezionaComuneDaModificare, {
      reply_markup: comuniSelezioneInlineKeyboard(user.comuni, "mod"),
    });
  });

  bot.command("lista", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.gestisciComuni(user.comuni), {
      reply_markup: gestisciSubMenuKeyboard(),
    });
  });

  bot.hears("📋 Gestisci comuni", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.gestisciComuni(user.comuni), {
      reply_markup: gestisciSubMenuKeyboard(),
    });
  });

  bot.hears("➕ Aggiungi", async (ctx) => {
    await ctx.reply(messages.aggiungiPrompt);
  });

  bot.hears("🗑️ Elimina", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.selezionaComuneDaEliminare, {
      reply_markup: comuniSelezioneInlineKeyboard(user.comuni, "del"),
    });
  });

  bot.hears("✏️ Modifica", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.selezionaComuneDaModificare, {
      reply_markup: comuniSelezioneInlineKeyboard(user.comuni, "mod"),
    });
  });

  bot.hears("📋 Lista", async (ctx) => {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await ctx.reply(messages.nessunComune, { reply_markup: mainMenuKeyboard() });
      return;
    }
    await ctx.reply(messages.gestisciComuni(user.comuni), {
      reply_markup: gestisciSubMenuKeyboard(),
    });
  });

  bot.hears("🔙 Indietro", async (ctx) => {
    await ctx.reply(messages.welcome, { reply_markup: mainMenuKeyboard() });
  });

  bot.hears("ℹ️ Credits&Info", async (ctx) => {
    await ctx.reply(messages.credits, { reply_markup: mainMenuKeyboard() });
  });

  bot.on("callback_query:data", (ctx) => handleCallbackQuery(ctx, services, adminChatId));

  bot.command("help", async (ctx) => {
    await ctx.reply(messages.help);
  });

  bot.on("message:text", (ctx) => handleRichiestaTestoLibero(ctx, services));
}

export async function handleCallbackQuery(
  ctx: Filter<Context, "callback_query:data">,
  services: BotServices,
  adminChatId?: number,
) {
  const data = ctx.callbackQuery.data;
  const parts = data.split(":");
  const action = parts[0];

  if (action === "back") {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await safeEditMessageText(ctx, messages.nessunComune, {
        reply_markup: { inline_keyboard: [] },
      });
      return;
    }
    await safeEditMessageText(ctx, messages.gestisciComuni(user.comuni), {
      reply_markup: { inline_keyboard: [] },
    });
    return;
  }

  if (action === "annulla") {
    await safeEditMessageText(ctx, messages.annulla, {
      reply_markup: { inline_keyboard: [] },
    });
    return;
  }

  if (action === "sel") {
    const [, url, nome] = parts;
    await safeEditMessageText(ctx, messages.impostaConferma(nome), {
      reply_markup: confermaInlineKeyboard(url, nome),
    });
    return;
  }

  if (action === "sub") {
    const [, url, nome, flagRaw] = parts;
    const notificheMeteo = flagRaw === "1";
    await safeEditMessageText(ctx, messages.impostaPrompt, {
      reply_markup: { inline_keyboard: [] },
    });

    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;

    const existingUser = await services.users.findByTelegramId(idTelegram);
    const isNewUser = !existingUser;

    await services.users.subscribe({
      idTelegram,
      usernameTelegram: ctx.from?.username ?? null,
      nomeTelegram: ctx.from?.first_name ?? "",
      comune: { nome, url },
      notificheMeteo,
    });

    if (isNewUser && adminChatId) {
      const displayName = ctx.from?.first_name
        ? `${escHtml(ctx.from.first_name)}${ctx.from?.username ? ` (@${escHtml(ctx.from.username)})` : ""}`
        : `ID ${idTelegram}`;
      await ctx.api.sendMessage(
        adminChatId,
        `🆕 <b>Nuovo utente!</b>\n👤 ${displayName}\n🆔 ${idTelegram}\n📍 ${escHtml(nome)}\n🔔 Meteo: ${notificheMeteo ? "✅" : "❌"}`,
      );
    }

    const msg = notificheMeteo
      ? messages.impostaOkAllerta(nome)
      : messages.impostaOk(nome);
    await ctx.reply(msg, { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (action === "manage") {
    const id = ctx.from?.id;
    if (!id) return;
    const user = await services.users.findByTelegramId(id);
    if (!user || user.comuni.length === 0) {
      await safeEditMessageText(ctx, messages.nessunComune, {
        reply_markup: { inline_keyboard: [] },
      });
      return;
    }
    await safeEditMessageText(ctx, messages.gestisciComuni(user.comuni), {
      reply_markup: { inline_keyboard: [] },
    });
    return;
  }

  if (action === "del") {
    const [, url, nome] = parts;
    await safeEditMessageText(ctx, messages.confermaElimina(nome), {
      reply_markup: confermaEliminaInlineKeyboard(url, nome),
    });
    return;
  }

  if (action === "del-confirm") {
    const [, url, nome] = parts;
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    await services.users.removeComune(idTelegram, url);
    await safeEditMessageText(ctx, messages.eliminato(nome), {
      reply_markup: { inline_keyboard: [] },
    });
    await ctx.reply(messages.eliminato(nome), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (action === "mod") {
    const [, url, nome] = parts;
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    const user = await services.users.findByTelegramId(idTelegram);
    if (!user) return;
    const comune = user.comuni.find((c) => c.url === url);
    if (!comune) return;
    const stato = comune.notificheMeteo ? "ATTIVE" : "DISATTIVE";
    await safeEditMessageText(ctx, messages.confermaModifica(nome, stato), {
      reply_markup: confermaModificaInlineKeyboard(url, nome),
    });
    return;
  }

  if (action === "mod-set") {
    const [, url, nome, flagRaw] = parts;
    const notificheMeteo = flagRaw === "1";
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    await services.users.updateNotificheMeteo(idTelegram, url, notificheMeteo);
    const stato = notificheMeteo ? "ATTIVE" : "DISATTIVE";
    await safeEditMessageText(ctx, messages.modificato(nome, stato), {
      reply_markup: { inline_keyboard: [] },
    });
    await ctx.reply(messages.modificato(nome, stato), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (action === "img") {
    await ctx.answerCallbackQuery();
    await ctx.replyWithMediaGroup(costruisciAlbumImmagini());
    return;
  }

  if (action === "sat") {
    await ctx.answerCallbackQuery();
    await ctx.replyWithAnimation("https://modeles20.meteociel.fr/satellite/animsatirmtgeu.gif");
    return;
  }
}
