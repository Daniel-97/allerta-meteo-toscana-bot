import { describe, it, expect } from "vitest";
import { InputMediaBuilder } from "grammy";
import {
  messages,
  ottieniUrlImmagine,
  costruisciAlbumImmagini,
  messaggioCalore,
  livelloCaloreToEmoji,
  livelloCaloreToNome,
  haAllertaMeteo,
  formatRischi,
} from "../../src/bot/messages.js";
import type { DatiMeteo, RisultatoAllertaCalore } from "../../src/types/index.js";

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

  it("include solo rischi attivi", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).toContain("Idraulico: MODERATO");
    expect(msg).toContain("Idrogeologico: BASSO");
    expect(msg).toContain("Vento: ELEVATO");
    expect(msg).not.toContain("Temporali:");
    expect(msg).not.toContain("Neve:");
    expect(msg).not.toContain("Ghiaccio:");
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
    expect(msg).toContain("Idrogeologico: BASSO");
    expect(msg).toContain("Vento: ELEVATO");
    expect(msg).not.toContain("Temporali:");
    expect(msg).not.toContain("Neve:");
    expect(msg).not.toContain("Ghiaccio:");
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

describe("livelloCaloreToEmoji", () => {
  it("0→🟢, 1→🟡, 2→🟠, 3→🔴", () => {
    expect(livelloCaloreToEmoji(0)).toBe("🟢");
    expect(livelloCaloreToEmoji(1)).toBe("🟡");
    expect(livelloCaloreToEmoji(2)).toBe("🟠");
    expect(livelloCaloreToEmoji(3)).toBe("🔴");
  });
});

describe("livelloCaloreToNome", () => {
  it("0→Verde, 1→Gialla, 2→Arancione, 3→Rossa", () => {
    expect(livelloCaloreToNome(0)).toBe("Verde");
    expect(livelloCaloreToNome(1)).toBe("Gialla");
    expect(livelloCaloreToNome(2)).toBe("Arancione");
    expect(livelloCaloreToNome(3)).toBe("Rossa");
  });
});

describe("messaggioCalore", () => {
  const rAlert: RisultatoAllertaCalore = {
    errore: false,
    dataEstrazione: "2026-06-25",
    oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
    domani: { livello: 3, url: "https://salute.gov.it/bol.pdf" },
  };

  it("oggi e domani con allerta produce messaggio completo", () => {
    const msg = messaggioCalore(rAlert);
    expect(msg).not.toBeNull();
    expect(msg).toContain("Ondata di calore");
    expect(msg).toContain("Oggi: 🟠 Arancione");
    expect(msg).toContain("Domani: 🔴 Rossa");
    expect(msg).toContain("Bollettino calore");
    expect(msg).toContain("salute.gov.it/bol.pdf");
    expect(msg).toContain("2026-06-25");
  });

  it("solo oggi alert (domani Livello0)", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 2, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
    };
    const msg = messaggioCalore(r);
    expect(msg).not.toBeNull();
    expect(msg).toContain("Oggi: 🟠 Arancione");
    expect(msg).not.toContain("Domani:");
  });

  it("solo domani alert (oggi Livello0)", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 1, url: "https://salute.gov.it/bol.pdf" },
    };
    const msg = messaggioCalore(r);
    expect(msg).not.toBeNull();
    expect(msg).not.toContain("Oggi:");
    expect(msg).toContain("Domani: 🟡 Gialla");
  });

  it("entrambi Livello0 ritorna null", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-06-25",
      oggi: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
      domani: { livello: 0, url: "https://salute.gov.it/bol.pdf" },
    };
    expect(messaggioCalore(r)).toBeNull();
  });

  it("errore: true produce messaggio di avviso", () => {
    const msg = messaggioCalore({ errore: true });
    expect(msg).not.toBeNull();
    expect(msg).toContain("Ondata di calore");
    expect(msg).toContain("non disponibili");
    expect(msg).not.toContain("Bollettino calore");
  });

  it("oggi=null domani=null ritorna null", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "",
      oggi: null, domani: null,
    };
    expect(messaggioCalore(r)).toBeNull();
  });
});

describe("haAllertaMeteo", () => {
  it("allerta=GIALLO → true", () => {
    expect(haAllertaMeteo(datiFixture)).toBe(true);
  });

  it("allerta=nessuno senza domani → false", () => {
    expect(haAllertaMeteo(datiNessunaAllerta)).toBe(false);
  });

  it("allerta=nessuno con domani ARANCIONE → true", () => {
    expect(haAllertaMeteo(datiNessunaAllertaConDomani)).toBe(true);
  });

  it("allerta=VERDE → true (VERDE e' un allerta reale)", () => {
    const datiVerde: DatiMeteo = { ...datiFixture, allerta: "VERDE" };
    expect(haAllertaMeteo(datiVerde)).toBe(true);
  });
});

describe("formatRischi", () => {
  const baseRischi = {
    idraulico: "ASSENTE" as const,
    idrogeologico: "nessuno" as const,
    temporali: "ASSENTE" as const,
    vento: "ASSENTE" as const,
    neve: "ASSENTE" as const,
    ghiaccio: "ASSENTE" as const,
  };

  it("restituisce null se tutti i rischi sono assenti", () => {
    expect(formatRischi(baseRischi)).toBeNull();
  });

  it("filtra ASSENTE e nessuno e mostra solo quelli attivi", () => {
    const rischi = { ...baseRischi, idrogeologico: "MODERATO", vento: "BASSO" };
    const result = formatRischi(rischi);
    expect(result).toBe("⛰️ Idrogeologico: MODERATO\n💨 Vento: BASSO");
  });

  it("filtra stringa vuota", () => {
    const rischi = { ...baseRischi, idraulico: "" };
    const result = formatRischi(rischi);
    expect(result).toBeNull();
  });

  it("mostra tutti i rischi se tutti sono attivi", () => {
    const rischi = {
      idraulico: "MODERATO",
      idrogeologico: "ELEVATO",
      temporali: "BASSO",
      vento: "MOLTO ELEVATO",
      neve: "BASSO",
      ghiaccio: "MODERATO",
    };
    const result = formatRischi(rischi);
    expect(result).toContain("💧 Idraulico: MODERATO");
    expect(result).toContain("⛰️ Idrogeologico: ELEVATO");
    expect(result).toContain("⚡ Temporali: BASSO");
    expect(result).toContain("💨 Vento: MOLTO ELEVATO");
    expect(result).toContain("❄️ Neve: BASSO");
    expect(result).toContain("🧊 Ghiaccio: MODERATO");
  });
});

describe("messages.nessunaAllerta", () => {
  it("contiene il testo atteso", () => {
    expect(messages.nessunaAllerta).toBe(
      "ℹ️ Nessuna allerta in corso o prevista per i prossimi giorni."
    );
  });
});
