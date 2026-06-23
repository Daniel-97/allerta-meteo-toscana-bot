import type { DatiMeteo, ParteGiorno } from "../types/index.js";

const EMOJI_ALLERTA: Record<string, string> = {
  VERDE: "🟢",
  GIALLO: "🟡",
  ARANCIONE: "🟠",
  ROSSO: "🔴",
};

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parteGiornoStr(p: ParteGiorno): string {
  return p === "mattina" ? "mattina" : p === "pomeriggio" ? "pomeriggio" : "sera";
}

export const messages = {
  welcome:
    "👋 <b>Benvenuto/a in Allerta Meteo Toscana Bot!</b>\n" +
    "Seleziona una voce dal menu o usa i comandi.",

  credits:
    "ℹ️ Servizio di notifica allerta e previsioni meteo realizzato da @DaniZ97\n" +
    "basato sui dati resi liberamente disponibili a tutti i cittadini dal consorzio LAMMA.",

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
    `🌅 Alba: ${d.alba}\n` +
    `🌇 Tramonto: ${d.tramonto}\n\n` +
    `⬇️ Min: ${d.temperatura.min}°   ⬆️ Max: ${d.temperatura.max}°`,

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
    `🌧️ Pioggia: ${d.probabilitaPioggia}%\n\n` +
    `⬇️ Min: ${d.temperatura.min}°   ⬆️ Max: ${d.temperatura.max}°`,
};

export function ottieniUrlImmagine(
  parteGiorno: ParteGiorno,
  timeMs: string,
): string {
  const base = "https://www.lamma.toscana.it/previ/ita/immagini/image_1_";
  const suffix = parteGiorno === "mattina" ? "M" : parteGiorno === "pomeriggio" ? "P" : "S";
  return `${base}${suffix}.jpg?v=${timeMs}`;
}
