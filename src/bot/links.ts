export const LINKS = {
  mappeAllerta: "https://www.regione.toscana.it/allertameteo",
  cosaFare: "https://www.regione.toscana.it/allertameteo/rischi-e-norme-di-comportamento",
  meteoToscana: "https://www.lamma.toscana.it/meteo/bollettini-meteo/toscana",
  meteoComune: (url: string) => `https://www.lamma.toscana.it/meteo/meteo-${url}`,
  cosaFareCalore: "https://www.salute.gov.it/new/it/tema/ondate-di-calore/livelli-di-rischio-cosa-fare/",
};

export const RISORSE: Array<{ text: string; url: string }> = [
  { text: "⚡ Fulminazioni (tempo reale)", url: "https://map.blitzortung.org/#5.26/41.709/13.462" },
  { text: "📡 Radar meteo", url: "https://www.lamma.toscana.it/meteo/osservazioni-e-dati/radar" },
  { text: "🌡️ Temperature stazioni", url: "https://www.lamma.toscana.it/meteo/osservazioni-e-dati/temperature-tempo-reale" },
];
