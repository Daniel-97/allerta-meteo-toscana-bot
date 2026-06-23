import { describe, it, expect, vi } from "vitest";
import {
  handleAdmin,
  handleAdminStat,
  handleAdminUtenti,
  handleAdminInfo,
  handleAdminBroadcast,
} from "../../../src/bot/admin/handlers.js";
import { adminMessages } from "../../../src/bot/admin/messages.js";

describe("handleAdmin", () => {
  it("mostra messaggio di benvenuto admin", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;

    await handleAdmin(ctx, {} as any);

    expect(reply).toHaveBeenCalledWith(
      adminMessages.welcome,
      expect.objectContaining({}),
    );
  });
});

describe("handleAdminStat", () => {
  it("mostra statistiche utenti", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [{ url: "a" }] },
          { idTelegram: 2, comuni: [{ url: "b" }, { url: "c" }] },
        ]),
      },
    } as any;

    await handleAdminStat(ctx, services);

    expect(services.users.findAllWithComuni).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("2"),
      expect.objectContaining({}),
    );
  });
});

describe("handleAdminUtenti", () => {
  it("mostra lista utenti con id username e data registrazione", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const users = [
      {
        idTelegram: 123,
        usernameTelegram: "mario",
        nomeTelegram: "Mario",
        creatoIl: new Date("2026-01-15"),
        comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
      },
      {
        idTelegram: 456,
        usernameTelegram: null,
        nomeTelegram: "Lucia",
        creatoIl: new Date("2026-02-20"),
        comuni: [],
      },
    ];
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue(users),
      },
    } as any;

    await handleAdminUtenti(ctx, services);

    expect(services.users.findAllWithComuni).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Utenti registrati (2)"),
      expect.any(Object),
    );
    const msg = reply.mock.calls[0][0];
    expect(msg).toContain("123");
    expect(msg).toContain("@mario");
  });
});

describe("handleAdminInfo", () => {
  it("mostra dettagli utente per ID valido", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const user = {
      idTelegram: 123,
      usernameTelegram: "test",
      nomeTelegram: "Test",
      creatoIl: new Date("2026-01-15"),
      comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
    };
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue(user),
      },
    } as any;

    await handleAdminInfo(ctx, services, "123");

    expect(services.users.findByTelegramId).toHaveBeenCalledWith(123);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("123"),
      expect.objectContaining({}),
    );
  });

  it("mostra errore per ID non trovato", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    await handleAdminInfo(ctx, services, "999");

    expect(reply).toHaveBeenCalledWith(
      adminMessages.utenteNonTrovato,
      expect.any(Object),
    );
  });

  it("mostra errore se id è vuoto", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;

    await handleAdminInfo(ctx, {} as any, "");

    expect(reply).toHaveBeenCalledWith(
      "❌ Specifica un ID Telegram: /admin info &lt;id&gt;",
    );
  });
});

describe("handleAdminBroadcast", () => {
  it("invia messaggio a tutti gli utenti", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const bot = { api: { sendMessage } } as any;
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [] },
          { idTelegram: 2, comuni: [] },
        ]),
      },
    } as any;

    await handleAdminBroadcast(ctx, services, bot, "Ciao a tutti!");

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(1, "Ciao a tutti!");
    expect(sendMessage).toHaveBeenCalledWith(2, "Ciao a tutti!");
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("2/2"),
      expect.any(Object),
    );
  });

  it("mostra errore se messaggio è vuoto", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;

    await handleAdminBroadcast(ctx, {} as any, {} as any, "");

    expect(reply).toHaveBeenCalledWith(
      adminMessages.broadcastVuoto,
      expect.any(Object),
    );
  });

  it("gestisce errori di invio e riporta falliti", async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("bloccato"));
    const bot = { api: { sendMessage } } as any;
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const services = {
      users: {
        findAllWithComuni: vi.fn().mockResolvedValue([
          { idTelegram: 1, comuni: [] },
          { idTelegram: 2, comuni: [] },
        ]),
      },
    } as any;

    await handleAdminBroadcast(ctx, services, bot, "test");

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("1 falliti"),
      expect.any(Object),
    );
  });
});
