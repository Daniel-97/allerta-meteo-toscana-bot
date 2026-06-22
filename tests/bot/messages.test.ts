import { describe, it, expect } from "vitest";
import { messages, ottieniUrlImmagine } from "../../src/bot/messages.js";
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

describe("messages.allerta", () => {
  it("include comune e aggiornamento", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).toContain("Firenze");
    expect(msg).toContain("22/06/2026");
  });

  it("include livello allerta", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).toContain("GIALLO");
  });

  it("include tutti i 6 rischi", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).toContain("Idraulico: MODERATO");
    expect(msg).toContain("Idrogeologico: BASSO");
    expect(msg).toContain("Temporali: ASSENTE");
    expect(msg).toContain("Vento: ELEVATO");
    expect(msg).toContain("Neve: ASSENTE");
    expect(msg).toContain("Ghiaccio: ASSENTE");
  });

  it("NON include informazioni meteo", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).not.toContain("Temperatura");
    expect(msg).not.toContain("Umidità");
  });
});

describe("messages.previsioni", () => {
  it("include dati meteo base", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).toContain("Firenze");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidità: 45%");
    expect(msg).toContain("Pioggia: 10%");
  });

  it("include alba e tramonto", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).toContain("Alba: 05:30");
    expect(msg).toContain("Tramonto: 21:00");
  });

  it("include temperature attuale e percepita", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).toContain("Temperatura: 22°");
    expect(msg).toContain("Percepita: 21°");
  });

  it("NON include rischi", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).not.toContain("Allerta");
    expect(msg).not.toContain("Idraulico");
  });
});

describe("messages.completo", () => {
  it("include allerta e previsioni", () => {
    const msg = messages.completo(datiFixture);
    expect(msg).toContain("Allerta: GIALLO");
    expect(msg).toContain("Idraulico: MODERATO");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidità: 45%");
    expect(msg).toContain("Temperatura: 22°");
  });
});

describe("ottieniUrlImmagine", () => {
  it("ritorna URL corretto per mattina", () => {
    const url = ottieniUrlImmagine("mattina", "12345");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_M.jpg?v=12345"
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
