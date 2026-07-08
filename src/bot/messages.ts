import { InputMediaBuilder } from "grammy";
import type { DatiMeteo, ParteGiorno, RisultatoAllertaCalore, LivelloCalore } from "../types/index.js";

const EMOJI_ALLERTA: Record<string, string> = {
  VERDE: "🟢",
  GIALLO: "🟡",
  ARANCIONE: "🟠",
  ROSSO: "🔴",
  nessuno: "⚪",
};

const RISCHIO_MAP: Record<keyof DatiMeteo["rischi"], { emoji: string; label: string }> = {
  idraulico: { emoji: "💧", label: "Idraulico" },
  idrogeologico: { emoji: "⛰️", label: "Idrogeologico" },
  temporali: { emoji: "⚡", label: "Temporali" },
  vento: { emoji: "💨", label: "Vento" },
  neve: { emoji: "❄️", label: "Neve" },
  ghiaccio: { emoji: "🧊", label: "Ghiaccio" },
};

function isAllertaReale(allerta: string | undefined): boolean {
  if (!allerta) return false;
  return ["VERDE", "GIALLO", "ARANCIONE", "ROSSO"].includes(allerta);
}

export function formatRischi(
  rischi: DatiMeteo["rischi"],
): string | null {
  const entries = (Object.keys(RISCHIO_MAP) as (keyof DatiMeteo["rischi"])[])
    .filter(k => rischi[k] !== "ASSENTE" && rischi[k] !== "nessuno" && rischi[k] !== "")
    .map(k => `${RISCHIO_MAP[k].emoji} ${RISCHIO_MAP[k].label}: ${rischi[k]}`);
  return entries.length > 0 ? entries.join("\n") : null;
}

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parteGiornoStr(p: ParteGiorno): string {
  const map: Record<ParteGiorno, string> = {
    mattina: "mattina",
    mattina2: "mattina tardi",
    pomeriggio: "pomeriggio",
    pomeriggio2: "pomeriggio avanzato",
    sera: "sera",
    sera2: "sera tardi",
  };
  return map[p] ?? "sera";
}

export function livelloCaloreToEmoji(l: LivelloCalore): string {
  const map: Record<number, string> = { 0: "🟢", 1: "🟡", 2: "🟠", 3: "🔴" };
  return map[l] ?? "⚪";
}

export function livelloCaloreToNome(l: LivelloCalore): string {
  const map: Record<number, string> = { 0: "Verde", 1: "Gialla", 2: "Arancione", 3: "Rossa" };
  return map[l] ?? "Sconosciuto";
}

export function messaggioCalore(r: RisultatoAllertaCalore): string | null {
  if (r.errore) {
    return `🌡️ <b>Ondata di calore — Toscana</b>\n\n⚠️ Dati ondata calore non disponibili`;
  }
  const righe: string[] = [];
  if (r.oggi && r.oggi.livello > 0) {
    righe.push(`Oggi: ${livelloCaloreToEmoji(r.oggi.livello)} ${livelloCaloreToNome(r.oggi.livello)}`);
  }
  if (r.domani && r.domani.livello > 0) {
    righe.push(`Domani: ${livelloCaloreToEmoji(r.domani.livello)} ${livelloCaloreToNome(r.domani.livello)}`);
  }
  if (righe.length === 0) return null;

  const url = r.oggi?.url ?? r.domani?.url ?? "";
  return (
    `🌡️ <b>Ondata di calore — Toscana</b>\n` +
    `<i>Aggiornamento: ${r.dataEstrazione}</i>\n\n` +
    righe.join("\n") + "\n\n" +
    `📄 <a href="${url}">Bollettino calore</a>`
  );
}

export function haAllertaMeteo(d: DatiMeteo): boolean {
  return d.allerta !== "nessuno" || isAllertaReale(d.allertaDomani);
}

export const messages = {
  welcome:
    "👋 <b>Benvenuto/a in Allerta Meteo Toscana Bot!</b>\n\n" +
    "🚨 Le allerte meteo vengono sempre comunicate per i comuni che hai impostato\n\n" +
    "🌡️ Le allerte per ondate di calore (Toscana) vengono comunicate insieme a quelle meteo\n\n" +
    "🌤️ Le previsioni meteo vengono inviate solo se hai attivato le notifiche meteo per quel comune\n\n" +
    "⏰ Le notifiche vengono inviate 2 volte al giorno (08:00 e 15:00 ora italiana)\n\n" +
    "⚠️ <i>Questo bot non è ufficiale e non è affiliato al consorzio LAMMA, alla Regione Toscana né al Ministero della Salute.</i>\n\n" +
    "Per iniziare aggiungi un comune premendo sul tasto <b>Gestisci comuni → Aggiungi</b>",

  credits:
    "ℹ️ <b>Come funziona</b>\n\n" +
    "🚨 Le allerte meteo vengono sempre comunicate per i comuni che hai impostato\n\n" +
    "🌡️ Le allerte per ondate di calore (Toscana) vengono comunicate insieme a quelle meteo\n\n" +
    "🌤️ Le previsioni meteo vengono inviate solo se hai attivato le notifiche meteo per quel comune\n\n" +
    "⏰ Le notifiche vengono inviate 2 volte al giorno (08:00 e 15:00 ora italiana)\n\n" +
    "<i>Servizio realizzato da @DaniZ97 basato su:</i>\n" +
    "<i>• dati meteo resi liberamente disponibili dal <a href=\"https://www.lamma.toscana.it/\">consorzio LAMMA</a>;</i>\n" +
    "<i>• bollettini ondate di calore del <a href=\"https://www.salute.gov.it/new/it/tema/ondate-di-calore/bollettini-sulle-ondate-di-calore-0/\">Ministero della Salute</a>, ottenuti tramite l'associazione <a href=\"https://github.com/ondata/ondate-calore\">OnData</a>.</i>\n\n" +
    "🔗 Per ulteriori informazioni: <a href=\"https://www.regione.toscana.it/allertameteo\">Regione Toscana — Allerta Meteo</a>\n\n" +
    "⚠️ <i>Questo bot non è ufficiale e non è affiliato al consorzio LAMMA, alla Regione Toscana né al Ministero della Salute.</i>",

  aiuto:
    "🤖 <b>Comandi disponibili</b>\n\n" +
    "🚨 /allerta — Richiedi le allerte meteo (e ondate di calore) per i tuoi comuni\n\n" +
    "🌤️ /previsioni — Richiedi le previsioni meteo per i tuoi comuni\n\n" +
    "📋 /comuni — Gestisci i comuni monitorati (aggiungi, modifica, elimina, lista)\n\n" +
    "ℹ️ /credits — Informazioni sul bot e le fonti dati\n\n" +
    "❓ /aiuto — Mostra questo messaggio\n\n" +
    "Puoi usare gli stessi comandi anche premendo i pulsanti del menu qui sotto.",

  nessunComune:
    "Non hai ancora impostato comuni. Premi il pulsante <b>➕ Aggiungi</b> per iniziare.",

  nessunComunePrevisioni:
    "Imposta almeno un comune da monitorare prima premendo sul tasto <b>Gestisci comuni → Aggiungi</b>",

  confermaElimina: (nome: string) =>
    `Eliminare ${escHtml(nome)} dalla tua lista?`,

  gestisciComuni: (comuni: { nome: string; notificheMeteo: boolean }[]) => {
    const items = comuni.map(
      (c) =>
        `• ${escHtml(c.nome)}\n  🔔 Allerta: ✅  Meteo: ${c.notificheMeteo ? "✅" : "❌"}`
    );
    return `📍 <b>I tuoi comuni:</b>\n\n${items.join("\n\n")}`;
  },

  dettaglioComune: (nome: string, notificheMeteo: boolean) =>
    `📍 <b>${escHtml(nome)}</b>\n\n🔔 Allerta meteo: ✅ sempre attiva\n🌤️ Previsioni meteo: ${notificheMeteo ? "✅ attive" : "❌ disattive"}\n\nCosa vuoi fare?`,

  aggiungiPrompt:
    "🔍 Digita almeno 3 lettere del nome del comune per iniziare la ricerca.",

  ricercaNonTrovato: (testo: string) =>
    `Nessun comune trovato per '${escHtml(testo)}'. Se stavi cercando un comune, riprova con un nome diverso.`,

  ricercaTrovati: (count: number, testo: string) =>
    `📍 Ho trovato ${count} comuni per '${escHtml(testo)}':`,

  impostaConferma: (comune: string) =>
    `Vuoi ricevere anche le informazioni meteo per ${escHtml(comune)} insieme alle notifiche di allerta?`,

  impostaOk: (comune: string) =>
    `✅ Ok! Riceverai notifiche per ${escHtml(comune)}`,

  impostaOkAllerta: (comune: string) =>
    `✅ Ok! Riceverai notifiche per ${escHtml(comune)}. Ti avviserò anche delle condizioni meteo.`,

  errore: "❌ Si è verificato un errore. Riprova più tardi.",

  limiteRichieste:
    "⏳ Puoi richiedere un aggiornamento al massimo una volta al minuto. Riprova tra poco.",

  nessunaAllerta:
    "ℹ️ Nessuna allerta in corso o prevista per i prossimi giorni.",

  allerta: (d: DatiMeteo) => {
    const haAllerta = d.allerta !== "nessuno";
    let msg =
      `🚨 <b>Allerta meteo</b> — ${escHtml(d.comune)}\n` +
      `<i>Aggiornamento: ${escHtml(d.aggiornamento)}</i>\n\n` +
      `${EMOJI_ALLERTA[d.allerta] ?? "⚪"} Livello allerta: <b>${d.allerta}</b>`;
    if (haAllerta) {
      const rischiStr = formatRischi(d.rischi);
      if (rischiStr) msg += `\n\n${rischiStr}`;
    } else {
      msg += `\n\nNessuna allerta in corso.`;
    }
    if (d.allertaDomani && isAllertaReale(d.allertaDomani)) {
      msg += `\n\n🚨 <b>Previsioni per ${escHtml(d.nomeGiornoDomani ?? "domani")}</b>\n` +
        `${EMOJI_ALLERTA[d.allertaDomani] ?? "⚪"} Allerta: <b>${d.allertaDomani}</b>`;
      const rischiDomaniStr = d.rischiDomani ? formatRischi(d.rischiDomani) : null;
      if (rischiDomaniStr) msg += `\n${rischiDomaniStr}`;
    }
    return msg;
  },

  completo: (d: DatiMeteo) => {
    const haAllerta = d.allerta !== "nessuno";
    let sezioneAllerta =
      `${EMOJI_ALLERTA[d.allerta] ?? "⚪"} <b>Allerta: ${d.allerta}</b>`;
    if (haAllerta) {
      const rischiStr = formatRischi(d.rischi);
      if (rischiStr) sezioneAllerta += `\n${rischiStr}`;
    }
    if (d.allertaDomani && isAllertaReale(d.allertaDomani)) {
      sezioneAllerta += `\n\n🚨 <b>Previsioni per ${escHtml(d.nomeGiornoDomani ?? "domani")}</b>\n` +
        `${EMOJI_ALLERTA[d.allertaDomani] ?? "⚪"} Allerta: <b>${d.allertaDomani}</b>`;
      const rischiDomaniStr = d.rischiDomani ? formatRischi(d.rischiDomani) : null;
      if (rischiDomaniStr) sezioneAllerta += `\n${rischiDomaniStr}`;
    }
    return (
      `📊 <b>Dati meteo</b> — ${escHtml(d.comune)}\n` +
      `<i>Aggiornamento: ${escHtml(d.aggiornamento)}</i>\n\n` +
      sezioneAllerta + `\n\n` +
      `🌡️ <b>Previsioni (${parteGiornoStr(d.parteGiorno)})</b>\n` +
      `🌡️ Temperatura: ${d.temperaturaAttuale}°\n` +
      `🤒 Percepita: ${d.temperaturaPercepita}°\n` +
      `💧 Umidità: ${d.umidita}%\n` +
      `🌧️ Pioggia: ${d.probabilitaPioggia}%\n` +
      `☀️ UV: ${d.uv}\n` +
      `❄️ Quota neve: ${d.quotaNeve} m\n\n` +
      `⬇️ Min: ${d.temperatura.min}°   ⬆️ Max: ${d.temperatura.max}°\n\n` +
      `📄 <a href="https://www.lamma.toscana.it/previ/ita/bollettino.pdf">Bollettino del giorno</a>`
    );
  },

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
};

export function ottieniUrlImmagine(
  giorno: number,
  parteGiorno: ParteGiorno,
): string {
  const base = "https://www.lamma.toscana.it/previ/ita/immagini/image_";
  const suffix = parteGiorno === "mattina" || parteGiorno === "mattina2" ? "M"
    : parteGiorno === "pomeriggio" || parteGiorno === "pomeriggio2" ? "P"
    : "S";
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

export function fingerprintMeteo(d: DatiMeteo): string {
  const oggi = [
    d.allerta,
    d.rischi.idraulico, d.rischi.idrogeologico, d.rischi.temporali,
    d.rischi.vento, d.rischi.neve, d.rischi.ghiaccio,
  ].join("|");
  const domani = d.allertaDomani && d.rischiDomani
    ? [
        d.allertaDomani,
        d.rischiDomani.idraulico, d.rischiDomani.idrogeologico, d.rischiDomani.temporali,
        d.rischiDomani.vento, d.rischiDomani.neve, d.rischiDomani.ghiaccio,
      ].join("|")
    : "";
  return oggi + "||" + domani;
}

export function fingerprintCalore(r: RisultatoAllertaCalore): string {
  if (r.errore) return "__errore__";
  return `${r.oggi?.livello ?? ""}|${r.domani?.livello ?? ""}`;
}

export function isStessoGiornoIt(data: Date): boolean {
  const fmt = "en-CA";
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Rome",
    year: "numeric", month: "2-digit", day: "2-digit",
  };
  return (
    new Intl.DateTimeFormat(fmt, opts).format(data) ===
    new Intl.DateTimeFormat(fmt, opts).format(new Date())
  );
}
