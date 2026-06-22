#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import "dotenv/config";
import { db } from "../src/db/index.js";
import { comuni } from "../src/db/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const xmlPath = resolve(__dirname, "../XML/lista_comuni.xml");

let xml: string;
try {
  xml = readFileSync(xmlPath, "utf-8");
} catch (err) {
  console.error(`Errore lettura XML: ${xmlPath}`, err);
  process.exit(1);
}

const parser = new XMLParser({ isArray: (name) => name === "link" });
let parsed: { pages: { link: Array<{ title: string; url: string; provincia?: string; zona?: string }> } };
try {
  parsed = parser.parse(xml);
} catch (err) {
  console.error("Errore parsing XML", err);
  process.exit(1);
}

const links = parsed?.pages?.link;
if (!links || links.length === 0) {
  console.error("Errore: nessun comune trovato nel XML");
  process.exit(1);
}

const rows = links.map((link) => ({
  nome: link.title,
  url: link.url,
  provincia: link.provincia,
  zona: link.zona,
}));

console.log(`Trovati ${rows.length} comuni nel XML. Inserimento in corso...`);

const result = await db.insert(comuni).values(rows).onConflictDoNothing();

console.log(`Inseriti: ${result.rowsAffected} righe`);
process.exit(0);
