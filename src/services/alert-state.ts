import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
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
      await db
        .insert(statoAllerte)
        .values({ chiave, fingerprint, aggiornatoIl: new Date() })
        .onConflictDoUpdate({
          target: statoAllerte.chiave,
          set: { fingerprint, aggiornatoIl: new Date() },
        });
    },
  };
}
