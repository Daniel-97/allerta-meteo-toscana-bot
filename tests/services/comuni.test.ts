import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb } from "../helpers/test-db.js";
import { createArchivioComuni } from "../../src/services/comuni.js";
import { comuni } from "../../src/db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { ArchivioComuni } from "../../src/services/comuni.js";

const FIXTURE = [
  { nome: "Firenze", url: "firenze", provincia: "FI", zona: "A3 - Arno-Firenze" },
  { nome: "Scandicci", url: "scandicci", provincia: "FI", zona: "A3 - Arno-Firenze" },
  { nome: "Sesto Fiorentino", url: "sestofiorentino", provincia: "FI", zona: "B - Bisenzio e Ombrone Pt" },
  { nome: "Pisa", url: "pisa", provincia: "PI", zona: "A1 - Basso corso Arno" },
];

describe("ArchivioComuni", () => {
  let db: LibSQLDatabase;
  let archivio: ArchivioComuni;

  beforeAll(async () => {
    db = await createTestDb();
    await db.insert(comuni).values(FIXTURE);
    archivio = createArchivioComuni(db);
  });

  it("searchByPrefix trovato (case-insensitive)", async () => {
    const res = await archivio.searchByPrefix("fire");
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe("Firenze");
    expect(res[0].url).toBe("firenze");
    expect(res[0].provincia).toBe("FI");
    expect(res[0].zona).toContain("Arno");
  });

  it("searchByPrefix multi-match ordinato", async () => {
    const res = await archivio.searchByPrefix("s");
    expect(res).toHaveLength(2);
    expect(res[0].nome).toBe("Scandicci");
    expect(res[1].nome).toBe("Sesto Fiorentino");
  });

  it("searchByPrefix maiuscolo funziona come minuscolo", async () => {
    const res = await archivio.searchByPrefix("PISA");
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe("Pisa");
  });

  it("searchByPrefix nessun match", async () => {
    const res = await archivio.searchByPrefix("xyz");
    expect(res).toHaveLength(0);
  });

  it("findByNome match esatto", async () => {
    const res = await archivio.findByNome("Firenze");
    expect(res).toBeDefined();
    expect(res!.nome).toBe("Firenze");
    expect(res!.url).toBe("firenze");
  });

  it("findByNome nessun match", async () => {
    const res = await archivio.findByNome("NonEsiste");
    expect(res).toBeUndefined();
  });

  it("all ritorna tutti i comuni ordinati", async () => {
    const res = await archivio.all();
    expect(res).toHaveLength(4);
    expect(res[0].nome).toBe("Firenze");
    expect(res[3].nome).toBe("Sesto Fiorentino");
  });
});
