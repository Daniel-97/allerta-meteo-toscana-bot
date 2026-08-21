import type { Bot } from "grammy";
import type { BotServices } from "./handlers.js";
import { messages, messaggioCalore, haAllertaMeteo, fingerprintMeteo, fingerprintCalore, isStessoGiornoIt, escHtml } from "./messages.js";
import { caloreInlineKeyboard, allertaInlineKeyboard } from "./keyboards.js";

function isUtenteHaBloccatoBot(err: unknown): boolean {
  return err instanceof Error && err.message.includes("blocked by the user");
}

async function notificaAdmin(bot: Bot, adminChatId: number | undefined, testo: string) {
  if (!adminChatId) return;
  try {
    await bot.api.sendMessage(adminChatId, testo);
  } catch (err) {
    console.error("notifica admin fallita", err);
  }
}

export async function broadcastNotifiche(
  bot: Bot,
  services: BotServices,
  isMattina: boolean,
  adminChatId?: number
): Promise<{ totali: number; inviati: number }> {
  const users = await services.users.findAllWithComuni();
  const r = await services.heatwave.fetchAllertaCalore();
  const msgCalore = r.errore ? null : messaggioCalore(r);
  const fpCalore = fingerprintCalore(r);
  let skipCalore = false;
  let inviati = 0;

  if (r.errore) {
    const dettaglio = r.dettaglioErrore ? escHtml(r.dettaglioErrore) : "sconosciuto";
    await notificaAdmin(bot, adminChatId, `⚠️ Recupero allerta calore fallito: ${dettaglio}`);
  }

  if (!isMattina && msgCalore !== null) {
    const stored = await services.alertState.getFingerprint("allerta_calore_toscana");
    if (stored !== null && isStessoGiornoIt(stored.aggiornatoIl) && stored.fingerprint === fpCalore) {
      skipCalore = true;
    }
  }

  const comuniMeteoFalliti = new Set<string>();

  for (const user of users) {
    for (const comune of user.comuni) {
      try {
        const dati = await services.meteo.fetchDatiMeteo(comune.url);
        if (!haAllertaMeteo(dati)) continue;

        const fpMeteo = fingerprintMeteo(dati);
        if (!isMattina) {
          const stored = await services.alertState.getFingerprint("allerta_meteo_" + comune.url);
          if (stored !== null && isStessoGiornoIt(stored.aggiornatoIl) && stored.fingerprint === fpMeteo) {
            continue;
          }
        }

        const msg = comune.notificheMeteo
          ? messages.completo(dati)
          : messages.allerta(dati);
        const reply_markup = allertaInlineKeyboard(comune.nome, comune.url);
        await bot.api.sendMessage(user.idTelegram, msg, { link_preview_options: { is_disabled: true }, reply_markup });
        inviati++;

        await services.alertState.setFingerprint("allerta_meteo_" + comune.url, fpMeteo);
      } catch (err) {
        console.error("notifica fallita", { user: user.idTelegram, comune: comune.nome, err });
        if (isUtenteHaBloccatoBot(err)) continue;
        if (!comuniMeteoFalliti.has(comune.url)) {
          comuniMeteoFalliti.add(comune.url);
          const messaggioErrore = err instanceof Error ? err.message : String(err);
          await notificaAdmin(bot, adminChatId, `⚠️ Recupero dati meteo fallito per ${escHtml(comune.nome)}: ${escHtml(messaggioErrore)}`);
        }
        continue;
      }
    }

    if (!r.errore && msgCalore && !skipCalore) {
      try {
        await bot.api.sendMessage(user.idTelegram, msgCalore, {
          link_preview_options: { is_disabled: true },
          reply_markup: caloreInlineKeyboard(r.oggi?.url ?? r.domani?.url ?? ""),
        });
        inviati++;

        await services.alertState.setFingerprint("allerta_calore_toscana", fpCalore);
      } catch (err) {
        console.error("notifica calore fallita", { user: user.idTelegram, err });
      }
    }
  }

  return { totali: users.length, inviati };
}
