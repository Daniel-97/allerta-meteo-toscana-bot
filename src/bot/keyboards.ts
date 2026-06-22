import { Keyboard } from "grammy";

export function mainMenuKeyboard() {
  return new Keyboard()
    .text("Aggiorna allerta")
    .text("Aggiorna meteo")
    .row()
    .text("Imposta comune")
    .text("Credits&Info")
    .row()
    .resized();
}

export function comuniInlineKeyboard(
  comuni: Array<{ nome: string; url: string; provincia: string | null }>
) {
  return {
    inline_keyboard: comuni.map((c) => [
      {
        text: c.provincia ? `${c.nome} (${c.provincia})` : c.nome,
        callback_data: `sel:${c.url}:${c.nome}`,
      },
    ]),
  };
}

export function confermaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "SI", callback_data: `sub:${url}:${nome}:1` },
        { text: "NO", callback_data: `sub:${url}:${nome}:0` },
      ],
    ],
  };
}
