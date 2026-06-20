import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.TELEGRAM_BOT_TOKEN = "token";
  process.env.ADMIN_CHAT_ID = "123";
  process.env.TURSO_DATABASE_URL = "libsql://db-org.turso.io";
  process.env.TURSO_AUTH_TOKEN = "auth-token";
  process.env.NODE_ENV = "development";
});

describe("envSchema", () => {
  it("accetta env valide con tutte le variabili Turso", async () => {
    const { envSchema } = await import("../src/config.js");
    const res = envSchema.safeParse({
      TELEGRAM_BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "123",
      TURSO_DATABASE_URL: "libsql://db-org.turso.io",
      TURSO_AUTH_TOKEN: "auth-token",
      NODE_ENV: "development",
    });
    expect(res.success).toBe(true);
  });

  it("respinge se manca TURSO_DATABASE_URL", async () => {
    const { envSchema } = await import("../src/config.js");
    const res = envSchema.safeParse({
      TELEGRAM_BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "123",
      TURSO_AUTH_TOKEN: "auth-token",
    });
    expect(res.success).toBe(false);
  });

  it("respinge se TURSO_AUTH_TOKEN è vuoto", async () => {
    const { envSchema } = await import("../src/config.js");
    const res = envSchema.safeParse({
      TELEGRAM_BOT_TOKEN: "token",
      ADMIN_CHAT_ID: "123",
      TURSO_DATABASE_URL: "libsql://db-org.turso.io",
      TURSO_AUTH_TOKEN: "",
      NODE_ENV: "development",
    });
    expect(res.success).toBe(false);
  });
});
