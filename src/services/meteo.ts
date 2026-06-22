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
    isArray: (name) => ["previsione", "rischio"].includes(name),
  });

  function calcolaParteGiorno(): ParteGiorno {
    const h = new Date().getHours();
    if (h >= 1 && h < 13) return "mattina";
    if (h >= 13 && h <= 19) return "pomeriggio";
    return "sera";
  }

  return {
    fetchDatiMeteo: async (comuneUrl) => {
      const url = `http://www.lamma.rete.toscana.it/previ/ita/xml/comuni_web/dati/${comuneUrl}`;
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
      const idx = parteGiorno === "mattina" ? 1 : parteGiorno === "pomeriggio" ? 2 : 3;

      return {
        comune: String(root.comune ?? ""),
        aggiornamento: String(root.aggiornamento ?? ""),
        allerta: String(
          root.previsione[0]?.allerta?.value ?? ""
        ) as LivelloAllerta,
        rischi: {
          idraulico: String(
            root.previsione[0]?.rischio?.[0]?.value ?? ""
          ) as LivelloRischio,
          idrogeologico: String(
            root.previsione[0]?.rischio?.[1]?.value ?? ""
          ) as LivelloRischio,
          temporali: String(
            root.previsione[0]?.rischio?.[2]?.value ?? ""
          ) as LivelloRischio,
          vento: String(
            root.previsione[0]?.rischio?.[3]?.value ?? ""
          ) as LivelloRischio,
          neve: String(
            root.previsione[0]?.rischio?.[4]?.value ?? ""
          ) as LivelloRischio,
          ghiaccio: String(
            root.previsione[0]?.rischio?.[5]?.value ?? ""
          ) as LivelloRischio,
        },
        temperatura: {
          min: Number(root.previsione[0]?.temp?.[0] ?? 0),
          max: Number(root.previsione[0]?.temp?.[1] ?? 0),
        },
        temperaturaAttuale: Number(root.previsione[idx]?.temp?.[0] ?? 0),
        temperaturaPercepita: Number(root.previsione[idx]?.temp?.[1] ?? 0),
        umidita: Number(root.previsione[idx]?.um ?? 0),
        probabilitaPioggia: Number(root.previsione[idx]?.prob_rain ?? 0),
        alba: String(root.almanacco?.sole_sorge ?? ""),
        tramonto: String(root.almanacco?.sole_tramonta ?? ""),
        parteGiorno,
      };
    },
  };
}
