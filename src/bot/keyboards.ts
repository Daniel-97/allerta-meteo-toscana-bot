import { Keyboard } from "grammy";

export function mainMenuKeyboard() {
  return new Keyboard()
    .text("Aggiorna allerta")
    .text("Aggiorna meteo")
    .row()
    .text("Gestisci comuni")
    .text("Credits&Info")
    .row()
    .resized();
}

export function gestisciComuniKeyboard(
  comuni: Array<{ url: string; nome: string }>
) {
  const keyboard = comuni.map((c) => [
    { text: `✏️ ${c.nome}`, callback_data: `mod:${c.url}:${c.nome}` },
    { text: `🗑️ ${c.nome}`, callback_data: `del:${c.url}:${c.nome}` },
  ]);
  keyboard.push([
    { text: "➕ Aggiungi comune", callback_data: "add" },
  ]);
  return { inline_keyboard: keyboard };
}

export function confermaEliminaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "SI, elimina", callback_data: `del-confirm:${url}:${nome}` },
        { text: "NO, annulla", callback_data: "annulla" },
      ],
    ],
  };
}

export function confermaModificaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "SI", callback_data: `mod-set:${url}:${nome}:1` },
        { text: "NO", callback_data: `mod-set:${url}:${nome}:0` },
      ],
    ],
  };
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
