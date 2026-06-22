import { describe, it, expect } from "vitest";
import {
  formattaAllerta,
  formattaPrevisioni,
  formattaCompleto,
  ottieniUrlImmagine,
} from "../../src/services/messaggi.js";
import type { DatiMeteo } from "../../src/types/index.js";

const datiFixture: DatiMeteo = {
  comune: "Firenze",
  aggiornamento: "22/06/2026 12:00",
  allerta: "GIALLO",
  rischi: {
    idraulico: "MODERATO",
    idrogeologico: "BASSO",
    temporali: "ASSENTE",
    vento: "ELEVATO",
    neve: "ASSENTE",
    ghiaccio: "ASSENTE",
  },
  temperatura: { min: 15, max: 28 },
  temperaturaAttuale: 22,
  temperaturaPercepita: 21,
  umidita: 45,
  probabilitaPioggia: 10,
  alba: "05:30",
  tramonto: "21:00",
  parteGiorno: "mattina",
};

describe("formattaAllerta", () => {
  it("include comune e aggiornamento", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).toContain("Firenze");
    expect(msg).toContain("22/06/2026");
  });

  it("include livello allerta", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).toContain("Allerta: GIALLO");
  });

  it("include tutti i 6 rischi", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).toContain("Rischio idraulico: MODERATO");
    expect(msg).toContain("Rischio idrogeologico: BASSO");
    expect(msg).toContain("Rischio temporali: ASSENTE");
    expect(msg).toContain("Rischio vento: ELEVATO");
    expect(msg).toContain("Rischio neve: ASSENTE");
    expect(msg).toContain("Rischio ghiaccio: ASSENTE");
  });

  it("NON include informazioni meteo", () => {
    const msg = formattaAllerta(datiFixture);
    expect(msg).not.toContain("Temperatura");
    expect(msg).not.toContain("Umidita");
  });
});

describe("formattaPrevisioni", () => {
  it("include dati meteo base", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).toContain("Firenze");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidita': 45%");
    expect(msg).toContain("Probabilita' pioggia: 10%");
  });

  it("include alba e tramonto", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).toContain("Sole sorge: 05:30");
    expect(msg).toContain("Sole tramonta: 21:00");
  });

  it("include temperature attuale e percepita", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).toContain("Temperatura: 22°");
    expect(msg).toContain("Temperatura percepita: 21°");
  });

  it("NON include rischi", () => {
    const msg = formattaPrevisioni(datiFixture);
    expect(msg).not.toContain("Allerta:");
    expect(msg).not.toContain("Rischio idraulico");
  });
});

describe("formattaCompleto", () => {
  it("include allerta e previsioni", () => {
    const msg = formattaCompleto(datiFixture);
    expect(msg).toContain("Allerta: GIALLO");
    expect(msg).toContain("Rischio idraulico: MODERATO");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidita': 45%");
    expect(msg).toContain("Temperatura: 22°");
  });
});

describe("ottieniUrlImmagine", () => {
  it("ritorna URL corretto per mattina", () => {
    const url = ottieniUrlImmagine("mattina", "12345");
    expect(url).toBe(
      "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_M.jpg?v=12345"
    );
  });

  it("ritorna URL corretto per pomeriggio", () => {
    const url = ottieniUrlImmagine("pomeriggio", "67890");
    expect(url).toContain("image_1_P.jpg?v=67890");
  });

  it("ritorna URL corretto per sera", () => {
    const url = ottieniUrlImmagine("sera", "00000");
    expect(url).toContain("image_1_S.jpg?v=00000");
  });
});
