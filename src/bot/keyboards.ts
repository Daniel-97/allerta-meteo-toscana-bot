import { LINKS, RISORSE } from "./links.js";

export function comuniGestioneInlineKeyboard(
  comuni: Array<{ nome: string; url: string }>
) {
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < comuni.length; i += 2) {
    rows.push(
      comuni.slice(i, i + 2).map((c) => ({
        text: c.nome,
        callback_data: `comune:${c.url}:${c.nome}`,
      })),
    );
  }
  rows.push([{ text: "➕ Aggiungi comune", callback_data: "aggiungi" }]);
  return { inline_keyboard: rows };
}

export function comuneDettaglioInlineKeyboard(
  url: string,
  nome: string,
  notificheMeteo: boolean,
) {
  return {
    inline_keyboard: [
      [{ text: "🗑️ Elimina", callback_data: `del:${url}:${nome}` }],
      [
        {
          text: notificheMeteo ? "🔕 Disattiva previsioni meteo" : "🔔 Attiva previsioni meteo",
          callback_data: `toggle:${url}:${nome}:${notificheMeteo ? "0" : "1"}`,
        },
      ],
      [{ text: "◀️ Indietro", callback_data: "back" }],
    ],
  };
}

export function confermaEliminaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ SI, elimina", callback_data: `del-confirm:${url}:${nome}` },
        { text: "❌ NO, annulla", callback_data: `annulla:${url}:${nome}` },
      ],
    ],
  };
}

export function comuniInlineKeyboard(
  comuni: Array<{ nome: string; url: string }>
) {
  return {
    inline_keyboard: comuni.map((c) => [
      {
        text: `📍 ${c.nome}`,
        callback_data: `sel:${c.url}:${c.nome}`,
      },
    ]),
  };
}

export function previsioniCompleteInlineKeyboard(nome: string, url: string) {
  return {
    inline_keyboard: [
      [
        { text: "🌤️ Meteo Toscana", url: LINKS.meteoToscana },
        { text: `🌤️ Meteo ${nome}`, url: LINKS.meteoComune(url) },
      ],
      rigaAltreRisorse("previsioni", url),
    ],
  };
}

export function caloreInlineKeyboard(url: string) {
  return {
    inline_keyboard: [
      [
        { text: "📋 Cosa fare", url: LINKS.cosaFareCalore },
        { text: "📄 Bollettino", url },
      ],
    ],
  };
}

export function allertaInlineKeyboard(nome: string, url: string) {
  return {
    inline_keyboard: [
      [
        { text: "🗺️ Mappe allerta", url: LINKS.mappeAllerta },
        { text: `🌤️ Meteo ${nome}`, url: LINKS.meteoComune(url) },
      ],
      [
        { text: "📋 Cosa fare", url: LINKS.cosaFare },
        ...rigaAltreRisorse("allerta", url),
      ],
    ],
  };
}

export function allertaConMeteoToscanaInlineKeyboard(nome: string, url: string) {
  return {
    inline_keyboard: [
      [
        { text: "🗺️ Mappe allerta", url: LINKS.mappeAllerta },
        { text: "📋 Cosa fare", url: LINKS.cosaFare },
      ],
      [
        { text: "🌤️ Meteo Toscana", url: LINKS.meteoToscana },
        { text: `🌤️ Meteo ${nome}`, url: LINKS.meteoComune(url) },
      ],
      rigaAltreRisorse("completo", url),
    ],
  };
}

export function confermaInlineKeyboard(url: string, nome: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ SI", callback_data: `sub:${url}:${nome}:1` },
        { text: "❌ NO", callback_data: `sub:${url}:${nome}:0` },
      ],
    ],
  };
}

function rigaAltreRisorse(tipo: string, url: string) {
  return [{ text: "🔗 Altre risorse", callback_data: `risorse:${tipo}:${url}` }];
}

export function risorseInlineKeyboard(tipo?: string, url?: string) {
  const kb: {
    inline_keyboard: Array<Array<{ text: string; url: string } | { text: string; callback_data: string }>>;
  } = { inline_keyboard: [] };
  for (let i = 0; i < RISORSE.length; i += 2) {
    kb.inline_keyboard.push(RISORSE.slice(i, i + 2).map((r) => ({ text: r.text, url: r.url })));
  }
  if (tipo) {
    kb.inline_keyboard.push([{ text: "← Indietro", callback_data: `risorse-back:${tipo}:${url}` }]);
  }
  return kb;
}

export function keyboardMeteoPerTipo(tipo: string, nome: string, url: string) {
  if (tipo === "completo") return allertaConMeteoToscanaInlineKeyboard(nome, url);
  if (tipo === "previsioni") return previsioniCompleteInlineKeyboard(nome, url);
  return allertaInlineKeyboard(nome, url);
}
