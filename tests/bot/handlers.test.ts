import { describe, it, expect, vi } from "vitest";
import { GrammyError } from "grammy";
import { handleCallbackQuery } from "../../src/bot/handlers.js";

const grammyErrorNotModified = () =>
  new GrammyError(
    "Call to 'editMessageText' failed!",
    {
      error_code: 400,
      description:
        "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
    } as any,
    "editMessageText",
    {},
  );

describe("handleCallbackQuery", () => {
  describe("action: sel", () => {
    const data = "sel:firenze:Firenze";

    it("chiama editMessageText con testo di conferma e tastiera SI/NO", async () => {
      const editMessageText = vi.fn().mockResolvedValue(undefined);
      const ctx = { callbackQuery: { data }, editMessageText } as any;

      await handleCallbackQuery(ctx, {} as any);

      expect(editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("Firenze"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
        }),
      );
    });

    it("ignora errore message not modified", async () => {
      const editMessageText = vi.fn().mockRejectedValue(grammyErrorNotModified());
      const ctx = { callbackQuery: { data }, editMessageText } as any;

      await expect(handleCallbackQuery(ctx, {} as any)).resolves.toBeUndefined();
    });

    it("rilancia errori che non sono message not modified", async () => {
      const editMessageText = vi.fn().mockRejectedValue(new Error("errore sconosciuto"));
      const ctx = { callbackQuery: { data }, editMessageText } as any;

      await expect(handleCallbackQuery(ctx, {} as any)).rejects.toThrow("errore sconosciuto");
    });
  });

  describe("action: sub", () => {
    const data = "sub:firenze:Firenze:1";
    const baseCtx = {
      callbackQuery: { data },
      from: { id: 123, username: "testuser", first_name: "Test" },
      editMessageText: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
    };

    const baseServices = {
      users: { subscribe: vi.fn().mockResolvedValue(undefined) },
    };

    it("chiama subscribe con i dati corretti", async () => {
      const subscribe = vi.fn().mockResolvedValue(undefined);
      const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
      const services = { users: { subscribe } } as any;

      await handleCallbackQuery(ctx, services);

      expect(subscribe).toHaveBeenCalledWith({
        idTelegram: 123,
        usernameTelegram: "testuser",
        nomeTelegram: "Test",
        comune: { nome: "Firenze", url: "firenze" },
        notificheMeteo: true,
      });
    });

    it("invia messaggio di conferma con tastiera principale", async () => {
      const reply = vi.fn().mockResolvedValue(undefined);
      const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined), reply } as any;

      await handleCallbackQuery(ctx, baseServices as any);

      expect(reply).toHaveBeenCalledWith(
        expect.stringContaining("Firenze"),
        expect.objectContaining({}),
      );
    });

    it("rimuove tastiera inline dopo subscribe", async () => {
      const editMessageText = vi.fn().mockResolvedValue(undefined);
      const ctx = { ...baseCtx, editMessageText } as any;

      await handleCallbackQuery(ctx, baseServices as any);

      expect(editMessageText).toHaveBeenCalledWith(
        expect.any(String),
        { reply_markup: { inline_keyboard: [] } },
      );
    });

    it("ignora errore message not modified e continua con subscribe", async () => {
      const subscribe = vi.fn().mockResolvedValue(undefined);
      const reply = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        ...baseCtx,
        editMessageText: vi.fn().mockRejectedValue(grammyErrorNotModified()),
        reply,
      } as any;
      const services = { users: { subscribe } } as any;

      await expect(handleCallbackQuery(ctx, services)).resolves.toBeUndefined();

      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(reply).toHaveBeenCalledTimes(1);
    });

    it("non fa subscribe se ctx.from è undefined", async () => {
      const subscribe = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        ...baseCtx,
        from: undefined,
        editMessageText: vi.fn().mockResolvedValue(undefined),
      } as any;

      await handleCallbackQuery(ctx, { users: { subscribe } } as any);

      expect(subscribe).not.toHaveBeenCalled();
    });

    it("imposta notificheMeteo a false quando flagRaw è 0", async () => {
      const subscribe = vi.fn().mockResolvedValue(undefined);
      const editMessageText = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        ...baseCtx,
        callbackQuery: { data: "sub:firenze:Pisa:0" },
        editMessageText,
      } as any;
      const services = { users: { subscribe } } as any;

      await handleCallbackQuery(ctx, services);

      expect(subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ notificheMeteo: false }),
      );
    });
  });
});
