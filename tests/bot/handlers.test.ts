import { describe, it, expect, vi } from "vitest";
import { GrammyError } from "grammy";
import { handleCallbackQuery, handlePrevisioni, handleRichiestaTestoLibero } from "../../src/bot/handlers.js";

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
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] }),
        subscribe: vi.fn().mockResolvedValue(undefined),
      },
    };

    it("chiama subscribe con i dati corretti", async () => {
      const subscribe = vi.fn().mockResolvedValue(undefined);
      const findByTelegramId = vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] });
      const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
      const services = { users: { subscribe, findByTelegramId } } as any;

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
      const findByTelegramId = vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] });
      const reply = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        ...baseCtx,
        editMessageText: vi.fn().mockRejectedValue(grammyErrorNotModified()),
        reply,
      } as any;
      const services = { users: { subscribe, findByTelegramId } } as any;

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
      const findByTelegramId = vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] });
      const editMessageText = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        ...baseCtx,
        callbackQuery: { data: "sub:firenze:Pisa:0" },
        editMessageText,
      } as any;
      const services = { users: { subscribe, findByTelegramId } } as any;

      await handleCallbackQuery(ctx, services);

      expect(subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ notificheMeteo: false }),
      );
    });
  });
});

describe("manage callback", () => {
  const baseCtx = {
    callbackQuery: { data: "manage" },
    from: { id: 123, username: "testuser", first_name: "Test" },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };

  it("mostra lista comuni quando utente ne ha", async () => {
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [
        { nome: "Firenze", url: "firenze", notificheMeteo: true },
        { nome: "Pisa", url: "pisa", notificheMeteo: false },
      ],
    });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(findByTelegramId).toHaveBeenCalledWith(123);
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("I tuoi comuni"),
      expect.any(Object),
    );
  });

  it("mostra messaggio se utente non ha comuni", async () => {
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [],
    });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Non hai ancora"),
      expect.any(Object),
    );
  });
});

describe("back callback", () => {
  it("mostra lista comuni quando utente ne ha", async () => {
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
    });
    const ctx = {
      callbackQuery: { data: "back" },
      from: { id: 123 },
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as any;
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("I tuoi comuni"),
      expect.any(Object),
    );
  });

  it("mostra nessunComune se utente non ha comuni", async () => {
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [],
    });
    const ctx = {
      callbackQuery: { data: "back" },
      from: { id: 123 },
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as any;
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Non hai ancora"),
      expect.any(Object),
    );
  });
});

describe("del callback", () => {
  it("mostra conferma eliminazione", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "del:firenze:Firenze" },
      editMessageText,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Eliminare Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
  });
});

describe("del-confirm callback", () => {
  const baseCtx = {
    callbackQuery: { data: "del-confirm:firenze:Firenze" },
    from: { id: 123, username: "testuser", first_name: "Test" },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };

  it("chiama removeComune e mostra conferma", async () => {
    const removeComune = vi.fn().mockResolvedValue(undefined);
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
    });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { removeComune, findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(removeComune).toHaveBeenCalledWith(123, "firenze");
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze rimosso"),
      expect.any(Object),
    );
  });

  it("non fa nulla se ctx.from è undefined", async () => {
    const removeComune = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      ...baseCtx,
      from: undefined,
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as any;

    await handleCallbackQuery(ctx, { users: { removeComune } } as any);

    expect(removeComune).not.toHaveBeenCalled();
  });

  it("usa noComuniInlineKeyboard se l'utente non ha più comuni", async () => {
    const removeComune = vi.fn().mockResolvedValue(undefined);
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [],
    });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { removeComune, findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Aggiungi comune", callback_data: "add" }],
            [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
          ],
        },
      }),
    );
  });
});

describe("mod callback", () => {
  it("mostra conferma con stato attuale", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "mod:firenze:Firenze" },
      editMessageText,
      from: { id: 123 },
    } as any;

    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [
        { nome: "Firenze", url: "firenze", notificheMeteo: true },
      ],
    });
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.any(Object),
    );
  });
});

describe("mod-set callback", () => {
  const baseCtx = {
    callbackQuery: { data: "mod-set:firenze:Firenze:1" },
    from: { id: 123 },
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };

  it("chiama updateNotificheMeteo con flag corretto", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(updateNotificheMeteo).toHaveBeenCalledWith(123, "firenze", true);
  });

  it("imposta notificheMeteo a false quando flag è 0", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      ...baseCtx,
      callbackQuery: { data: "mod-set:firenze:Firenze:0" },
      editMessageText: vi.fn().mockResolvedValue(undefined),
    } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(updateNotificheMeteo).toHaveBeenCalledWith(123, "firenze", false);
  });

  it("mostra messaggio di conferma", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      ...baseCtx,
      editMessageText: vi.fn().mockResolvedValue(undefined),
      reply,
    } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.any(Object),
    );
  });
});

describe("handlePrevisioni", () => {
  it("invia messaggio di previsioni con pulsante mappe meteo e senza album", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const replyWithMediaGroup = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      from: { id: 123 },
      reply,
      replyWithMediaGroup,
    } as any;

    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: {
        fetchDatiMeteo: vi.fn().mockResolvedValue({
          comune: "Firenze",
          parteGiorno: "mattina",
          aggiornamento: "2024-01-01",
          allerta: "VERDE",
          temperaturaAttuale: 15,
          temperaturaPercepita: 14,
          uv: 2,
          quotaNeve: 1500,
          umidita: 65,
          probabilitaPioggia: 10,
          alba: "07:00",
          tramonto: "17:00",
          temperatura: { min: 10, max: 20 },
          rischi: {
            idraulico: "nullo",
            idrogeologico: "nullo",
            temporali: "nullo",
            vento: "nullo",
            neve: "nullo",
            ghiaccio: "nullo",
          },
        }),
      },
    } as any;

    await handlePrevisioni(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(replyWithMediaGroup).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [[
            { text: "🖼️ Mostra mappe meteo", callback_data: "img" },
            { text: "🛰️ Sat. infrarosso", callback_data: "sat" },
          ]],
        }),
      }),
    );
  });
});

describe("action: add", () => {
  it("risponde alla callback e invia prompt aggiungi", async () => {
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "add" },
      answerCallbackQuery,
      reply,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(answerCallbackQuery).toHaveBeenCalledOnce();
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Digita almeno 3 lettere"),
    );
  });
});

describe("action: credits", () => {
  it("risponde alla callback e invia credits con inline keyboard", async () => {
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "credits" },
      answerCallbackQuery,
      reply,
    } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(answerCallbackQuery).toHaveBeenCalledOnce();
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Come funziona"),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Aggiungi comune", callback_data: "add" }],
            [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
          ],
        },
      }),
    );
  });
});

describe("handleRichiestaTestoLibero", () => {
  const baseServices = {
    comuni: {
      searchByPrefix: vi.fn(),
    },
  };

  it("ignora testo con meno di 3 caratteri", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "ab" },
      reply,
    } as any;

    await handleRichiestaTestoLibero(ctx, baseServices as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("ignora comandi (testo che inizia con /)", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "/start" },
      reply,
    } as any;

    await handleRichiestaTestoLibero(ctx, baseServices as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("ignora testo vuoto", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "" },
      reply,
    } as any;

    await handleRichiestaTestoLibero(ctx, baseServices as any);

    expect(reply).not.toHaveBeenCalled();
  });

  it("mostra risultati quando la ricerca ha match", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "pis" },
      reply,
    } as any;
    const services = {
      comuni: {
        searchByPrefix: vi.fn().mockResolvedValue([
          { nome: "Pisa", url: "pisa" },
          { nome: "Pistoia", url: "pistoia" },
        ]),
      },
    };

    await handleRichiestaTestoLibero(ctx, services as any);

    expect(services.comuni.searchByPrefix).toHaveBeenCalledWith("pis");
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("trovato"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
  });

  it("mostra messaggio non trovato quando la ricerca non ha match", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "xyzxyz" },
      reply,
    } as any;
    const services = {
      comuni: {
        searchByPrefix: vi.fn().mockResolvedValue([]),
      },
    };

    await handleRichiestaTestoLibero(ctx, services as any);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Nessun"),
    );
  });

  it("gestisce errore di searchByPrefix con messaggio di errore", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      message: { text: "pisa" },
      reply,
    } as any;
    const services = {
      comuni: {
        searchByPrefix: vi.fn().mockRejectedValue(new Error("DB error")),
      },
    };

    await handleRichiestaTestoLibero(ctx, services as any);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("errore"),
    );
  });
});
