import { describe, it, expect } from "vitest";
import { allertaInlineKeyboard, caloreInlineKeyboard, previsioniCompleteInlineKeyboard } from "../../src/bot/keyboards.js";

const URL_MAPPE = "https://www.regione.toscana.it/allertameteo";
const URL_COSA_FARE = "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento";
const URL_PREVISIONI_COMPLETE = "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana";

describe("allertaInlineKeyboard", () => {
  it("riga 1: Mappe allerta + Meteo; riga 2: Cosa fare", () => {
    const kb = allertaInlineKeyboard();
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "🗺️ Mappe allerta", url: URL_MAPPE },
        { text: "🌤️ Meteo", url: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana" },
      ],
      [{ text: "📋 Cosa fare", url: URL_COSA_FARE }],
    ]);
  });
});

describe("previsioniCompleteInlineKeyboard", () => {
  it("restituisce il pulsante Previsioni complete", () => {
    const kb = previsioniCompleteInlineKeyboard();
    expect(kb.inline_keyboard).toEqual([
      [{ text: "🖼️ Previsioni complete", url: URL_PREVISIONI_COMPLETE }],
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