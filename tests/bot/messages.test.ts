import { describe, it, expect } from "vitest";
import { InputMediaBuilder } from "grammy";
import {
  messages,
  ottieniUrlImmagine,
  costruisciAlbumImmagini,
} from "../../src/bot/messages.js";
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
  uv: 3,
  quotaNeve: 1800,
  umidita: 45,
  probabilitaPioggia: 10,
  alba: "05:30",
  tramonto: "21:00",
  parteGiorno: "mattina",
};

const datiNessunaAllerta: DatiMeteo = {
  comune: "Firenze",
  aggiornamento: "22/06/2026 12:00",
  allerta: "nessuno",
  rischi: {
    idraulico: "nessuno",
    idrogeologico: "nessuno",
    temporali: "nessuno",
    vento: "nessuno",
    neve: "nessuno",
    ghiaccio: "nessuno",
  },
  temperatura: { min: 15, max: 28 },
  temperaturaAttuale: 22,
  temperaturaPercepita: 21,
  uv: 3,
  quotaNeve: 1800,
  umidita: 45,
  probabilitaPioggia: 10,
  alba: "05:30",
  tramonto: "21:00",
  parteGiorno: "mattina",
};

const datiConDomani: DatiMeteo = {
  ...datiFixture,
  allertaDomani: "ARANCIONE",
  rischiDomani: {
    idraulico: "MODERATO",
    idrogeologico: "ELEVATO",
    temporali: "ASSENTE",
    vento: "BASSO",
    neve: "ASSENTE",
    ghiaccio: "ASSENTE",
  },
  nomeGiornoDomani: "Sabato",
};

const datiNessunaAllertaConDomani: DatiMeteo = {
  ...datiNessunaAllerta,
  allertaDomani: "ARANCIONE",
  rischiDomani: {
    idraulico: "MODERATO",
    idrogeologico: "ELEVATO",
    temporali: "ASSENTE",
    vento: "BASSO",
    neve: "ASSENTE",
    ghiaccio: "ASSENTE",
  },
  nomeGiornoDomani: "Sabato",
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

  it("quando allerta = nessuno, non mostra rischi e mostra messaggio", () => {
    const msg = messages.allerta(datiNessunaAllerta);
    expect(msg).toContain("nessuno");
    expect(msg).toContain("Nessuna allerta in corso");
    expect(msg).not.toContain("Idraulico:");
    expect(msg).not.toContain("Idrogeologico:");
    expect(msg).not.toContain("Temporali:");
    expect(msg).not.toContain("Vento:");
    expect(msg).not.toContain("Neve:");
    expect(msg).not.toContain("Ghiaccio:");
  });

  it("include previsioni per domani quando presenti", () => {
    const msg = messages.allerta(datiConDomani);
    expect(msg).toContain("Previsioni per Sabato");
    expect(msg).toContain("<b>ARANCIONE</b>");
    expect(msg).toContain("Idrogeologico: ELEVATO");
  });

  it("NON include previsioni per domani quando assenti", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).not.toContain("Previsioni per");
  });

  it("include previsioni per domani anche quando oggi non ha allerta", () => {
    const msg = messages.allerta(datiNessunaAllertaConDomani);
    expect(msg).toContain("Previsioni per Sabato");
    expect(msg).toContain("<b>ARANCIONE</b>");
    expect(msg).toContain("Nessuna allerta in corso");
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

  it("include link bollettino del giorno", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).toContain("Bollettino del giorno");
    expect(msg).toContain("https://www.lamma.toscana.it/previ/ita/bollettino.pdf");
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

  it("include link bollettino del giorno", () => {
    const msg = messages.completo(datiFixture);
    expect(msg).toContain("Bollettino del giorno");
    expect(msg).toContain("https://www.lamma.toscana.it/previ/ita/bollettino.pdf");
  });

  it("quando allerta = nessuno, non mostra rischi ma mantiene previsioni", () => {
    const msg = messages.completo(datiNessunaAllerta);
    expect(msg).toContain("nessuno");
    expect(msg).toContain("Previsioni");
    expect(msg).toContain("Temperatura: 22°");
    expect(msg).not.toContain("Idraulico:");
    expect(msg).not.toContain("Idrogeologico:");
    expect(msg).not.toContain("Temporali:");
    expect(msg).not.toContain("Vento:");
    expect(msg).not.toContain("Neve:");
    expect(msg).not.toContain("Ghiaccio:");
  });

  it("completo include previsioni per domani quando presenti", () => {
    const msg = messages.completo(datiConDomani);
    expect(msg).toContain("Previsioni per Sabato");
    expect(msg).toContain("<b>ARANCIONE</b>");
  });

  it("completo NON include previsioni per domani quando assenti", () => {
    const msg = messages.completo(datiFixture);
    expect(msg).not.toContain("Previsioni per");
  });
});

describe("ottieniUrlImmagine", () => {
  it("dovrebbe restituire l'URL per oggi mattina", () => {
    const url = ottieniUrlImmagine(1, "mattina");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_M.jpg",
    );
  });

  it("dovrebbe restituire l'URL per oggi pomeriggio", () => {
    const url = ottieniUrlImmagine(1, "pomeriggio");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_P.jpg",
    );
  });

  it("dovrebbe restituire l'URL per oggi sera", () => {
    const url = ottieniUrlImmagine(1, "sera");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_1_S.jpg",
    );
  });

  it("dovrebbe restituire l'URL per domani mattina", () => {
    const url = ottieniUrlImmagine(2, "mattina");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_2_M.jpg",
    );
  });

  it("dovrebbe restituire l'URL per dopodomani sera", () => {
    const url = ottieniUrlImmagine(3, "sera");
    expect(url).toBe(
      "https://www.lamma.toscana.it/previ/ita/immagini/image_3_S.jpg",
    );
  });
});

describe("costruisciAlbumImmagini", () => {
  it("dovrebbe restituire 9 InputMediaPhoto", () => {
    const album = costruisciAlbumImmagini();
    expect(album).toHaveLength(9);
  });

  it("dovrebbe contenere URL per tutte le combinazioni giorno/fascia", () => {
    const album = costruisciAlbumImmagini();
    const urls = album.map((m) => m.media);

    expect(urls[0]).toContain("image_1_M.jpg");
    expect(urls[1]).toContain("image_1_P.jpg");
    expect(urls[2]).toContain("image_1_S.jpg");
    expect(urls[3]).toContain("image_2_M.jpg");
    expect(urls[4]).toContain("image_2_P.jpg");
    expect(urls[5]).toContain("image_2_S.jpg");
    expect(urls[6]).toContain("image_3_M.jpg");
    expect(urls[7]).toContain("image_3_P.jpg");
    expect(urls[8]).toContain("image_3_S.jpg");
  });

  it("tutti gli elementi dovrebbero essere di tipo photo", () => {
    const album = costruisciAlbumImmagini();
    for (const media of album) {
      expect(media.type).toBe("photo");
    }
  });
});
