import { describe, it, expect } from "vitest";
import { allertaInlineKeyboard, caloreInlineKeyboard, previsioniCompleteInlineKeyboard, allertaConMeteoToscanaInlineKeyboard, risorseInlineKeyboard, keyboardMeteoPerTipo } from "../../src/bot/keyboards.js";

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
      [{ text: "🔗 Altre risorse", callback_data: "risorse:allerta:cascina" }],
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
      [{ text: "🔗 Altre risorse", callback_data: "risorse:previsioni:cascina" }],
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
      [{ text: "🔗 Altre risorse", callback_data: "risorse:completo:cascina" }],
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

describe("risorseInlineKeyboard", () => {
  it("senza tipo: solo le 3 risorse", () => {
    const kb = risorseInlineKeyboard();
    expect(kb.inline_keyboard).toEqual([
      [{ text: "⚡ Fulminazioni (tempo reale)", url: "https://map.blitzortung.org/#5.26/41.709/13.462" }],
      [{ text: "📡 Radar meteo", url: "https://www.lamma.toscana.it/meteo/osservazioni-e-dati/radar" }],
      [{ text: "🌡️ Temperature stazioni", url: "https://www.lamma.toscana.it/meteo/osservazioni-e-dati/temperature-tempo-reale" }],
    ]);
  });

  it("con tipo/url: riga finale Indietro", () => {
    const kb = risorseInlineKeyboard("allerta", "cascina");
    expect(kb.inline_keyboard).toHaveLength(4);
    expect(kb.inline_keyboard[3]).toEqual([
      { text: "← Indietro", callback_data: "risorse-back:allerta:cascina" },
    ]);
  });
});

describe("callback_data entro 64 byte", () => {
  it("callback_data entro 64 byte per nomi comuni lunghi", () => {
    const nome = "Castello di Sambuca Pistoiese";
    const url = "castellodisambucapse";
    const kb = allertaInlineKeyboard(nome, url);
    const data = kb.inline_keyboard.at(-1)[0].callback_data as string;
    expect(Buffer.byteLength(data, "utf8")).toBeLessThanOrEqual(64);
  });
});

describe("keyboardMeteoPerTipo", () => {
  it("restituisce la factory giusta per ogni tipo", () => {
    expect(keyboardMeteoPerTipo("allerta", "Cascina", "cascina")).toEqual(allertaInlineKeyboard("Cascina", "cascina"));
    expect(keyboardMeteoPerTipo("completo", "Cascina", "cascina")).toEqual(allertaConMeteoToscanaInlineKeyboard("Cascina", "cascina"));
    expect(keyboardMeteoPerTipo("previsioni", "Cascina", "cascina")).toEqual(previsioniCompleteInlineKeyboard("Cascina", "cascina"));
  });
});