import type { RisultatoAllertaCalore, LivelloCalore } from "../types/index.js";

const CSV_URL = "https://raw.githubusercontent.com/ondata/ondate-calore/main/data/ondate-calore_latest.csv";
// raw.githubusercontent.com applica rate limiting per IP sorgente e gli IP in uscita di
// Cloudflare Workers sono condivisi tra migliaia di worker: bastano pochi 429 sporadici
// per il traffico aggregato altrui. jsDelivr rispecchia lo stesso repo GitHub su una CDN
// dedicata che non soffre dello stesso throttling condiviso.
const CSV_URL_FALLBACK = "https://cdn.jsdelivr.net/gh/ondata/ondate-calore@main/data/ondate-calore_latest.csv";

const RETRY_TENTATIVI_PRIMARIO = 3;
const RETRY_TENTATIVI_FALLBACK = 2;
const RETRY_BASE_MS = 300;

function statusRitentabile(status: number): boolean {
  return status === 429 || status >= 500;
}

export interface HeatWaveService {
  fetchAllertaCalore(oggi?: Date, url?: string, urlFallback?: string): Promise<RisultatoAllertaCalore>;
}

export function createHeatWaveService(deps: { sleep?: (ms: number) => Promise<void> } = {}): HeatWaveService {
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  async function fetchConRetry(url: string, tentativiMax: number): Promise<Response> {
    let ultimoErrore: unknown;
    for (let tentativo = 1; tentativo <= tentativiMax; tentativo++) {
      try {
        const res = await fetch(url);
        if (res.ok || !statusRitentabile(res.status)) {
          return res;
        }
        ultimoErrore = new Error(`HTTP ${res.status}`);
      } catch (err) {
        ultimoErrore = err;
      }
      if (tentativo < tentativiMax) {
        await sleep(RETRY_BASE_MS * 2 ** (tentativo - 1));
      }
    }
    throw ultimoErrore;
  }

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
    fetchAllertaCalore: async (
      oggiDate?: Date,
      overrideUrl?: string,
      overrideUrlFallback?: string
    ): Promise<RisultatoAllertaCalore> => {
      try {
        const ref = oggiDate ?? new Date();
        const url = overrideUrl ?? CSV_URL;
        const urlFallback = overrideUrlFallback ?? CSV_URL_FALLBACK;

        let res: Response;
        try {
          res = await fetchConRetry(url, RETRY_TENTATIVI_PRIMARIO);
        } catch (errPrimario) {
          try {
            res = await fetchConRetry(urlFallback, RETRY_TENTATIVI_FALLBACK);
          } catch {
            throw errPrimario;
          }
        }

        if (!res.ok) {
          console.error(`Errore HTTP ${res.status} nel fetch del CSV ondata calore`);
          return { errore: true, dettaglioErrore: `HTTP ${res.status}` };
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
        return { errore: true, dettaglioErrore: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
