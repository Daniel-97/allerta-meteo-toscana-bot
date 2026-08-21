import { describe, it, expect, vi } from "vitest";
import { GrammyError } from "grammy";
import { handleAllerta, handleCallbackQuery, handlePrevisioni, handleRichiestaTestoLibero, handleGestisciComuni, handleCredits, handleAiuto } from "../../src/bot/handlers.js";

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

    it("invia messaggio di conferma con la lista comuni aggiornata", async () => {
      const reply = vi.fn().mockResolvedValue(undefined);
      const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined), reply } as any;

      await handleCallbackQuery(ctx, baseServices as any);

      expect(reply).toHaveBeenCalledWith(
        expect.stringContaining("Firenze"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([expect.objectContaining({ text: "Firenze" })]),
            ]),
          }),
        }),
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

  it("chiama removeComune e trasforma il messaggio nella lista comuni aggiornata", async () => {
    const removeComune = vi.fn().mockResolvedValue(undefined);
    const findByTelegramId = vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] });
    const ctx = { ...baseCtx, editMessageText: vi.fn().mockResolvedValue(undefined) } as any;
    const services = { users: { removeComune, findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(removeComune).toHaveBeenCalledWith(123, "firenze");
    expect(ctx.editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Non hai ancora"),
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
});

describe("comune callback", () => {
  it("mostra il dettaglio del comune trovato", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "comune:firenze:Firenze" },
      editMessageText,
      from: { id: 123 },
    } as any;
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
    });
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([expect.objectContaining({ text: "🗑️ Elimina" })]),
          ]),
        }),
      }),
    );
  });

  it("torna alla lista se il comune non è più presente (fallback)", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "comune:firenze:Firenze" },
      editMessageText,
      from: { id: 123 },
    } as any;
    const findByTelegramId = vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] });
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Non hai ancora"),
      expect.any(Object),
    );
  });
});

describe("toggle callback", () => {
  it("attiva le previsioni meteo e ri-renderizza il dettaglio", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "toggle:firenze:Firenze:1" },
      editMessageText,
      from: { id: 123 },
    } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(updateNotificheMeteo).toHaveBeenCalledWith(123, "firenze", true);
    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([expect.objectContaining({ text: "🔕 Disattiva previsioni meteo" })]),
          ]),
        }),
      }),
    );
  });

  it("disattiva le previsioni meteo quando il flag è 0", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "toggle:firenze:Firenze:0" },
      editMessageText: vi.fn().mockResolvedValue(undefined),
      from: { id: 123 },
    } as any;
    const services = { users: { updateNotificheMeteo } } as any;

    await handleCallbackQuery(ctx, services);

    expect(updateNotificheMeteo).toHaveBeenCalledWith(123, "firenze", false);
  });

  it("non fa nulla se ctx.from è undefined", async () => {
    const updateNotificheMeteo = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "toggle:firenze:Firenze:1" },
      editMessageText: vi.fn().mockResolvedValue(undefined),
      from: undefined,
    } as any;

    await handleCallbackQuery(ctx, { users: { updateNotificheMeteo } } as any);

    expect(updateNotificheMeteo).not.toHaveBeenCalled();
  });
});

describe("aggiungi callback", () => {
  it("invia il prompt per digitare il nome del comune", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { callbackQuery: { data: "aggiungi" }, reply } as any;

    await handleCallbackQuery(ctx, {} as any);

    expect(reply).toHaveBeenCalledWith(expect.stringContaining("almeno 3 lettere"));
  });
});

describe("annulla callback", () => {
  it("torna al dettaglio del comune specifico", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "annulla:firenze:Firenze" },
      editMessageText,
      from: { id: 123 },
    } as any;
    const findByTelegramId = vi.fn().mockResolvedValue({
      idTelegram: 123,
      comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: false }],
    });
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            expect.arrayContaining([expect.objectContaining({ text: "🗑️ Elimina" })]),
          ]),
        }),
      }),
    );
  });

  it("torna alla lista se il comune non è più presente (fallback)", async () => {
    const editMessageText = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      callbackQuery: { data: "annulla:firenze:Firenze" },
      editMessageText,
      from: { id: 123 },
    } as any;
    const findByTelegramId = vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] });
    const services = { users: { findByTelegramId } } as any;

    await handleCallbackQuery(ctx, services);

    expect(editMessageText).toHaveBeenCalledWith(
      expect.stringContaining("Non hai ancora"),
      expect.any(Object),
    );
  });
});

describe("handleAllerta", () => {
  const mockDatiMeteo = (allerta: string, allertaDomani?: string) => ({
    comune: "Firenze",
    aggiornamento: "2024-01-01",
    parteGiorno: "mattina",
    allerta,
    allertaDomani,
    rischi: {
      idraulico: "nessuno", idrogeologico: "nessuno", temporali: "nessuno",
      vento: "nessuno", neve: "nessuno", ghiaccio: "nessuno",
    },
    temperatura: { min: 10, max: 20 },
    temperaturaAttuale: 15,
    temperaturaPercepita: 14,
    uv: 2,
    quotaNeve: 1500,
    umidita: 65,
    probabilitaPioggia: 10,
    alba: "07:00",
    tramonto: "17:00",
  });

  const caloreNull = (): any => Promise.resolve({
    errore: false, dataEstrazione: "", oggi: null, domani: null,
  });

  const caloreAlert = (): any => Promise.resolve({
    errore: false, dataEstrazione: "2026-06-25",
    oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
    domani: null,
  });

  it("caso1: nessuna allerta meteo ne calore → messaggio generico", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(mockDatiMeteo("nessuno")) },
      heatwave: { fetchAllertaCalore: caloreNull },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Nessuna allerta in corso o prevista"),
    );
  });

  it("caso2: solo allerta meteo (nessun calore) → solo messaggi meteo", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(mockDatiMeteo("basso")) },
      heatwave: { fetchAllertaCalore: caloreNull },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Allerta meteo"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
  });

  it("caso3: solo allerta calore (nessun meteo) → solo messaggio calore", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(mockDatiMeteo("nessuno")) },
      heatwave: { fetchAllertaCalore: caloreAlert },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Ondata di calore"),
      expect.objectContaining({ reply_markup: expect.objectContaining({ inline_keyboard: [[
        { text: "📋 Cosa fare", url: expect.any(String) },
        { text: "📄 Bollettino", url: "https://salute.gov.it/bol.pdf" },
      ]] }) }),
    );
  });

  it("caso4: entrambe allerte → messaggio meteo + messaggio calore", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(mockDatiMeteo("basso")) },
      heatwave: { fetchAllertaCalore: caloreAlert },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(2);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Allerta meteo"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Ondata di calore"),
      expect.objectContaining({ reply_markup: expect.objectContaining({ inline_keyboard: [[
        { text: "📋 Cosa fare", url: expect.any(String) },
        { text: "📄 Bollettino", url: "https://salute.gov.it/bol.pdf" },
      ]] }) }),
    );
  });

  it("caso5: multi-comune misto (uno con allerta, uno senza) → solo il comune con allerta", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [
            { nome: "Firenze", url: "firenze", notificheMeteo: true },
            { nome: "Pisa", url: "pisa", notificheMeteo: false },
          ],
        }),
      },
      meteo: {
        fetchDatiMeteo: vi.fn()
          .mockResolvedValueOnce(mockDatiMeteo("basso"))   // Firenze → alert
          .mockResolvedValueOnce(mockDatiMeteo("nessuno")),  // Pisa → no alert
      },
      heatwave: { fetchAllertaCalore: caloreNull },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
  });

  it("messaggio di allerta meteo include i 2 link allerta", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo: vi.fn().mockResolvedValue(mockDatiMeteo("basso")) },
      heatwave: { fetchAllertaCalore: caloreNull },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Allerta meteo"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              { text: "🗺️ Mappe allerta", url: "https://www.regione.toscana.it/allertameteo" },
              { text: "📋 Cosa fare", url: "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento" },
            ],
          ],
        }),
      }),
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
          allerta: "basso",
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
            idraulico: "nessuno",
            idrogeologico: "nessuno",
            temporali: "nessuno",
            vento: "nessuno",
            neve: "nessuno",
            ghiaccio: "nessuno",
          },
        }),
      },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(true) },
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
            { text: "📄 Bollettino del giorno", url: "https://www.lamma.toscana.it/previ/ita/bollettino.pdf" },
          ]],
        }),
      }),
    );
  });
});

describe("rate limiting richieste on-demand", () => {
  it("handleAllerta: rate limit superato → messaggio limite, nessuna fetch esterna", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const fetchDatiMeteo = vi.fn();
    const fetchAllertaCalore = vi.fn();
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo },
      heatwave: { fetchAllertaCalore },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(false) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("una volta al minuto"),
    );
    expect(fetchDatiMeteo).not.toHaveBeenCalled();
    expect(fetchAllertaCalore).not.toHaveBeenCalled();
  });

  it("handlePrevisioni: rate limit superato → messaggio limite, nessuna fetch esterna", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const fetchDatiMeteo = vi.fn();
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo },
      rateLimiter: { isAllowed: vi.fn().mockResolvedValue(false) },
    } as any;

    await handlePrevisioni(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("una volta al minuto"),
    );
    expect(fetchDatiMeteo).not.toHaveBeenCalled();
  });

  it("handleAllerta: errore nel rate limiter → messaggio di errore, nessuna fetch esterna", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const fetchDatiMeteo = vi.fn();
    const fetchAllertaCalore = vi.fn();
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo },
      heatwave: { fetchAllertaCalore },
      rateLimiter: { isAllowed: vi.fn().mockRejectedValue(new Error("db down")) },
    } as any;

    await handleAllerta(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("errore"));
    expect(fetchDatiMeteo).not.toHaveBeenCalled();
    expect(fetchAllertaCalore).not.toHaveBeenCalled();
  });

  it("handlePrevisioni: errore nel rate limiter → messaggio di errore, nessuna fetch esterna", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const fetchDatiMeteo = vi.fn();
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
      meteo: { fetchDatiMeteo },
      rateLimiter: { isAllowed: vi.fn().mockRejectedValue(new Error("db down")) },
    } as any;

    await handlePrevisioni(ctx, services);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("errore"));
    expect(fetchDatiMeteo).not.toHaveBeenCalled();
  });

  it("handleAllerta: utente senza comuni non consuma il rate limiter", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const isAllowed = vi.fn().mockResolvedValue(true);
    const services = {
      users: { findByTelegramId: vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] }) },
      rateLimiter: { isAllowed },
    } as any;

    await handleAllerta(ctx, services);

    expect(isAllowed).not.toHaveBeenCalled();
  });

  it("handlePrevisioni: utente senza comuni non consuma il rate limiter", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const isAllowed = vi.fn().mockResolvedValue(true);
    const services = {
      users: { findByTelegramId: vi.fn().mockResolvedValue({ idTelegram: 123, comuni: [] }) },
      rateLimiter: { isAllowed },
    } as any;

    await handlePrevisioni(ctx, services);

    expect(isAllowed).not.toHaveBeenCalled();
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

describe("handleGestisciComuni", () => {
  it("mostra la lista dei comuni impostati con i bottoni inline", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: {
        findByTelegramId: vi.fn().mockResolvedValue({
          idTelegram: 123,
          comuni: [{ nome: "Firenze", url: "firenze", notificheMeteo: true }],
        }),
      },
    } as any;

    await handleGestisciComuni(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Firenze"),
      expect.objectContaining({ reply_markup: expect.anything() }),
    );
  });

  it("mostra lista vuota quando l'utente non ha comuni", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { from: { id: 123 }, reply } as any;
    const services = {
      users: { findByTelegramId: vi.fn().mockResolvedValue(undefined) },
    } as any;

    await handleGestisciComuni(ctx, services);

    expect(reply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reply_markup: expect.anything() }),
    );
  });

  it("non fa nulla se manca ctx.from", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;
    const services = { users: { findByTelegramId: vi.fn() } } as any;

    await handleGestisciComuni(ctx, services);

    expect(reply).not.toHaveBeenCalled();
    expect(services.users.findByTelegramId).not.toHaveBeenCalled();
  });
});

describe("handleCredits", () => {
  it("risponde con il messaggio credits", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;

    await handleCredits(ctx);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("Come funziona"),
      { link_preview_options: { is_disabled: true } },
    );
  });
});

describe("handleAiuto", () => {
  it("risponde con l'elenco dei comandi disponibili", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply } as any;

    await handleAiuto(ctx);

    expect(reply).toHaveBeenCalledWith(expect.stringContaining("/allerta"));
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("/aiuto"));
  });
});
