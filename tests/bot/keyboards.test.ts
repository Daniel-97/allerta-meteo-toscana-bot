import { describe, it, expect } from "vitest";
import { allertaInlineKeyboard, caloreInlineKeyboard, previsioniCompleteInlineKeyboard, allertaConMeteoToscanaInlineKeyboard } from "../../src/bot/keyboards.js";

const URL_MAPPE = "https://www.regione.toscana.it/allertameteo";
const URL_COSA_FARE = "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento";

describe("allertaInlineKeyboard", () => {
  it("riga 1: Mappe allerta + Meteo Cascina; riga 2: Cosa fare", () => {
    const kb = allertaInlineKeyboard("Cascina", "cascina");
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "🗺️ Mappe allerta", url: URL_MAPPE },
        { text: "🌤️ Meteo Cascina", url: "https://www.lamma.toscana.it/meteo/meteo-cascina" },
      ],
      [{ text: "📋 Cosa fare", url: URL_COSA_FARE }],
    ]);
  });
});

describe("previsioniCompleteInlineKeyboard", () => {
  it("riga con Meteo Toscana e Meteo Cascina", () => {
    const kb = previsioniCompleteInlineKeyboard("Cascina", "cascina");
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "🌤️ Meteo Toscana", url: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana" },
        { text: "🌤️ Meteo Cascina", url: "https://www.lamma.toscana.it/meteo/meteo-cascina" },
      ],
    ]);
  });
});

describe("allertaConMeteoToscanaInlineKeyboard", () => {
  it("3 righe: Mappe allerta+Meteo Cascina, Meteo Toscana, Cosa fare", () => {
    const kb = allertaConMeteoToscanaInlineKeyboard("Cascina", "cascina");
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "🗺️ Mappe allerta", url: URL_MAPPE },
        { text: "🌤️ Meteo Cascina", url: "https://www.lamma.toscana.it/meteo/meteo-cascina" },
      ],
      [{ text: "🌤️ Meteo Toscana", url: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana" }],
      [{ text: "📋 Cosa fare", url: URL_COSA_FARE }],
    ]);
  });
});

describe("caloreInlineKeyboard", () => {
  it("restituisce Cosa fare e Bollettino con l'url parametro", () => {
    const kb = caloreInlineKeyboard("https://salute.gov.it/bol.pdf");
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "📋 Cosa fare", url: "https://www.salute.gov.it/new/it/tema/ondate-di-calore/livelli-di-rischio-cosa-fare/" },
        { text: "📄 Bollettino", url: "https://salute.gov.it/bol.pdf" },
      ],
    ]);
  });
});