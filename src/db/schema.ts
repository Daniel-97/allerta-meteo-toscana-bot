import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const utenti = sqliteTable("utenti", {
  idTelegram: integer("id_telegram").primaryKey(),
  usernameTelegram: text("username_telegram"),
  nomeTelegram: text("nome_telegram").notNull(),
  creatoIl: integer("creato_il", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const utentiComuni = sqliteTable(
  "utenti_comuni",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    idTelegram: integer("id_telegram")
      .notNull()
      .references(() => utenti.idTelegram, { onDelete: "cascade" }),
    comuneNome: text("comune_nome").notNull(),
    comuneUrl: text("comune_url").notNull(),
    notificheMeteo: integer("notifiche_meteo", { mode: "boolean" })
      .notNull()
      .default(false),
    aggiuntoIl: integer("aggiunto_il", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => ({
    uniqueUtenteComuneUrl: unique().on(t.idTelegram, t.comuneUrl),
  })
);

export const sessioni = sqliteTable("sessioni", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const statoAllerte = sqliteTable("stato_allerte", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chiave: text("chiave").notNull().unique(),
  fingerprint: text("fingerprint").notNull(),
  aggiornatoIl: integer("aggiornato_il", { mode: "timestamp" }).notNull(),
});

export const comuni = sqliteTable(
  "comuni",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nome: text("nome").notNull(),
    url: text("url").notNull(),
  },
  (t) => ({
    urlUnico: unique().on(t.url),
    nomeIdx: index("comuni_nome_idx").on(t.nome),
  })
);
