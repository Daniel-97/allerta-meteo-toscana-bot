import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../../src/db/schema.js";

export async function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), "allerta-test-"));
  const client = createClient({ url: `file:${dir}/test.db` });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  return {
    db,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
