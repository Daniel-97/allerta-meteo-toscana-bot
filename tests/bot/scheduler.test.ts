import { describe, it, expect, vi } from "vitest";
import { broadcastNotifiche } from "../../src/bot/scheduler.js";
import { fingerprintMeteo } from "../../src/bot/messages.js";

const datiMeteoMock = {
  comune: "Test", aggiornamento: "01/01/2026", allerta: "basso",
  rischi: { idraulico: "nessuno", idrogeologico: "nessuno", temporali: "nessuno",
            vento: "nessuno", neve: "nessuno", ghiaccio: "nessuno" },
  temperatura: { min: 10, max: 20 }, temperaturaAttuale: 15, temperaturaPercepita: 14,
  uv: 4, quotaNeve: 2000, umidita: 50, probabilitaPioggia: 0,
  alba: "06:00", tramonto: "18:00", parteGiorno: "mattina",
};

function mockServices(overrides: Record<string, any> = {}) {
  return {
    users: {
      findAllWithComuni: vi.fn().mockResolvedValue([
        { idTelegram: 1, comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }] },
      ]),
    },
    meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(datiMeteoMock) },
    heatwave: {
      fetchAllertaCalore: vi.fn().mockResolvedValue({
        errore: false, dataEstrazione: "2026-07-07",
        oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
        domani: null,
      }),
    },
    alertState: {
      getFingerprint: vi.fn().mockResolvedValue(null),
      setFingerprint: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

describe("broadcastNotifiche", () => {
  it("mattina: invia sempre anche se fingerprint identico", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const getFingerprint = vi.fn().mockResolvedValue({ fingerprint: fingerprintMeteo(datiMeteoMock), aggiornatoIl: new Date() });
    const setFingerprint = vi.fn().mockResolvedValue(undefined);
    const services = mockServices({ alertState: { getFingerprint, setFingerprint } }) as any;

    const result = await broadcastNotifiche(bot, services, true);
    expect(result.inviati).toBeGreaterThan(0);
    expect(sendMessage).toHaveBeenCalled();
    expect(setFingerprint).toHaveBeenCalled();
  });

  it("pomeriggio: salta se fingerprint identico stesso giorno", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const getFingerprint = vi.fn()
      .mockResolvedValueOnce({ fingerprint: "2|", aggiornatoIl: new Date() })
      .mockResolvedValueOnce({ fingerprint: fingerprintMeteo(datiMeteoMock), aggiornatoIl: new Date() });
    const setFingerprint = vi.fn().mockResolvedValue(undefined);
    const services = mockServices({ alertState: { getFingerprint, setFingerprint } }) as any;

    const result = await broadcastNotifiche(bot, services, false);
    expect(result.inviati).toBe(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("pomeriggio: invia se fingerprint diverso", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const getFingerprint = vi.fn().mockResolvedValue({ fingerprint: "ROSSO|...||...", aggiornatoIl: new Date() });
    const setFingerprint = vi.fn().mockResolvedValue(undefined);
    const services = mockServices({ alertState: { getFingerprint, setFingerprint } }) as any;

    const result = await broadcastNotifiche(bot, services, false);
    expect(result.inviati).toBeGreaterThan(0);
    expect(sendMessage).toHaveBeenCalled();
  });

  it("pomeriggio: invia se fingerprint di ieri", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const ieri = new Date();
    ieri.setDate(ieri.getDate() - 1);
    const getFingerprint = vi.fn().mockResolvedValue({ fingerprint: fingerprintMeteo(datiMeteoMock), aggiornatoIl: ieri });
    const setFingerprint = vi.fn().mockResolvedValue(undefined);
    const services = mockServices({ alertState: { getFingerprint, setFingerprint } }) as any;

    const result = await broadcastNotifiche(bot, services, false);
    expect(result.inviati).toBeGreaterThan(0);
  });

  it("pomeriggio: invia se nessun fingerprint salvato", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const services = mockServices() as any;

    const result = await broadcastNotifiche(bot, services, false);
    expect(result.inviati).toBeGreaterThan(0);
  });

  it("calore e meteo indipendenti: calore cambia, meteo no", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const getFingerprint = vi.fn()
      .mockResolvedValueOnce({ fingerprint: "2|OLD", aggiornatoIl: new Date() })
      .mockResolvedValueOnce({ fingerprint: fingerprintMeteo(datiMeteoMock), aggiornatoIl: new Date() });
    const setFingerprint = vi.fn().mockResolvedValue(undefined);
    const services = mockServices({ alertState: { getFingerprint, setFingerprint } }) as any;

    const result = await broadcastNotifiche(bot, services, false);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.anything());
  });

  it("gestisce errore calore: non invia nulla all'utente, non salva fingerprint, avvisa l'admin", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const setFingerprint = vi.fn().mockResolvedValue(undefined);
    const heatwave = {
      fetchAllertaCalore: vi.fn().mockResolvedValue({ errore: true }),
    };
    const services = {
      ...mockServices({ alertState: { getFingerprint: vi.fn().mockResolvedValue(null), setFingerprint } }),
      heatwave,
    } as any;

    const result = await broadcastNotifiche(bot, services, false, 999);
    expect(result.inviati).toBe(1); // solo meteo, nessun messaggio calore all'utente
    expect(setFingerprint).toHaveBeenCalledTimes(1); // solo meteo
    expect(setFingerprint).toHaveBeenCalledWith("allerta_meteo_firenze", expect.any(String));
    expect(sendMessage).not.toHaveBeenCalledWith(1, expect.stringContaining("Ondata di calore"), expect.anything());
    expect(sendMessage).toHaveBeenCalledWith(999, expect.stringContaining("allerta calore fallito"));
  });

  it("utente che ha bloccato il bot: logga l'errore senza avvisare l'admin", async () => {
    const sendMessage = vi.fn()
      .mockRejectedValue(new Error("Call to 'sendMessage' failed! (403: Forbidden: bot was blocked by the user)"));
    const bot = { api: { sendMessage } } as any;
    const services = mockServices() as any;

    const result = await broadcastNotifiche(bot, services, true, 999);
    expect(result.inviati).toBe(0);
    expect(sendMessage).not.toHaveBeenCalledWith(999, expect.anything());
  });

  it("gestisce errore recupero meteo: non invia nulla all'utente per quel comune, avvisa l'admin una sola volta", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const meteo = { fetchDatiMeteo: vi.fn().mockRejectedValue(new Error("Errore HTTP 500")) };
    const services = { ...mockServices(), meteo } as any;

    const result = await broadcastNotifiche(bot, services, true, 999);
    expect(result.inviati).toBeGreaterThan(0); // solo calore
    expect(sendMessage).not.toHaveBeenCalledWith(1, expect.stringContaining("Test"), expect.anything());
    expect(sendMessage).toHaveBeenCalledWith(999, expect.stringContaining("Recupero dati meteo fallito"));
    expect(sendMessage.mock.calls.filter((c: any[]) => c[0] === 999)).toHaveLength(1);
  });

  it("broadcast alert-only: il messaggio meteo ha la keyboard allerta", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const services = {
      ...mockServices({
        users: {
          findAllWithComuni: vi.fn().mockResolvedValue([
            { idTelegram: 1, comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: false }] },
          ]),
        },
      }),
    } as any;

    await broadcastNotifiche(bot, services, true, 999);

    expect(sendMessage).toHaveBeenCalledWith(
      1,
      expect.stringContaining("Allerta meteo"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              { text: "🗺️ Mappe allerta", url: "https://www.regione.toscana.it/allertameteo" },
              { text: "🌤️ Meteo Firenze", url: "https://www.lamma.toscana.it/meteo/meteo-firenze" },
            ],
            [
              { text: "📋 Cosa fare", url: "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento" },
              { text: "🔗 Altre risorse", callback_data: "risorse:allerta:firenze" },
            ],
          ],
        }),
      }),
    );
  });

  it("broadcast completo (notificheMeteo): keyboard con Meteo Toscana", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const services = mockServices() as any; // notificheMeteo: true di default

    await broadcastNotifiche(bot, services, true, 999);

    expect(sendMessage).toHaveBeenCalledWith(
      1,
      expect.stringContaining("Dati meteo"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              { text: "🗺️ Mappe allerta", url: "https://www.regione.toscana.it/allertameteo" },
              { text: "🌤️ Meteo Firenze", url: "https://www.lamma.toscana.it/meteo/meteo-firenze" },
            ],
            [{ text: "🌤️ Meteo Toscana", url: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana" }],
            [{ text: "📋 Cosa fare", url: "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento" }],
            [{ text: "🔗 Altre risorse", callback_data: "risorse:completo:firenze" }],
          ],
        }),
      }),
    );
  });

  it("broadcast calore: keyboard con Cosa fare e Bollettino", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const services = mockServices() as any;

    await broadcastNotifiche(bot, services, true, 999);

    expect(sendMessage).toHaveBeenCalledWith(
      1,
      expect.stringContaining("Ondata di calore"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[
            { text: "📋 Cosa fare", url: expect.any(String) },
            { text: "📄 Bollettino", url: "https://salute.gov.it/bol.pdf" },
          ]],
        }),
      }),
    );
  });
});
