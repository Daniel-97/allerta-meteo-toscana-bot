import { describe, it, expect, beforeAll } from "vitest";
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
    db = await createTestDb();
    repo = createUsersRepository(db);
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
});
