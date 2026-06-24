import { describe, it, expect, vi, beforeEach } from "vitest";
import { logUserMessage } from "../../src/bot/logging.js";

vi.mock("../../src/logger.js", () => ({
  logger: { info: vi.fn() },
}));

describe("logUserMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logga userId/username/text per messaggio utente", async () => {
    const next = vi.fn();
    const ctx = {
      from: { id: 123, username: "foo", first_name: "Foo" },
      message: { text: "/start" },
    } as any;

    const { logger } = await import("../../src/logger.js");

    await logUserMessage(ctx, next);

    expect(logger.info).toHaveBeenCalledWith(
      { userId: 123, username: "foo", text: "/start" },
      "user_message",
    );
    expect(next).toHaveBeenCalled();
  });

  it("logga callbackQuery.data per callback query", async () => {
    const next = vi.fn();
    const ctx = {
      from: { id: 456, first_name: "Bar" },
      callbackQuery: { data: "sub:firenze:Firenze:1" },
    } as any;

    const { logger } = await import("../../src/logger.js");

    await logUserMessage(ctx, next);

    expect(logger.info).toHaveBeenCalledWith(
      { userId: 456, username: null, text: "sub:firenze:Firenze:1" },
      "user_message",
    );
    expect(next).toHaveBeenCalled();
  });

  it("logga callbackQuery.data anche se ctx.msg contiene il testo del bot", async () => {
    const next = vi.fn();
    const ctx = {
      from: { id: 789, username: "foo" },
      msg: { text: "Seleziona un comune" },
      callbackQuery: { data: "sel:firenze:Firenze" },
    } as any;

    const { logger } = await import("../../src/logger.js");

    await logUserMessage(ctx, next);

    expect(logger.info).toHaveBeenCalledWith(
      { userId: 789, username: "foo", text: "sel:firenze:Firenze" },
      "user_message",
    );
    expect(next).toHaveBeenCalled();
  });

  it("non logga quando from è assente", async () => {
    const next = vi.fn();
    const ctx = {} as any;

    const { logger } = await import("../../src/logger.js");

    await logUserMessage(ctx, next);

    expect(logger.info).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("non logga quando non c'è né text né callback data", async () => {
    const next = vi.fn();
    const ctx = {
      from: { id: 789, username: "baz" },
    } as any;

    const { logger } = await import("../../src/logger.js");

    await logUserMessage(ctx, next);

    expect(logger.info).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
