import type { Bot } from "grammy";
import type { BotServices } from "./handlers.js";
import { messages } from "./messages.js";
import { mappeMeteoInlineKeyboard } from "./keyboards.js";

export async function broadcastNotifiche(
  bot: Bot,
  services: BotServices
): Promise<{ totali: number; inviati: number }> {
  const users = await services.users.findAllWithComuni();
  let inviati = 0;

  for (const user of users) {
    for (const comune of user.comuni) {
      try {
        const dati = await services.meteo.fetchDatiMeteo(comune.url);
        const msg = comune.notificheMeteo
          ? messages.completo(dati)
          : messages.allerta(dati);
        const reply_markup = comune.notificheMeteo
          ? mappeMeteoInlineKeyboard()
          : undefined;
        await bot.api.sendMessage(user.idTelegram, msg, { link_preview_options: { is_disabled: true }, reply_markup });
        inviati++;
      } catch (err) {
        console.error("notifica fallita", { user: user.idTelegram, comune: comune.nome, err });
        continue;
      }
    }
  }

  return { totali: users.length, inviati };
}
