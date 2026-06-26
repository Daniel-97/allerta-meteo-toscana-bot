import { describe, it, expect, vi } from "vitest";
import { broadcastNotifiche } from "../../src/bot/scheduler.js";

const datiMeteoMock = {
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
  uv: 4,
  quotaNeve: 2000,
  umidita: 50,
  probabilitaPioggia: 0,
  alba: "06:00",
  tramonto: "18:00",
  parteGiorno: "mattina",
};

describe("broadcastNotifiche", () => {
  it("invia messaggio per ogni comune + messaggio calore una volta per utente", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const sendMediaGroup = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage, sendMediaGroup } } as any;

    const fetchAllertaCalore = vi.fn().mockResolvedValue({
      errore: false,
      dataEstrazione: "2026-06-25",
      oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
      domani: null,
    } as const);

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
        fetchDatiMeteo: vi.fn().mockResolvedValue(datiMeteoMock),
      },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.totali).toBe(2);
    expect(result.inviati).toBe(5); // 3 comuni + 2 messaggi calore (uno per utente)
    expect(fetchAllertaCalore).toHaveBeenCalledTimes(1);
    expect(sendMediaGroup).not.toHaveBeenCalled();

    const expectedKeyboard = expect.objectContaining({
      inline_keyboard: [[
        { text: "🖼️ Mostra mappe meteo", callback_data: "img" },
      ]],
    });

    expect(sendMessage).toHaveBeenCalledWith(1, expect.any(String), expect.objectContaining({ reply_markup: expectedKeyboard }));
    expect(sendMessage).toHaveBeenCalledWith(1, expect.any(String), expect.objectContaining({ reply_markup: undefined }));
    expect(sendMessage).toHaveBeenCalledWith(2, expect.any(String), expect.objectContaining({ reply_markup: expectedKeyboard }));
    const caloreKeyboard = expect.objectContaining({
      inline_keyboard: [[{ text: "📋 Cosa fare", url: "https://www.salute.gov.it/new/it/tema/ondate-di-calore/livelli-di-rischio-cosa-fare/" }]],
    });
    // calore: una per utente, con bottone "Cosa fare"
    expect(sendMessage).toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.objectContaining({ link_preview_options: { is_disabled: true }, reply_markup: caloreKeyboard }));
    expect(sendMessage).toHaveBeenCalledWith(2, expect.stringContaining("Ondata di calore"), expect.objectContaining({ link_preview_options: { is_disabled: true }, reply_markup: caloreKeyboard }));
  });

  it("nessun messaggio calore se entrambi Livello0", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;

    const fetchAllertaCalore = vi.fn().mockResolvedValue({
      errore: false,
      dataEstrazione: "2026-06-25",
      oggi: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
    } as const);

    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          {
            idTelegram: 1,
            comuni: [{ url: "firenze", notificheMeteo: true }],
          },
        ]),
      },
      meteo: {
        fetchDatiMeteo: vi.fn().mockResolvedValue(datiMeteoMock),
      },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.inviati).toBe(1); // solo meteo, no calore
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.anything());
  });

  it("messaggio calore anche quando errore: true", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;

    const fetchAllertaCalore = vi.fn().mockResolvedValue({ errore: true } as const);

    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          {
            idTelegram: 1,
            comuni: [{ url: "firenze", notificheMeteo: false }],
          },
        ]),
      },
      meteo: {
        fetchDatiMeteo: vi.fn().mockResolvedValue(datiMeteoMock),
      },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.inviati).toBe(2); // meteo + calore (avviso errore)
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(1, expect.stringContaining("non disponibili"), expect.anything());
  });

  it("sopprime comune senza allerta meteo e senza calore → nessun messaggio inviato", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;

    const datiNessunaAllerta = { ...datiMeteoMock, allerta: "nessuno" };

    const fetchAllertaCalore = vi.fn().mockResolvedValue({
      errore: false, dataEstrazione: "",
      oggi: null, domani: null,
    } as const);

    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [{ url: "firenze", notificheMeteo: true }] },
        ]),
      },
      meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(datiNessunaAllerta) },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.inviati).toBe(0); // ne meteo ne calore
    expect(sendMessage).toHaveBeenCalledTimes(0);
  });

  it("sopprime solo comune senza allerta in caso misto", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;

    const datiAlert = datiMeteoMock; // VERDE = allerta reale
    const datiNull = { ...datiMeteoMock, allerta: "nessuno" };

    const fetchAllertaCalore = vi.fn().mockResolvedValue({
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
      domani: null,
    } as const);

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
        ]),
      },
      meteo: {
        fetchDatiMeteo: vi.fn()
          .mockResolvedValueOnce(datiAlert) // Firenze → alert
          .mockResolvedValueOnce(datiNull), // Pisa → no alert → soppresso
      },
      heatwave: { fetchAllertaCalore },
    } as any;

    const result = await broadcastNotifiche(bot, services);
    expect(result.inviati).toBe(2); // 1 meteo (Firenze) + 1 calore
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(1, expect.stringContaining("Test"), expect.anything());
    expect(sendMessage).toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.objectContaining({ reply_markup: expect.objectContaining({ inline_keyboard: [[{ text: "📋 Cosa fare", url: expect.any(String) }]] }) }));
  });
});
