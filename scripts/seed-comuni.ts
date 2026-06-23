#!/usr/bin/env tsx
import { XMLParser } from "fast-xml-parser";
import "dotenv/config";
import { db } from "../src/db/index.js";
import { comuni } from "../src/db/schema.js";

const URL = "https://www.lamma.toscana.it/previ/ita/xml/lista_comuni.xml";

const response = await fetch(URL);
if (!response.ok) {
  console.error(`Errore fetch XML: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const xml = await response.text();

const parser = new XMLParser({ isArray: (name) => name === "link" });
let parsed: { pages: { link: Array<{ title: string; url: string }> } };
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
}));

console.log(`Trovati ${rows.length} comuni nel XML. Inserimento in corso...`);

const result = await db.insert(comuni).values(rows).onConflictDoNothing();

console.log(`Inseriti: ${result.rowsAffected} righe`);
process.exit(0);
