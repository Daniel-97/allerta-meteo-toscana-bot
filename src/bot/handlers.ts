import type { Bot, Context, Filter } from "grammy";
import { GrammyError } from "grammy";
import type { ArchivioComuni } from "../services/comuni.js";
import type { UsersRepository } from "../services/users.js";
import type { MeteoService } from "../services/meteo.js";
import { formattaAllerta, formattaPrevisioni } from "../services/messaggi.js";
import { strings } from "./strings.js";
import { mainMenuKeyboard, comuniInlineKeyboard, confermaInlineKeyboard } from "./keyboards.js";

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
  if (!user) {
    await ctx.reply(strings.nonIscritto, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(formattaAllerta(dati), { reply_markup: mainMenuKeyboard() });
    } catch {
      await ctx.reply(strings.errore);
    }
  }
}

async function handlePrevisioni(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user) {
    await ctx.reply(strings.nonIscritto, { reply_markup: mainMenuKeyboard() });
    return;
  }
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      await ctx.reply(formattaPrevisioni(dati), { reply_markup: mainMenuKeyboard() });
    } catch {
      await ctx.reply(strings.errore);
    }
  }
}

export function registerHandlers(bot: Bot, services: BotServices) {
  bot.command("start", async (ctx) => {
    await ctx.reply(strings.welcome, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("credits", async (ctx) => {
    await ctx.reply(strings.credits, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("annulla", async (ctx) => {
    await ctx.reply("Operazione annullata.", { reply_markup: mainMenuKeyboard() });
  });

  bot.hears("Aggiorna allerta", (ctx) => handleAllerta(ctx, services));
  bot.command("allerta", (ctx) => handleAllerta(ctx, services));

  bot.hears("Aggiorna meteo", (ctx) => handlePrevisioni(ctx, services));
  bot.command("previsioni", (ctx) => handlePrevisioni(ctx, services));

  bot.hears("Imposta comune", async (ctx) => {
    await ctx.reply(strings.impostaPrompt);
  });

  bot.command("imposta", async (ctx) => {
    const text = ctx.match?.trim() ?? "";
    if (!text) {
      await ctx.reply(strings.impostaPrompt);
      return;
    }
    const risultati = await services.comuni.searchByPrefix(text);
    if (risultati.length === 0) {
      await ctx.reply(strings.impostaNonTrovato);
      return;
    }
    await ctx.reply("Comuni trovati:", {
      reply_markup: comuniInlineKeyboard(risultati),
    });
  });

  bot.hears("Credits&Info", async (ctx) => {
    await ctx.reply(strings.credits, { reply_markup: mainMenuKeyboard() });
  });

  bot.on("callback_query:data", (ctx) => handleCallbackQuery(ctx, services));

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Comandi disponibili:\n/allerta — Ricevi l'allerta meteo\n" +
      "/previsioni — Ricevi le previsioni\n/imposta <nome> — Imposta un comune\n" +
      "/credits — Info sul servizio\n/annulla — Annulla operazione"
    );
  });
}

export async function handleCallbackQuery(
  ctx: Filter<Context, "callback_query:data">,
  services: BotServices,
) {
  const data = ctx.callbackQuery.data;
  const parts = data.split(":");
  const action = parts[0];

  if (action === "sel") {
    const [, url, nome] = parts;
    await safeEditMessageText(ctx, strings.impostaConferma(nome), {
      reply_markup: confermaInlineKeyboard(url, nome),
    });
    return;
  }

  if (action === "sub") {
    const [, url, nome, flagRaw] = parts;
    const notificheMeteo = flagRaw === "1";
    await safeEditMessageText(ctx, strings.impostaPrompt, {
      reply_markup: { inline_keyboard: [] },
    });

    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;

    await services.users.subscribe({
      idTelegram,
      usernameTelegram: ctx.from?.username ?? null,
      nomeTelegram: ctx.from?.first_name ?? "",
      comune: { nome, url },
      notificheMeteo,
    });

    const msg = notificheMeteo
      ? strings.impostaOkAllerta(nome)
      : strings.impostaOk(nome);
    await ctx.reply(msg, { reply_markup: mainMenuKeyboard() });
    return;
  }
}
