import { describe, it, expect } from "vitest";
import { allertaInlineKeyboard, allertaConMappeInlineKeyboard } from "../../src/bot/keyboards.js";

const URL_MAPPE = "https://www.regione.toscana.it/allertameteo";
const URL_COSA_FARE = "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento";

describe("allertaInlineKeyboard", () => {
  it("restituisce una riga con i 2 link allerta", () => {
    const kb = allertaInlineKeyboard();
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "🗺️ Mappe allerta", url: URL_MAPPE },
        { text: "📋 Cosa fare", url: URL_COSA_FARE },
      ],
    ]);
  });
});

describe("allertaConMappeInlineKeyboard", () => {
  it("riga 1: i 2 link; riga 2: pulsante album img", () => {
    const kb = allertaConMappeInlineKeyboard();
    expect(kb.inline_keyboard).toEqual([
      [
        { text: "🗺️ Mappe allerta", url: URL_MAPPE },
        { text: "📋 Cosa fare", url: URL_COSA_FARE },
      ],
      [{ text: "🖼️ Mostra mappe meteo", callback_data: "img" }],
    ]);
  });
});