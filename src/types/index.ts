export interface Comune {
  nome: string;
  url: string;
}

export type ParteGiorno = "mattina" | "mattina2" | "pomeriggio" | "pomeriggio2" | "sera" | "sera2";

export type LivelloAllerta =
  | "basso"
  | "moderato"
  | "elevato"
  | "molto elevato"
  | "nessuno"
  | "NA";

export type LivelloAllertaReale = Exclude<LivelloAllerta, "nessuno" | "NA">;

export type LivelloRischio =
  | "basso"
  | "moderato"
  | "elevato"
  | "molto elevato"
  | "nessuno"
  | "NA"
  | string;

export interface DatiMeteo {
  comune: string;
  aggiornamento: string;
  allerta: LivelloAllerta;
  rischi: {
    idraulico: LivelloRischio;
    idrogeologico: LivelloRischio;
    temporali: LivelloRischio;
    vento: LivelloRischio;
    neve: LivelloRischio;
    ghiaccio: LivelloRischio;
  };
  temperatura: { min: number; max: number };
  temperaturaAttuale: number;
  temperaturaPercepita: number;
  umidita: number;
  probabilitaPioggia: number;
  uv: number;
  quotaNeve: number;
  alba: string;
  tramonto: string;
  parteGiorno: ParteGiorno;
  allertaDomani?: LivelloAllerta;
  rischiDomani?: {
    idraulico: LivelloRischio;
    idrogeologico: LivelloRischio;
    temporali: LivelloRischio;
    vento: LivelloRischio;
    neve: LivelloRischio;
    ghiaccio: LivelloRischio;
  };
  nomeGiornoDomani?: string;
}

export type ModalitaInvio = "allerta" | "previsioni" | "allertaprevisioni";

export type LivelloCalore = 0 | 1 | 2 | 3;
// 0=Verde(nessuna), 1=Gialla, 2=Arancione, 3=Rossa

export type RisultatoAllertaCalore =
  | {
      errore: false;
      dataEstrazione: string;
      oggi: { livello: LivelloCalore; url: string } | null;
      domani: { livello: LivelloCalore; url: string } | null;
    }
  | { errore: true; dettaglioErrore?: string };
