import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";

const FINESTRA_S = 60;

export interface RateLimiterService {
  isAllowed(idTelegram: number): Promise<boolean>;
}

export function createRateLimiterService(db: LibSQLDatabase): RateLimiterService {
  return {
    isAllowed: async (idTelegram) => {
      const adessoS = Math.floor(Date.now() / 1000);

      // UPDATE condizionale atomica: legge e scrive in un'unica query,
      // cosi' due richieste concorrenti dello stesso utente non possono
      // entrambe leggere il vecchio timestamp prima che l'altra scriva.
      const result = await db.run(sql`
        update utenti
        set ultima_richiesta_on_demand = ${adessoS}
        where id_telegram = ${idTelegram}
          and (ultima_richiesta_on_demand is null or ${adessoS} - ultima_richiesta_on_demand >= ${FINESTRA_S})
      `);

      return result.rowsAffected > 0;
    },
  };
}
