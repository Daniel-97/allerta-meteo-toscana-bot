import type { Bot } from "grammy";
import type { BotServices } from "./handlers.js";
import { messages, messaggioCalore, haAllertaMeteo, fingerprintMeteo, fingerprintCalore, isStessoGiornoIt } from "./messages.js";
import { mappeMeteoInlineKeyboard, caloreInlineKeyboard } from "./keyboards.js";

export async function broadcastNotifiche(
  bot: Bot,
  services: BotServices,
  isMattina: boolean
): Promise<{ totali: number; inviati: number }> {
  const users = await services.users.findAllWithComuni();
  const r = await services.heatwave.fetchAllertaCalore();
  const msgCalore = messaggioCalore(r);
  const fpCalore = fingerprintCalore(r);
  let skipCalore = false;
  let inviati = 0;

  if (!isMattina && msgCalore !== null) {
    const stored = await services.alertState.getFingerprint("allerta_calore_toscana");
    if (stored !== null && isStessoGiornoIt(stored.aggiornatoIl) && stored.fingerprint === fpCalore) {
      skipCalore = true;
    }
  }

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
        const reply_markup = comune.notificheMeteo
          ? mappeMeteoInlineKeyboard()
          : undefined;
        await bot.api.sendMessage(user.idTelegram, msg, { link_preview_options: { is_disabled: true }, reply_markup });
        inviati++;

        await services.alertState.setFingerprint("allerta_meteo_" + comune.url, fpMeteo);
      } catch (err) {
        console.error("notifica fallita", { user: user.idTelegram, comune: comune.nome, err });
        continue;
      }
    }

    if (msgCalore && !skipCalore) {
      try {
        const extra: Record<string, unknown> = { link_preview_options: { is_disabled: true } };
        if (!r.errore) extra.reply_markup = caloreInlineKeyboard();
        await bot.api.sendMessage(user.idTelegram, msgCalore, extra);
        inviati++;

        if (!r.errore) {
          await services.alertState.setFingerprint("allerta_calore_toscana", fpCalore);
        }
      } catch (err) {
        console.error("notifica calore fallita", { user: user.idTelegram, err });
      }
    }
  }

  return { totali: users.length, inviati };
}
