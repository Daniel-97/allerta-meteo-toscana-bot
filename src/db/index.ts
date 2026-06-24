import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { config } from "../config.js";
import type { Config } from "../config.js";
import * as schema from "./schema.js";

export function createDb(config: Config): LibSQLDatabase<typeof schema> {
  const client = createClient({
    url: config.TURSO_DATABASE_URL,
    authToken: config.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export const db = createDb(config);
