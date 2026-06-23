import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createTestDb } from "../helpers/test-db.js";
import {
  createUsersRepository,
  type UsersRepository,
} from "../../src/services/users.js";
import { utenti, utentiComuni } from "../../src/db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

describe("UsersRepository", () => {
  let db: LibSQLDatabase;
  let repo: UsersRepository;
  let cleanup: () => void;

  const utente1 = {
    idTelegram: 111,
    usernameTelegram: "user1",
    nomeTelegram: "User Uno",
  };
  const utente2 = {
    idTelegram: 222,
    usernameTelegram: null,
    nomeTelegram: "User Due",
  };
  const comuneFi = { nome: "Firenze", url: "firenze" };
  const comunePi = { nome: "Pisa", url: "pisa" };

  beforeAll(async () => {
    const test = await createTestDb();
    db = test.db;
    cleanup = test.cleanup;
    repo = createUsersRepository(db);
  });

  afterAll(() => {
    cleanup?.();
  });

  it("findByTelegramId ritorna undefined per utente inesistente", async () => {
    const res = await repo.findByTelegramId(999);
    expect(res).toBeUndefined();
  });

  it("subscribe crea utente e associazione", async () => {
    await repo.subscribe({
      ...utente1,
      comune: comuneFi,
      notificheMeteo: true,
    });
    const user = await repo.findByTelegramId(111);
    expect(user).toBeDefined();
    expect(user!.idTelegram).toBe(111);
    expect(user!.usernameTelegram).toBe("user1");
    expect(user!.nomeTelegram).toBe("User Uno");
    expect(user!.comuni).toHaveLength(1);
    expect(user!.comuni[0].nome).toBe("Firenze");
    expect(user!.comuni[0].url).toBe("firenze");
    expect(user!.comuni[0].notificheMeteo).toBe(true);
  });

  it("subscribe aggiunge secondo comune senza perdere il primo", async () => {
    await repo.subscribe({
      ...utente1,
      comune: comunePi,
      notificheMeteo: false,
    });
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni).toHaveLength(2);
    expect(user!.comuni.find((c) => c.url === "firenze")?.notificheMeteo).toBe(
      true
    );
    expect(user!.comuni.find((c) => c.url === "pisa")?.notificheMeteo).toBe(
      false
    );
  });

  it("subscribe re-iscrizione stesso comune aggiorna flag", async () => {
    await repo.subscribe({
      ...utente1,
      comune: comuneFi,
      notificheMeteo: false,
    });
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni).toHaveLength(2);
    expect(
      user!.comuni.find((c) => c.url === "firenze")!.notificheMeteo
    ).toBe(false);
  });

  it("subscribe aggiorna profilo utente (username/nome)", async () => {
    await repo.subscribe({
      idTelegram: 111,
      usernameTelegram: "user1_updated",
      nomeTelegram: "User Uno Updated",
      comune: comuneFi,
      notificheMeteo: true,
    });
    const user = await repo.findByTelegramId(111);
    expect(user!.usernameTelegram).toBe("user1_updated");
    expect(user!.nomeTelegram).toBe("User Uno Updated");
    expect(user!.comuni).toHaveLength(2);
  });

  it("subscribe utente con username null gestito", async () => {
    await repo.subscribe({
      ...utente2,
      comune: comunePi,
      notificheMeteo: true,
    });
    const user = await repo.findByTelegramId(222);
    expect(user).toBeDefined();
    expect(user!.usernameTelegram).toBeNull();
    expect(user!.comuni).toHaveLength(1);
  });

  it("findAllWithComuni ritorna tutti gli utenti con relativi comuni", async () => {
    const all = await repo.findAllWithComuni();
    expect(all).toHaveLength(2);
    const u1 = all.find((u) => u.idTelegram === 111)!;
    expect(u1.comuni).toHaveLength(2);
    const u2 = all.find((u) => u.idTelegram === 222)!;
    expect(u2.comuni).toHaveLength(1);
  });

  it("removeComune rimuove solo il comune specificato", async () => {
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni).toHaveLength(2);

    await repo.removeComune(111, "firenze");

    const after = await repo.findByTelegramId(111);
    expect(after!.comuni).toHaveLength(1);
    expect(after!.comuni[0].url).toBe("pisa");
  });

  it("removeComune no-op per comune inesistente", async () => {
    await repo.removeComune(111, "comune-inesistente");
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni).toHaveLength(1);
  });

  it("removeComune su utente senza comuni non crasha", async () => {
    await repo.removeComune(999, "firenze");
    const user = await repo.findByTelegramId(999);
    expect(user).toBeUndefined();
  });

  it("updateNotificheMeteo aggiorna il flag", async () => {
    await repo.updateNotificheMeteo(111, "pisa", true);
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni.find((c) => c.url === "pisa")!.notificheMeteo).toBe(true);
  });

  it("updateNotificheMeteo non tocca altri comuni", async () => {
    // pisa was set to true in previous test
    await repo.updateNotificheMeteo(111, "pisa", false);
    const user = await repo.findByTelegramId(111);
    expect(user!.comuni.find((c) => c.url === "pisa")!.notificheMeteo).toBe(false);
    // user 222's pisa (set to true in subscribe test) is not affected
    const user2 = await repo.findByTelegramId(222);
    expect(user2!.comuni.find((c) => c.url === "pisa")!.notificheMeteo).toBe(true);
  });

  it("updateNotificheMeteo no-op per comune inesistente", async () => {
    await expect(
      repo.updateNotificheMeteo(111, "comune-inesistente", true)
    ).resolves.toBeUndefined();
  });
});
