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
        { text: "🌤️ Meteo Toscana", url: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana" },
        { text: `🌤️ Meteo ${nome}`, url: `https://www.lamma.toscana.it/meteo/meteo-${url}` },
      ],
    ],
  };
}

export function caloreInlineKeyboard(url: string) {
  return {
    inline_keyboard: [
      [
        { text: "📋 Cosa fare", url: "https://www.salute.gov.it/new/it/tema/ondate-di-calore/livelli-di-rischio-cosa-fare/" },
        { text: "📄 Bollettino", url },
      ],
    ],
  };
}

export function allertaInlineKeyboard(nome: string, url: string) {
  return {
    inline_keyboard: [
      [
        { text: "🗺️ Mappe allerta", url: "https://www.regione.toscana.it/allertameteo" },
        { text: `🌤️ Meteo ${nome}`, url: `https://www.lamma.toscana.it/meteo/meteo-${url}` },
      ],
      [{ text: "📋 Cosa fare", url: "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento" }],
    ],
  };
}

export function allertaConMeteoToscanaInlineKeyboard(nome: string, url: string) {
  return {
    inline_keyboard: [
      [
        { text: "🗺️ Mappe allerta", url: "https://www.regione.toscana.it/allertameteo" },
        { text: `🌤️ Meteo ${nome}`, url: `https://www.lamma.toscana.it/meteo/meteo-${url}` },
      ],
      [{ text: "🌤️ Meteo Toscana", url: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana" }],
      [{ text: "📋 Cosa fare", url: "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento" }],
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
