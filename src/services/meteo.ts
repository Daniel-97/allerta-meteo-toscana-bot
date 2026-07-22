import { XMLParser } from "fast-xml-parser";
import type {
  DatiMeteo,
  LivelloAllerta,
  LivelloRischio,
  ParteGiorno,
} from "../types/index.js";

/**
 * Calcola di quanti giorni il file XML è indietro rispetto alla data attuale.
 *
 * Esempio: se il file è stato aggiornato ieri, restituisce 1, quindi
 * idday=2 diventa "oggi" e idday=3 diventa "domani".
 *
 * @param aggiornamento stringa nel formato "dd/MM/yyyy HH:mm"
 * @param oggi data di riferimento (default: new Date()) — parametrizzabile per test
 * @returns offset in giorni (0 = file aggiornato oggi, 1 = ieri, ecc.)
 */
export function calcolaOffsetGiorni(
  aggiornamento: string,
  oggi?: Date,
): number {
  if (!aggiornamento) return 0;

  // Parse "dd/MM/yyyy HH:mm"
  const parts = aggiornamento.split(" ");
  if (parts.length < 1) return 0;

  const datePart = parts[0];
  const dateSegments = datePart.split("/");
  if (dateSegments.length !== 3) return 0;

  const day = Number(dateSegments[0]);
  const month = Number(dateSegments[1]);
  const year = Number(dateSegments[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;

  const ref = oggi ?? new Date();
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const oggiStr = fmt(ref);
  const aggStr = fmt(new Date(year, month - 1, day));

  const oggiDate = new Date(oggiStr + "T00:00:00");
  const aggDate = new Date(aggStr + "T00:00:00");

  const diffMs = oggiDate.getTime() - aggDate.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  return Math.max(0, diffDays);
}

export interface MeteoService {
  fetchDatiMeteo(comuneUrl: string, oggi?: Date): Promise<DatiMeteo>;
}

export function createMeteoService(): MeteoService {
  const parser = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "_",
    ignoreAttributes: false,
    isArray: (name) => ["previsione", "rischio", "temp"].includes(name),
  });

  function calcolaParteGiorno(): ParteGiorno {
    const h = parseInt(
      new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "numeric", hourCycle: "h23" }).format(new Date()),
      10,
    );
    if (h >= 0 && h < 6) return "mattina";
    if (h >= 6 && h < 9) return "mattina";
    if (h >= 9 && h < 12) return "mattina2";
    if (h >= 12 && h < 15) return "pomeriggio";
    if (h >= 15 && h < 18) return "pomeriggio2";
    if (h >= 18 && h < 21) return "sera";
    return "sera2";
  }

  return {
    fetchDatiMeteo: async (comuneUrl, oggi) => {
      const url = `https://www.lamma.toscana.it/previ/ita/xml/comuni_web/dati/${comuneUrl}.xml`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Errore HTTP ${res.status} per il comune "${comuneUrl}"`
        );
      }
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const root = parsed.dati;

      if (!root || !root.previsione || root.previsione.length === 0) {
        throw new Error(
          `XML LAMMA malformato per il comune "${comuneUrl}": dati mancanti`
        );
      }

      const parteGiorno = calcolaParteGiorno();
      const previsioni = root.previsione;
      const offset = calcolaOffsetGiorni(String(root.aggiornamento ?? ""), oggi);
      const idOggi = String(1 + offset);
      const idDomani = String(2 + offset);

      const findPrev = (ora: string, idday?: string) => {
        if (idday) {
          return previsioni.find(
            (p: { ora: string; idday: string }) => p.ora === ora && p.idday === idday,
          );
        }
        return previsioni.find((p: { ora: string }) => p.ora === ora);
      };

      const giornoPrev = findPrev("giorno", idOggi) ?? findPrev("giorno") ?? previsioni[0];
      const subPrev = findPrev(parteGiorno, idOggi) ?? findPrev(parteGiorno);
      const giorno2 = offset === 0
        ? findPrev("giorno", "2")
        : findPrev("giorno", idDomani);

      return {
        comune: String(root.comune ?? ""),
        aggiornamento: String(root.aggiornamento ?? ""),
        allerta: String(
          giornoPrev?.allerta?.value ?? ""
        ) as LivelloAllerta,
        rischi: {
          idraulico: String(
            giornoPrev?.rischio?.[0]?.value ?? ""
          ) as LivelloRischio,
          idrogeologico: String(
            giornoPrev?.rischio?.[1]?.value ?? ""
          ) as LivelloRischio,
          temporali: String(
            giornoPrev?.rischio?.[2]?.value ?? ""
          ) as LivelloRischio,
          vento: String(
            giornoPrev?.rischio?.[3]?.value ?? ""
          ) as LivelloRischio,
          neve: String(
            giornoPrev?.rischio?.[4]?.value ?? ""
          ) as LivelloRischio,
          ghiaccio: String(
            giornoPrev?.rischio?.[5]?.value ?? ""
          ) as LivelloRischio,
        },
        temperatura: {
          min: Number(giornoPrev?.temp?.[0]?._ ?? 0),
          max: Number(giornoPrev?.temp?.[1]?._ ?? 0),
        },
        temperaturaAttuale: Number(subPrev?.temp?.[0]?._ ?? 0),
        temperaturaPercepita: Number(subPrev?.temp?.[1]?._ ?? 0),
        uv: Number(subPrev?.uv ?? 0),
        quotaNeve: Number(subPrev?.quota_neve ?? 0),
        umidita: Number(subPrev?.um ?? 0),
        probabilitaPioggia: Number(subPrev?.prob_rain ?? 0),
        alba: String(root.almanacco?.sole_sorge ?? ""),
        tramonto: String(root.almanacco?.sole_tramonta ?? ""),
        parteGiorno,
        allertaDomani: (giorno2?.allerta?.value && giorno2.allerta.value !== "NA")
          ? String(giorno2.allerta.value) as LivelloAllerta
          : undefined,
        rischiDomani: (giorno2?.rischio && giorno2.allerta?.value !== "NA")
          ? {
              idraulico: String(giorno2.rischio?.[0]?.value ?? "") as LivelloRischio,
              idrogeologico: String(giorno2.rischio?.[1]?.value ?? "") as LivelloRischio,
              temporali: String(giorno2.rischio?.[2]?.value ?? "") as LivelloRischio,
              vento: String(giorno2.rischio?.[3]?.value ?? "") as LivelloRischio,
              neve: String(giorno2.rischio?.[4]?.value ?? "") as LivelloRischio,
              ghiaccio: String(giorno2.rischio?.[5]?.value ?? "") as LivelloRischio,
            }
          : undefined,
        nomeGiornoDomani: giorno2?.datadescr
          ? String(giorno2.datadescr)
          : undefined,
      };
    },
  };
}
