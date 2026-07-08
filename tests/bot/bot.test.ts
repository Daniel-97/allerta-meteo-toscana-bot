import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/logger.js", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { createBot } = await import("../../src/bot/bot.js");

function makeServices() {
  return {
    comuni: {
      searchByPrefix: vi.fn().mockResolvedValue([{ nome: "Pisa", url: "pisa" }]),
      findByNome: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue([]),
    },
    users: {
      findByTelegramId: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      findAllWithComuni: vi.fn().mockResolvedValue([]),
      removeComune: vi.fn().mockResolvedValue(undefined),
      updateNotificheMeteo: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockResolvedValue(0),
    },
    meteo: {
      fetchDatiMeteo: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeConfig(adminChatId: string) {
  return {
    TELEGRAM_BOT_TOKEN: "123:test",
    ADMIN_CHAT_ID: adminChatId,
    TURSO_DATABASE_URL: "libsql://test",
    TURSO_AUTH_TOKEN: "test",
    NODE_ENV: "production" as const,
  };
}

function textUpdate(text: string, fromId: number) {
  const entities = text.startsWith("/")
    ? [{ type: "bot_command", offset: 0, length: text.indexOf(" ") === -1 ? text.length : text.indexOf(" ") }]
    : [];
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: 1,
      date: 1234567890,
      chat: { id: fromId, type: "private" },
      from: { id: fromId, is_bot: false, first_name: "Test" },
      text,
      entities,
    },
  };
}

function mockApi(bot: any) {
  bot.api.config.use(async (_prev: any, method: string, payload: any) => {
    if (method === "getMe") {
      return {
        ok: true,
        result: {
          id: 1,
          is_bot: true,
          first_name: "TestBot",
          username: "testbot",
          can_join_groups: false,
          can_read_all_group_messages: false,
          supports_inline_queries: false,
        },
      } as any;
    }
    if (method === "sendMessage" || method === "editMessageText") {
      return {
        ok: true,
        result: {
          message_id: 2,
          date: 0,
          chat: { id: payload?.chat_id ?? 0, type: "private" },
          text: payload?.text ?? "",
        },
      } as any;
    }
    return { ok: true, result: {} } as any;
  });
}

async function setupBot(adminChatId: string, services: any) {
  const bot = createBot(makeConfig(adminChatId), services);
  mockApi(bot);
  await bot.init();
  return bot;
}

describe("createBot - ordinamento middleware", () => {
  it("utente non-admin che digita testo libero (>=3 char) trigga searchByPrefix", async () => {
    const services = makeServices();
    const bot = await setupBot("999", services);

    await bot.handleUpdate(textUpdate("pis", 111));

    expect(services.comuni.searchByPrefix).toHaveBeenCalledWith("pis");
  });

  it("utente non-admin che digita /admin_stat non trigga searchByPrefix (fallthrough a admin)", async () => {
    const services = makeServices();
    const bot = await setupBot("999", services);

    await bot.handleUpdate(textUpdate("/admin_stat", 111));

    expect(services.comuni.searchByPrefix).not.toHaveBeenCalled();
    expect(services.users.findAllWithComuni).not.toHaveBeenCalled();
  });

  it("admin che digita /admin_stat trigga admin handler (findAllWithComuni)", async () => {
    const services = makeServices();
    const bot = await setupBot("111", services);

    await bot.handleUpdate(textUpdate("/admin_stat", 111));

    expect(services.users.findAllWithComuni).toHaveBeenCalledTimes(1);
    expect(services.comuni.searchByPrefix).not.toHaveBeenCalled();
  });

  it("admin che digita /admin_info <id> passa l'argomento all'handler", async () => {
    const services = makeServices();
    services.users.findByTelegramId = vi.fn().mockResolvedValue(undefined);
    const bot = await setupBot("111", services);

    await bot.handleUpdate(textUpdate("/admin_info 123", 111));

    expect(services.users.findByTelegramId).toHaveBeenCalledWith(123);
  });
});