import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, sql } from "drizzle-orm";
import { statoAllerte } from "../db/schema.js";

export interface AlertStateService {
  getFingerprint(
    chiave: string
  ): Promise<{ fingerprint: string; aggiornatoIl: Date } | null>;
  setFingerprint(chiave: string, fingerprint: string): Promise<void>;
}

export function createAlertStateService(
  db: LibSQLDatabase
): AlertStateService {
  return {
    getFingerprint: async (chiave) => {
      const rows = await db
        .select({ fingerprint: statoAllerte.fingerprint, aggiornatoIl: statoAllerte.aggiornatoIl })
        .from(statoAllerte)
        .where(eq(statoAllerte.chiave, chiave))
        .limit(1);
      return rows.length > 0 ? rows[0] : null;
    },

    setFingerprint: async (chiave, fingerprint) => {
      const aggiornatoIl = Math.floor(Date.now() / 1000);
      await db.run(sql`
        insert into stato_allerte (chiave, fingerprint, aggiornato_il)
        values (${chiave}, ${fingerprint}, ${aggiornatoIl})
        on conflict (chiave) do update set
          fingerprint = excluded.fingerprint,
          aggiornato_il = excluded.aggiornato_il
      `);
    },
  };
}
