import type { Bot, Context, Filter } from "grammy";
import { GrammyError } from "grammy";
import type { DatiMeteo } from "../types/index.js";
import type { ArchivioComuni } from "../services/comuni.js";
import type { UsersRepository } from "../services/users.js";
import type { MeteoService } from "../services/meteo.js";
import type { HeatWaveService } from "../services/heatwave.js";
import type { AlertStateService } from "../services/alert-state.js";
import type { RateLimiterService } from "../services/rate-limiter.js";
import { messages, costruisciAlbumImmagini, escHtml, messaggioCalore, haAllertaMeteo } from "./messages.js";
import { mappeMeteoInlineKeyboard, comuniInlineKeyboard, confermaInlineKeyboard, comuniGestioneInlineKeyboard, comuneDettaglioInlineKeyboard, confermaEliminaInlineKeyboard, caloreInlineKeyboard } from "./keyboards.js";

export interface BotServices {
  comuni: ArchivioComuni;
  users: UsersRepository;
  meteo: MeteoService;
  heatwave: HeatWaveService;
  alertState: AlertStateService;
  rateLimiter: RateLimiterService;
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

export async function handleAllerta(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComunePrevisioni);
    return;
  }
  let allowed: boolean;
  try {
    allowed = await services.rateLimiter.isAllowed(id);
  } catch {
    await ctx.reply(messages.errore);
    return;
  }
  if (!allowed) {
    await ctx.reply(messages.limiteRichieste);
    return;
  }
  const r = await services.heatwave.fetchAllertaCalore();
  const msgCalore = messaggioCalore(r);

  const comuniConAllerta: DatiMeteo[] = [];
  for (const c of user.comuni) {
    try {
      const dati = await services.meteo.fetchDatiMeteo(c.url);
      if (haAllertaMeteo(dati)) comuniConAllerta.push(dati);
    } catch {
      await ctx.reply(messages.errore);
    }
  }

  const haMeteo = comuniConAllerta.length > 0;
  const haCalore = msgCalore !== null;

  if (!haMeteo && !haCalore) {
    await ctx.reply(messages.nessunaAllerta);
    return;
  }
  for (const dati of comuniConAllerta) {
    await ctx.reply(messages.allerta(dati));
  }
  if (msgCalore) {
    const extra: Record<string, unknown> = { link_preview_options: { is_disabled: true } };
    if (!r.errore) extra.reply_markup = caloreInlineKeyboard();
    await ctx.reply(msgCalore, extra);
  }
}

export async function handlePrevisioni(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  if (!user || user.comuni.length === 0) {
    await ctx.reply(messages.nessunComunePrevisioni);
    return;
  }
  let allowed: boolean;
  try {
    allowed = await services.rateLimiter.isAllowed(id);
  } catch {
    await ctx.reply(messages.errore);
    return;
  }
  if (!allowed) {
    await ctx.reply(messages.limiteRichieste);
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

function buildListaComuniView(comuni: Array<{ nome: string; url: string; notificheMeteo: boolean }>) {
  const text = comuni.length === 0 ? messages.nessunComune : messages.gestisciComuni(comuni);
  return { text, reply_markup: comuniGestioneInlineKeyboard(comuni) };
}

async function renderListaComuni(ctx: Context, services: BotServices, idTelegram: number) {
  const user = await services.users.findByTelegramId(idTelegram);
  const view = buildListaComuniView(user?.comuni ?? []);
  await safeEditMessageText(ctx, view.text, { reply_markup: view.reply_markup });
}

async function renderDettaglioComune(ctx: Context, url: string, nome: string, notificheMeteo: boolean) {
  await safeEditMessageText(ctx, messages.dettaglioComune(nome, notificheMeteo), {
    reply_markup: comuneDettaglioInlineKeyboard(url, nome, notificheMeteo),
  });
}

async function renderDettaglioOFallbackLista(
  ctx: Context,
  services: BotServices,
  idTelegram: number,
  url: string,
  nome: string,
) {
  const user = await services.users.findByTelegramId(idTelegram);
  const comune = user?.comuni.find((c) => c.url === url);
  if (!comune) {
    await renderListaComuni(ctx, services, idTelegram);
    return;
  }
  await renderDettaglioComune(ctx, url, nome, comune.notificheMeteo);
}

export async function handleGestisciComuni(ctx: Context, services: BotServices) {
  const id = ctx.from?.id;
  if (!id) return;
  const user = await services.users.findByTelegramId(id);
  const view = buildListaComuniView(user?.comuni ?? []);
  await ctx.reply(view.text, { reply_markup: view.reply_markup });
}

export async function handleCredits(ctx: Context) {
  await ctx.reply(messages.credits, { link_preview_options: { is_disabled: true } });
}

export async function handleAiuto(ctx: Context) {
  await ctx.reply(messages.aiuto);
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
    // remove_keyboard pulisce eventuali reply keyboard rimaste agganciate lato
    // client da versioni precedenti del bot (Telegram non le rimuove da sola).
    await ctx.reply(messages.welcome, { reply_markup: { remove_keyboard: true } });
  });

  bot.command("allerta", (ctx) => handleAllerta(ctx, services));
  bot.command("previsioni", (ctx) => handlePrevisioni(ctx, services));
  bot.command("comuni", (ctx) => handleGestisciComuni(ctx, services));
  bot.command("credits", handleCredits);
  bot.command("aiuto", handleAiuto);

  bot.on("callback_query:data", (ctx) => handleCallbackQuery(ctx, services, adminChatId));
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
    await renderListaComuni(ctx, services, id);
    return;
  }

  if (action === "annulla") {
    const [, url, nome] = parts;
    const id = ctx.from?.id;
    if (!id) return;
    await renderDettaglioOFallbackLista(ctx, services, id, url, nome);
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
    await safeEditMessageText(ctx, messages.impostaConferma(nome), {
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

    const comuniAggiornati = [
      ...(existingUser?.comuni.filter((c) => c.url !== url) ?? []),
      { nome, url, notificheMeteo },
    ];

    const msg = notificheMeteo
      ? messages.impostaOkAllerta(nome)
      : messages.impostaOk(nome);
    await ctx.reply(msg, { reply_markup: comuniGestioneInlineKeyboard(comuniAggiornati) });
    return;
  }

  if (action === "comune") {
    const [, url, nome] = parts;
    const id = ctx.from?.id;
    if (!id) return;
    await renderDettaglioOFallbackLista(ctx, services, id, url, nome);
    return;
  }

  if (action === "toggle") {
    const [, url, nome, flagRaw] = parts;
    const notificheMeteo = flagRaw === "1";
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    await services.users.updateNotificheMeteo(idTelegram, url, notificheMeteo);
    await renderDettaglioComune(ctx, url, nome, notificheMeteo);
    return;
  }

  if (action === "aggiungi") {
    await ctx.reply(messages.aggiungiPrompt);
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
    const [, url] = parts;
    const idTelegram = ctx.from?.id;
    if (!idTelegram) return;
    await services.users.removeComune(idTelegram, url);
    await renderListaComuni(ctx, services, idTelegram);
    return;
  }

  if (action === "img") {
    await ctx.answerCallbackQuery();
    await ctx.replyWithMediaGroup(costruisciAlbumImmagini());
    return;
  }

}
