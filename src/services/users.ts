import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { utenti, utentiComuni } from "../db/schema.js";

export interface UserComune {
  nome: string;
  url: string;
  notificheMeteo: boolean;
}

export interface User {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  comuni: UserComune[];
}

export interface SubscribeInput {
  idTelegram: number;
  usernameTelegram: string | null;
  nomeTelegram: string;
  comune: { nome: string; url: string };
  notificheMeteo: boolean;
}

export interface UsersRepository {
  findByTelegramId(id: number): Promise<User | undefined>;
  subscribe(input: SubscribeInput): Promise<void>;
  findAllWithComuni(): Promise<User[]>;
}

export function createUsersRepository(db: LibSQLDatabase): UsersRepository {
  function rowToUserComune(row: typeof utentiComuni.$inferSelect): UserComune {
    return {
      nome: row.comuneNome,
      url: row.comuneUrl,
      notificheMeteo: row.notificheMeteo,
    };
  }

  function rowToUser(
    utente: typeof utenti.$inferSelect,
    comuni: UserComune[]
  ): User {
    return {
      idTelegram: utente.idTelegram,
      usernameTelegram: utente.usernameTelegram,
      nomeTelegram: utente.nomeTelegram,
      comuni,
    };
  }

  return {
    findByTelegramId: async (id) => {
      const userRows = await db
        .select()
        .from(utenti)
        .where(eq(utenti.idTelegram, id))
        .limit(1);
      if (userRows.length === 0) return undefined;
      const comuniRows = await db
        .select()
        .from(utentiComuni)
        .where(eq(utentiComuni.idTelegram, id));
      return rowToUser(userRows[0], comuniRows.map(rowToUserComune));
    },

    subscribe: async (input) => {
      await db.transaction(async (tx) => {
        await tx
          .insert(utenti)
          .values({
            idTelegram: input.idTelegram,
            usernameTelegram: input.usernameTelegram,
            nomeTelegram: input.nomeTelegram,
          })
          .onConflictDoUpdate({
            target: utenti.idTelegram,
            set: {
              usernameTelegram: input.usernameTelegram,
              nomeTelegram: input.nomeTelegram,
            },
          });
        await tx
          .insert(utentiComuni)
          .values({
            idTelegram: input.idTelegram,
            comuneNome: input.comune.nome,
            comuneUrl: input.comune.url,
            notificheMeteo: input.notificheMeteo,
          })
          .onConflictDoUpdate({
            target: [utentiComuni.idTelegram, utentiComuni.comuneUrl],
            set: { notificheMeteo: input.notificheMeteo },
          });
      });
    },

    findAllWithComuni: async () => {
      const userRows = await db.select().from(utenti);
      const comuniRows = await db.select().from(utentiComuni);
      const comuniByUser = new Map<number, UserComune[]>();
      for (const row of comuniRows) {
        const arr = comuniByUser.get(row.idTelegram) ?? [];
        arr.push(rowToUserComune(row));
        comuniByUser.set(row.idTelegram, arr);
      }
      return userRows.map((u) =>
        rowToUser(u, comuniByUser.get(u.idTelegram) ?? [])
      );
    },
  };
}
