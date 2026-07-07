import { describe, it, expect } from "vitest";
import { createTestDb } from "../helpers/test-db.js";
import { createAlertStateService } from "../../src/services/alert-state.js";

describe("AlertStateService", () => {
  async function setup() {
    const { db, cleanup } = await createTestDb();
    const service = createAlertStateService(db);
    return { service, cleanup };
  }

  it("getFingerprint restituisce null per chiave inesistente", async () => {
    const { service, cleanup } = await setup();
    try {
      const result = await service.getFingerprint("allerta_meteo_firenze");
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("setFingerprint salva e getFingerprint recupera", async () => {
    const { service, cleanup } = await setup();
    try {
      await service.setFingerprint("allerta_meteo_firenze", "GIALLO|ASSENTE|ASSENTE|ASSENTE|ASSENTE|ASSENTE|ASSENTE||");
      const result = await service.getFingerprint("allerta_meteo_firenze");
      expect(result).not.toBeNull();
      expect(result!.fingerprint).toBe("GIALLO|ASSENTE|ASSENTE|ASSENTE|ASSENTE|ASSENTE|ASSENTE||");
      expect(result!.aggiornatoIl).toBeInstanceOf(Date);
    } finally {
      cleanup();
    }
  });

  it("setFingerprint aggiorna record esistente (upsert)", async () => {
    const { service, cleanup } = await setup();
    try {
      await service.setFingerprint("allerta_calore_toscana", "2|1");
      await service.setFingerprint("allerta_calore_toscana", "2|2");
      const result = await service.getFingerprint("allerta_calore_toscana");
      expect(result!.fingerprint).toBe("2|2");
    } finally {
      cleanup();
    }
  });
});
