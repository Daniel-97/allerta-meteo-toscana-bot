import type { Bot } from "grammy";
import type { BotServices } from "./handlers.js";
import { formattaAllerta, formattaCompleto } from "../services/messaggi.js";

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
          ? formattaCompleto(dati)
          : formattaAllerta(dati);
        await bot.api.sendMessage(user.idTelegram, msg);
        inviati++;
      } catch {
        continue;
      }
    }
  }

  return { totali: users.length, inviati };
}
