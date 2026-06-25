import { describe, it, expect } from "vitest";
import { noComuniInlineKeyboard } from "../../src/bot/keyboards.js";

describe("noComuniInlineKeyboard", () => {
  it("restituisce due bottoni: Aggiungi comune e Credits&Info", () => {
    const result = noComuniInlineKeyboard();

    expect(result).toEqual({
      inline_keyboard: [
        [{ text: "➕ Aggiungi comune", callback_data: "add" }],
        [{ text: "ℹ️ Credits&Info", callback_data: "credits" }],
      ],
    });
  });
});
