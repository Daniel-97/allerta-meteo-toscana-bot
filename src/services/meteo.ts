import { XMLParser } from "fast-xml-parser";
import type {
  DatiMeteo,
  LivelloAllerta,
  LivelloRischio,
  ParteGiorno,
} from "../types/index.js";

export interface MeteoService {
  fetchDatiMeteo(comuneUrl: string): Promise<DatiMeteo>;
}

export function createMeteoService(): MeteoService {
  const parser = new XMLParser({
    attributeNamePrefix: "",
    textNodeName: "_",
    ignoreAttributes: false,
    isArray: (name) => ["previsione", "rischio", "temp"].includes(name),
  });

  function calcolaParteGiorno(): ParteGiorno {
    const h = new Date().getHours();
    if (h >= 1 && h < 13) return "mattina";
    if (h >= 13 && h <= 19) return "pomeriggio";
    return "sera";
  }

  return {
    fetchDatiMeteo: async (comuneUrl) => {
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
      const findPrev = (ora: string) =>
        previsioni.find((p: { ora: string }) => p.ora === ora);
      const giornoPrev = findPrev("giorno") ?? previsioni[0];
      const subPrev = findPrev(parteGiorno);

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
      };
    },
  };
}
