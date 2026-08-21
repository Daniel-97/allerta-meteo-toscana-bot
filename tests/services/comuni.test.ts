import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createTestDb } from "../helpers/test-db.js";
import { createArchivioComuni } from "../../src/services/comuni.js";
import { comuni } from "../../src/db/schema.js";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { ArchivioComuni } from "../../src/services/comuni.js";

const FIXTURE = [
  { nome: "Firenze", url: "firenze" },
  { nome: "Scandicci", url: "scandicci" },
  { nome: "Sesto Fiorentino", url: "sestofiorentino" },
  { nome: "Pisa", url: "pisa" },
];

describe("ArchivioComuni", () => {
  let db: LibSQLDatabase;
  let archivio: ArchivioComuni;
  let cleanup: () => void;

  beforeAll(async () => {
    const test = await createTestDb();
    db = test.db;
    cleanup = test.cleanup;
    await db.insert(comuni).values(FIXTURE);
    archivio = createArchivioComuni(db);
  });

  afterAll(() => {
    cleanup?.();
  });

  it("searchByPrefix trovato (case-insensitive)", async () => {
    const res = await archivio.searchByPrefix("fire");
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe("Firenze");
    expect(res[0].url).toBe("firenze");
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

  it("findByUrl match esatto", async () => {
    const res = await archivio.findByUrl("firenze");
    expect(res).toBeDefined();
    expect(res!.nome).toBe("Firenze");
    expect(res!.url).toBe("firenze");
  });

  it("findByUrl nessun match", async () => {
    const res = await archivio.findByUrl("non-esiste");
    expect(res).toBeUndefined();
  });

  it("all ritorna tutti i comuni ordinati", async () => {
    const res = await archivio.all();
    expect(res).toHaveLength(4);
    expect(res[0].nome).toBe("Firenze");
    expect(res[3].nome).toBe("Sesto Fiorentino");
  });
});
