export interface Comune {
  nome: string;
  url: string;
}

export type ParteGiorno = "mattina" | "pomeriggio" | "sera";

export type LivelloAllerta = "VERDE" | "GIALLO" | "ARANCIONE" | "ROSSO" | "nessuno";

export type LivelloRischio =
  | "ASSENTE"
  | "BASSO"
  | "MODERATO"
  | "ELEVATO"
  | "MOLTO ELEVATO"
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
}

export type ModalitaInvio = "allerta" | "previsioni" | "allertaprevisioni";
