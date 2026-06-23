import { describe, it, expect, vi } from "vitest";
import { broadcastNotifiche } from "../../src/bot/scheduler.js";

describe("broadcastNotifiche", () => {
  it("invia messaggio per ogni comune, con pulsante mappe se notificheMeteo attive", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendMediaGroup = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage, sendMediaGroup } } as any;

    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          {
            idTelegram: 1,
            comuni: [
              { url: "firenze", notificheMeteo: true },
              { url: "pisa", notificheMeteo: false },
            ],
          },
          {
            idTelegram: 2,
            comuni: [{ url: "siena", notificheMeteo: true }],
          },
        ]),
      },
      meteo: {
        fetchDatiMeteo: vi.fn().mockResolvedValue({
          comune: "Test",
          aggiornamento: "01/01/2026",
          allerta: "VERDE",
          rischi: {
            idraulico: "ASSENTE",
            idrogeologico: "ASSENTE",
            temporali: "ASSENTE",
            vento: "ASSENTE",
            neve: "ASSENTE",
            ghiaccio: "ASSENTE",
          },
          temperatura: { min: 10, max: 20 },
          temperaturaAttuale: 15,
          temperaturaPercepita: 14,
          umidita: 50,
          probabilitaPioggia: 0,
          alba: "06:00",
          tramonto: "18:00",
          parteGiorno: "mattina",
        }),
      },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.totali).toBe(2);
    expect(result.inviati).toBe(3);
    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(sendMediaGroup).not.toHaveBeenCalled();

    expect(sendMessage).toHaveBeenCalledWith(1, expect.any(String), expect.objectContaining({
      reply_markup: expect.objectContaining({
        inline_keyboard: [[{ text: "🖼️ Mostra mappe meteo", callback_data: "img" }]],
      }),
    }));
    expect(sendMessage).toHaveBeenCalledWith(1, expect.any(String), expect.objectContaining({
      reply_markup: undefined,
    }));
    expect(sendMessage).toHaveBeenCalledWith(2, expect.any(String), expect.objectContaining({
      reply_markup: expect.objectContaining({
        inline_keyboard: [[{ text: "🖼️ Mostra mappe meteo", callback_data: "img" }]],
      }),
    }));
  });
});
