import { InputMediaBuilder } from "grammy";
import type { DatiMeteo, ParteGiorno } from "../types/index.js";

const EMOJI_ALLERTA: Record<string, string> = {
  VERDE: "🟢",
  GIALLO: "🟡",
  ARANCIONE: "🟠",
  ROSSO: "🔴",
};

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parteGiornoStr(p: ParteGiorno): string {
  return p === "mattina" ? "mattina" : p === "pomeriggio" ? "pomeriggio" : "sera";
}

export const messages = {
  welcome:
    "👋 <b>Benvenuto/a in Allerta Meteo Toscana Bot!</b>\n\n" +
    "🚨 Le allerte meteo vengono sempre comunicate per i comuni che hai impostato\n\n" +
    "🌤️ Le previsioni meteo vengono inviate solo se hai attivato le notifiche meteo per quel comune\n\n" +
    "⏰ Le notifiche vengono inviate 2 volte al giorno (11:30 e 17:30 ora italiana)\n\n" +
    "Seleziona una voce dal menu o usa i comandi.",

  credits:
    "ℹ️ <b>Come funziona</b>\n\n" +
    "🚨 Le allerte meteo vengono sempre comunicate per i comuni che hai impostato\n\n" +
    "🌤️ Le previsioni meteo vengono inviate solo se hai attivato le notifiche meteo per quel comune\n\n" +
    "⏰ Le notifiche vengono inviate 2 volte al giorno (11:30 e 17:30 ora italiana)\n\n" +
    "<i>Servizio realizzato da @DaniZ97 basato sui dati resi liberamente disponibili dal\n" +
    "<a href=\"https://www.lamma.toscana.it/\">consorzio LAMMA</a>.</i>\n\n" +
    "🔗 Per ulteriori informazioni: <a href=\"https://www.regione.toscana.it/allertameteo\">Regione Toscana — Allerta Meteo</a>",

  help:
    "📋 <b>Comandi disponibili</b>\n" +
    "/aggiungi &lt;nome&gt; — Aggiungi un comune\n" +
    "/elimina — Elimina un comune\n" +
    "/modifica — Modifica le notifiche di un comune\n" +
    "/lista — Mostra i tuoi comuni\n" +
    "/allerta — Ricevi l'allerta meteo\n" +
    "/previsioni — Ricevi le previsioni\n" +
    "/credits — Info sul servizio\n" +
    "/annulla — Annulla operazione",

  nessunComune:
    "Non hai ancora impostato comuni. Usa /aggiungi per iniziare.",

  confermaElimina: (nome: string) =>
    `Eliminare ${escHtml(nome)} dalla tua lista?`,

  eliminato: (nome: string) =>
    `✅ ${escHtml(nome)} rimosso dalla tua lista.`,

  confermaModifica: (nome: string, stato: string) =>
    `Notifiche meteo per ${escHtml(nome)}: attualmente ${stato}. Modificare?`,

  modificato: (nome: string, stato: string) =>
    `✅ Notifiche meteo per ${escHtml(nome)}: ${stato}.`,

  selezionaComuneDaEliminare: "📍 Seleziona il comune che vuoi eliminare:",

  selezionaComuneDaModificare: "📍 Seleziona il comune che vuoi modificare:",

  gestisciComuni: (comuni: { nome: string; notificheMeteo: boolean }[]) => {
    const items = comuni.map(
      (c) =>
        `• ${escHtml(c.nome)}\n  🔔 Allerta: ✅  Meteo: ${c.notificheMeteo ? "✅" : "❌"}`
    );
    return `📍 <b>I tuoi comuni:</b>\n\n${items.join("\n\n")}`;
  },

  annulla: "✖️ Operazione annullata.",

  comuniTrovati: "📍 Comuni trovati:",

  impostaPrompt:
    "🔍 Scrivi il nome del comune (es. /aggiungi pisa) oppure parte del nome per cercarlo.",

  impostaNonTrovato: "❌ Nessun comune trovato con quel nome. Riprova.",

  impostaConferma: (comune: string) =>
    `Vuoi ricevere anche le informazioni meteo per ${escHtml(comune)} insieme alle notifiche di allerta?`,

  impostaOk: (comune: string) =>
    `✅ Ok! Riceverai notifiche per ${escHtml(comune)}`,

  impostaOkAllerta: (comune: string) =>
    `✅ Ok! Riceverai notifiche per ${escHtml(comune)}. Ti avviserò anche delle condizioni meteo.`,

  nonIscritto:
    "⚠️ Non hai ancora impostato un comune. Usa /imposta per iniziare.",

  errore: "❌ Si è verificato un errore. Riprova più tardi.",

  allerta: (d: DatiMeteo) =>
    `🚨 <b>Allerta meteo</b> — ${escHtml(d.comune)}\n` +
    `<i>Aggiornamento: ${escHtml(d.aggiornamento)}</i>\n\n` +
    `${EMOJI_ALLERTA[d.allerta] ?? "⚪"} Livello allerta: <b>${d.allerta}</b>\n\n` +
    `💧 Idraulico: ${d.rischi.idraulico}\n` +
    `⛰️ Idrogeologico: ${d.rischi.idrogeologico}\n` +
    `⚡ Temporali: ${d.rischi.temporali}\n` +
    `💨 Vento: ${d.rischi.vento}\n` +
    `❄️ Neve: ${d.rischi.neve}\n` +
    `🧊 Ghiaccio: ${d.rischi.ghiaccio}`,

  previsioni: (d: DatiMeteo) =>
    `🌡️ <b>Previsioni meteo</b> — ${escHtml(d.comune)} (${parteGiornoStr(d.parteGiorno)})\n` +
    `<i>Aggiornamento: ${escHtml(d.aggiornamento)}</i>\n\n` +
    `🌡️ Temperatura: ${d.temperaturaAttuale}°\n` +
    `🤒 Percepita: ${d.temperaturaPercepita}°\n` +
    `💧 Umidità: ${d.umidita}%\n` +
    `🌧️ Pioggia: ${d.probabilitaPioggia}%\n` +
    `☀️ UV: ${d.uv}\n` +
    `❄️ Quota neve: ${d.quotaNeve} m\n` +
    `🌅 Alba: ${d.alba}\n` +
    `🌇 Tramonto: ${d.tramonto}\n\n` +
    `⬇️ Min: ${d.temperatura.min}°   ⬆️ Max: ${d.temperatura.max}°\n\n` +
    `📄 <a href="https://www.lamma.toscana.it/previ/ita/bollettino.pdf">Bollettino del giorno</a>`,

  completo: (d: DatiMeteo) =>
    `📊 <b>Dati meteo</b> — ${escHtml(d.comune)}\n` +
    `<i>Aggiornamento: ${escHtml(d.aggiornamento)}</i>\n\n` +
    `${EMOJI_ALLERTA[d.allerta] ?? "⚪"} <b>Allerta: ${d.allerta}</b>\n` +
    `💧 Idraulico: ${d.rischi.idraulico}\n` +
    `⛰️ Idrogeologico: ${d.rischi.idrogeologico}\n` +
    `⚡ Temporali: ${d.rischi.temporali}\n` +
    `💨 Vento: ${d.rischi.vento}\n` +
    `❄️ Neve: ${d.rischi.neve}\n` +
    `🧊 Ghiaccio: ${d.rischi.ghiaccio}\n\n` +
    `🌡️ <b>Previsioni (${parteGiornoStr(d.parteGiorno)})</b>\n` +
    `🌡️ Temperatura: ${d.temperaturaAttuale}°\n` +
    `🤒 Percepita: ${d.temperaturaPercepita}°\n` +
    `💧 Umidità: ${d.umidita}%\n` +
    `🌧️ Pioggia: ${d.probabilitaPioggia}%\n` +
    `☀️ UV: ${d.uv}\n` +
    `❄️ Quota neve: ${d.quotaNeve} m\n\n` +
    `⬇️ Min: ${d.temperatura.min}°   ⬆️ Max: ${d.temperatura.max}°\n\n` +
    `📄 <a href="https://www.lamma.toscana.it/previ/ita/bollettino.pdf">Bollettino del giorno</a>`,
};

export function ottieniUrlImmagine(
  giorno: number,
  parteGiorno: ParteGiorno,
): string {
  const base = "https://www.lamma.toscana.it/previ/ita/immagini/image_";
  const suffix = parteGiorno === "mattina" ? "M" : parteGiorno === "pomeriggio" ? "P" : "S";
  return `${base}${giorno}_${suffix}.jpg`;
}

export function costruisciAlbumImmagini(): ReturnType<typeof InputMediaBuilder.photo>[] {
  const fasce: ParteGiorno[] = ["mattina", "pomeriggio", "sera"];
  const album: ReturnType<typeof InputMediaBuilder.photo>[] = [];

  for (let giorno = 1; giorno <= 3; giorno++) {
    for (const fascia of fasce) {
      const url = ottieniUrlImmagine(giorno, fascia);
      album.push(InputMediaBuilder.photo(url));
    }
  }

  return album;
}
