import { describe, it, expect, vi } from "vitest";
import { broadcastNotifiche } from "../../src/bot/scheduler.js";
import { fingerprintMeteo } from "../../src/bot/messages.js";

const datiMeteoMock = {
  comune: "Test", aggiornamento: "01/01/2026", allerta: "VERDE",
  rischi: { idraulico: "ASSENTE", idrogeologico: "ASSENTE", temporali: "ASSENTE",
            vento: "ASSENTE", neve: "ASSENTE", ghiaccio: "ASSENTE" },
  temperatura: { min: 10, max: 20 }, temperaturaAttuale: 15, temperaturaPercepita: 14,
  uv: 4, quotaNeve: 2000, umidita: 50, probabilitaPioggia: 0,
  alba: "06:00", tramonto: "18:00", parteGiorno: "mattina",
};

function mockServices(overrides: Record<string, any> = {}) {
  return {
    users: {
      findAllWithComuni: vi.fn().mockResolvedValue([
        { idTelegram: 1, comuni: [{ url: "firenze", notificheMeteo: true }] },
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

  it("gestisce errore calore: non salva fingerprint", async () => {
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

    const result = await broadcastNotifiche(bot, services, false);
    expect(result.inviati).toBe(2); // meteo + calore (messaggio errore)
    expect(setFingerprint).toHaveBeenCalledTimes(1); // solo meteo
    expect(setFingerprint).toHaveBeenCalledWith("allerta_meteo_firenze", expect.any(String));
  });
});
