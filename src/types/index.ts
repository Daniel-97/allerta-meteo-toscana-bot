export interface Comune {
  nome: string;
  url: string;
  provincia: string;
  zona: string;
}

export type ParteGiorno = "mattina" | "pomeriggio" | "sera";

export type LivelloAllerta = "VERDE" | "GIALLO" | "ARANCIONE" | "ROSSO";

export interface DatiMeteo {
  comune: string;
  aggiornamento: string;
  allerta: LivelloAllerta;
  rischi: {
    idraulico: string;
    idrogeologico: string;
    temporali: string;
    vento: string;
    neve: string;
    ghiaccio: string;
  };
  temperatura: { min: number; max: number };
  umidita: number;
  probabilitaPioggia: number;
  alba: string;
  tramonto: string;
  parteGiorno: ParteGiorno;
}

export type ModalitaInvio = "allerta" | "previsioni" | "allertaprevisioni";
