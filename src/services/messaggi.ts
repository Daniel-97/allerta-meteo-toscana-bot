import type { DatiMeteo, ParteGiorno } from "../types/index.js";

export function formattaAllerta(dati: DatiMeteo): string {
  return (
    `Dati allerta del ${dati.aggiornamento} per comune di ${dati.comune}\n\n` +
    `Allerta: ${dati.allerta}\n\n` +
    `- Rischio idraulico: ${dati.rischi.idraulico}\n` +
    `- Rischio idrogeologico: ${dati.rischi.idrogeologico}\n` +
    `- Rischio temporali: ${dati.rischi.temporali}\n` +
    `- Rischio vento: ${dati.rischi.vento}\n` +
    `- Rischio neve: ${dati.rischi.neve}\n` +
    `- Rischio ghiaccio: ${dati.rischi.ghiaccio}`
  );
}

export function formattaPrevisioni(dati: DatiMeteo): string {
  const parteGiornoStr =
    dati.parteGiorno === "mattina"
      ? "mattina"
      : dati.parteGiorno === "pomeriggio"
        ? "pomeriggio"
        : "sera";
  return (
    `Dati meteo del ${dati.aggiornamento}. Comune di ${dati.comune} ${parteGiornoStr}\n\n` +
    `- Temperatura: ${dati.temperaturaAttuale}°\n` +
    `- Temperatura percepita: ${dati.temperaturaPercepita}°\n` +
    `- Umidita': ${dati.umidita}%\n` +
    `- Probabilita' pioggia: ${dati.probabilitaPioggia}%\n` +
    `- Sole sorge: ${dati.alba}\n` +
    `- Sole tramonta: ${dati.tramonto}\n` +
    `Temp min: ${dati.temperatura.min}°         Temp max: ${dati.temperatura.max}°`
  );
}

export function formattaCompleto(dati: DatiMeteo): string {
  const parteGiornoStr =
    dati.parteGiorno === "mattina"
      ? "mattina"
      : dati.parteGiorno === "pomeriggio"
        ? "pomeriggio"
        : "sera";
  return (
    `Dati del ${dati.aggiornamento} per comune di ${dati.comune}\n\n` +
    `Allerta: ${dati.allerta}\n\n` +
    `- Rischio idraulico: ${dati.rischi.idraulico}\n` +
    `- Rischio idrogeologico: ${dati.rischi.idrogeologico}\n` +
    `- Rischio temporali: ${dati.rischi.temporali}\n` +
    `- Rischio vento: ${dati.rischi.vento}\n` +
    `- Rischio neve: ${dati.rischi.neve}\n` +
    `- Rischio ghiaccio: ${dati.rischi.ghiaccio}\n\n` +
    `Informazioni meteo ${parteGiornoStr}\n` +
    `- Temperatura: ${dati.temperaturaAttuale}°\n` +
    `- Temperatura percepita: ${dati.temperaturaPercepita}°\n` +
    `- Umidita': ${dati.umidita}%\n` +
    `- Probabilita' pioggia: ${dati.probabilitaPioggia}%\n\n` +
    `Temp min: ${dati.temperatura.min}°         Temp max: ${dati.temperatura.max}°`
  );
}

export function ottieniUrlImmagine(
  parteGiorno: ParteGiorno,
  timeMs: string
): string {
  const base = "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_";
  const suffix = parteGiorno === "mattina" ? "M" : parteGiorno === "pomeriggio" ? "P" : "S";
  return `${base}${suffix}.jpg?v=${timeMs}`;
}
