import type { RisultatoAllertaCalore, LivelloCalore } from "../types/index.js";

const CSV_URL = "https://raw.githubusercontent.com/ondata/ondate-calore/main/data/ondate-calore_latest.csv";

export interface HeatWaveService {
  fetchAllertaCalore(oggi?: Date, url?: string): Promise<RisultatoAllertaCalore>;
}

export function createHeatWaveService(): HeatWaveService {
  function oggiDomaniISO(ref: Date) {
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    const oggi = fmt(ref);
    const domani = fmt(new Date(ref.getTime() + 86400000));
    return { oggi, domani };
  }

  function parseLivello(s: string): number {
    switch (s) {
      case "Livello0": return 0;
      case "Livello1": return 1;
      case "Livello2": return 2;
      case "Livello3": return 3;
      default: return -1;
    }
  }

  return {
    fetchAllertaCalore: async (oggiDate?: Date, overrideUrl?: string): Promise<RisultatoAllertaCalore> => {
      try {
        const ref = oggiDate ?? new Date();
        const url = overrideUrl ?? CSV_URL;
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`Errore HTTP ${res.status} nel fetch del CSV ondata calore`);
          return { errore: true };
        }
        const text = await res.text();
        const lines = text.split("\n").filter(Boolean);
        if (lines.length < 2) {
          return { errore: false, dataEstrazione: "", oggi: null, domani: null };
        }

        const { oggi, domani } = oggiDomaniISO(ref);
        let oggiFound: { livello: LivelloCalore; url: string } | null = null;
        let domaniFound: { livello: LivelloCalore; url: string } | null = null;
        let dataEstrazione = "";

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 5) continue;
          const citta = cols[0].trim();
          const data = cols[1].trim();
          const livelloStr = cols[2].trim();
          const estrazione = cols[3].trim();
          const pdfUrl = cols[4].trim();

          if (citta !== "FIRENZE") continue;
          if (!dataEstrazione) dataEstrazione = estrazione;

          const livello = parseLivello(livelloStr);
          if (livello === -1) continue;

          if (data === oggi) {
            oggiFound = { livello: livello as LivelloCalore, url: pdfUrl };
          } else if (data === domani) {
            domaniFound = { livello: livello as LivelloCalore, url: pdfUrl };
          }
        }

        return { errore: false, dataEstrazione, oggi: oggiFound, domani: domaniFound };
      } catch (err) {
        console.error("Errore fetch/parse CSV ondata calore", err);
        return { errore: true };
      }
    },
  };
}
