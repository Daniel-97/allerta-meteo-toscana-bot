import { eq, like, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { comuni } from "../db/schema.js";
import type { Comune } from "../types/index.js";

export interface ArchivioComuni {
  searchByPrefix(prefix: string): Promise<Comune[]>;
  findByNome(nome: string): Promise<Comune | undefined>;
  all(): Promise<Comune[]>;
}

export function createArchivioComuni(db: LibSQLDatabase): ArchivioComuni {
  function rowToComune(row: typeof comuni.$inferSelect): Comune {
    return {
      nome: row.nome,
      url: row.url,
      provincia: row.provincia,
      zona: row.zona,
    };
  }

  return {
    searchByPrefix: (prefix) =>
      db
        .select()
        .from(comuni)
        .where(like(sql`LOWER(${comuni.nome})`, `${prefix.toLowerCase()}%`))
        .orderBy(comuni.nome)
        .then((rows) => rows.map(rowToComune)),

    findByNome: (nome) =>
      db
        .select()
        .from(comuni)
        .where(eq(comuni.nome, nome))
        .limit(1)
        .then((rows) => (rows[0] ? rowToComune(rows[0]) : undefined)),

    all: () =>
      db
        .select()
        .from(comuni)
        .orderBy(comuni.nome)
        .then((rows) => rows.map(rowToComune)),
  };
}
