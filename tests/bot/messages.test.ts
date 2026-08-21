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
  emojiAllerta,
  formatRischi,
  fingerprintMeteo,
  fingerprintCalore,
  isStessoGiornoIt,
} from "../../src/bot/messages.js";
import type { DatiMeteo, RisultatoAllertaCalore } from "../../src/types/index.js";

const datiFixture: DatiMeteo = {
  comune: "Firenze",
  aggiornamento: "22/06/2026 12:00",
  allerta: "basso",
  rischi: {
    idraulico: "medio",
    idrogeologico: "basso",
    temporali: "nessuno",
    vento: "elevato",
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
  allertaDomani: "medio",
  rischiDomani: {
    idraulico: "medio",
    idrogeologico: "elevato",
    temporali: "nessuno",
    vento: "basso",
    neve: "nessuno",
    ghiaccio: "nessuno",
  },
  nomeGiornoDomani: "Sabato",
};

const datiNessunaAllertaConDomani: DatiMeteo = {
  ...datiNessunaAllerta,
  allertaDomani: "medio",
  rischiDomani: {
    idraulico: "medio",
    idrogeologico: "elevato",
    temporali: "nessuno",
    vento: "basso",
    neve: "nessuno",
    ghiaccio: "nessuno",
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
    expect(msg).toContain("basso");
  });

  it("include solo rischi attivi", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).toContain("Idraulico: medio");
    expect(msg).toContain("Idrogeologico: basso");
    expect(msg).toContain("Vento: elevato");
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
    expect(msg).toContain("<b>medio</b>");
    expect(msg).toContain("Idrogeologico: elevato");
  });

  it("NON include previsioni per domani quando assenti", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg).not.toContain("Previsioni per");
  });

  it("include previsioni per domani anche quando oggi non ha allerta", () => {
    const msg = messages.allerta(datiNessunaAllertaConDomani);
    expect(msg).toContain("Previsioni per Sabato");
    expect(msg).toContain("<b>medio</b>");
    expect(msg).toContain("Nessuna allerta in corso");
  });

  it("termina con la riga Aggiornamento", () => {
    const msg = messages.allerta(datiFixture);
    expect(msg.endsWith("<i>Aggiornamento: 22/06/2026 12:00</i>")).toBe(true);
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

  it("non include link bollettino del giorno nel testo", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).not.toContain("Bollettino del giorno");
  });

  it("NON include rischi", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg).not.toContain("Allerta");
    expect(msg).not.toContain("Idraulico");
  });

  it("termina con la riga Aggiornamento", () => {
    const msg = messages.previsioni(datiFixture);
    expect(msg.endsWith("<i>Aggiornamento: 22/06/2026 12:00</i>")).toBe(true);
  });
});

describe("messages.completo", () => {
  it("include allerta e previsioni", () => {
    const msg = messages.completo(datiFixture);
    expect(msg).toContain("Allerta: basso");
    expect(msg).toContain("Idraulico: medio");
    expect(msg).toContain("Idrogeologico: basso");
    expect(msg).toContain("Vento: elevato");
    expect(msg).not.toContain("Temporali:");
    expect(msg).not.toContain("Neve:");
    expect(msg).not.toContain("Ghiaccio:");
    expect(msg).toContain("mattina");
    expect(msg).toContain("Umidità: 45%");
    expect(msg).toContain("Temperatura: 22°");
  });

  it("non include link bollettino del giorno nel testo", () => {
    const msg = messages.completo(datiFixture);
    expect(msg).not.toContain("Bollettino del giorno");
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
    expect(msg).toContain("<b>medio</b>");
  });

  it("completo NON include previsioni per domani quando assenti", () => {
    const msg = messages.completo(datiFixture);
    expect(msg).not.toContain("Previsioni per");
  });

  it("termina con la riga Aggiornamento", () => {
    const msg = messages.completo(datiFixture);
    expect(msg.endsWith("<i>Aggiornamento: 22/06/2026 12:00</i>")).toBe(true);
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
    expect(msg).not.toContain("Bollettino calore");
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

  it("termina con la riga Aggiornamento", () => {
    const msg = messaggioCalore(rAlert);
    expect(msg!.endsWith("<i>Aggiornamento: 2026-06-25</i>")).toBe(true);
  });
});

describe("haAllertaMeteo", () => {
  it("allerta=basso → true", () => {
    expect(haAllertaMeteo(datiFixture)).toBe(true);
  });

  it("allerta=nessuno senza domani → false", () => {
    expect(haAllertaMeteo(datiNessunaAllerta)).toBe(false);
  });

  it("allerta=nessuno con domani medio → true", () => {
    expect(haAllertaMeteo(datiNessunaAllertaConDomani)).toBe(true);
  });

  it("allerta=nessuno con domani basso → true (bug cron mattutino: oggi nello slot domani del bollettino stale)", () => {
    const datiStale: DatiMeteo = {
      ...datiNessunaAllerta,
      allertaDomani: "basso",
      rischiDomani: {
        idraulico: "nessuno",
        idrogeologico: "nessuno",
        temporali: "basso",
        vento: "nessuno",
        neve: "nessuno",
        ghiaccio: "nessuno",
      },
      nomeGiornoDomani: "Martedì",
    };
    expect(haAllertaMeteo(datiStale)).toBe(true);
  });

  it("allerta=nessuno con domani NA → false", () => {
    const dati: DatiMeteo = { ...datiNessunaAllerta, allertaDomani: undefined };
    expect(haAllertaMeteo(dati)).toBe(false);
  });

  it("allerta=medio → true", () => {
    expect(haAllertaMeteo({ ...datiFixture, allerta: "medio" })).toBe(true);
  });

  it("allerta=catastrofico (vocabolo sconosciuto) → true", () => {
    expect(haAllertaMeteo({ ...datiFixture, allerta: "catastrofico" })).toBe(true);
  });
});

describe("emojiAllerta", () => {
  it("mappa i livelli noti", () => {
    expect(emojiAllerta("basso")).toBe("🟡");
    expect(emojiAllerta("medio")).toBe("🟠");
    expect(emojiAllerta("elevato")).toBe("🔴");
    expect(emojiAllerta("nessuno")).toBe("🟢");
  });

  it("default 🟠 per livelli positivi sconosciuti", () => {
    expect(emojiAllerta("catastrofico")).toBe("🟠");
  });

  it("NA, vuoto e undefined → ⚪", () => {
    expect(emojiAllerta("NA")).toBe("⚪");
    expect(emojiAllerta("")).toBe("⚪");
    expect(emojiAllerta(undefined)).toBe("⚪");
  });
});

describe("messages.allerta con livello sconosciuto", () => {
  it("mostra default emoji e i rischi, non 'Nessuna allerta'", () => {
    const dati: DatiMeteo = {
      ...datiFixture,
      allerta: "catastrofico",
      rischi: { ...datiFixture.rischi, temporali: "catastrofico" },
    };
    const msg = messages.allerta(dati);
    expect(msg).toContain("🟠");
    expect(msg).toContain("Temporali: catastrofico");
    expect(msg).not.toContain("Nessuna allerta in corso");
  });
});

describe("formatRischi", () => {
  const baseRischi = {
    idraulico: "nessuno" as const,
    idrogeologico: "nessuno" as const,
    temporali: "nessuno" as const,
    vento: "nessuno" as const,
    neve: "nessuno" as const,
    ghiaccio: "nessuno" as const,
  };

  it("restituisce null se tutti i rischi sono assenti", () => {
    expect(formatRischi(baseRischi)).toBeNull();
  });

  it("filtra nessuno, NA e stringa vuota e mostra solo quelli attivi", () => {
    const rischi = { ...baseRischi, idrogeologico: "medio", vento: "basso" };
    const result = formatRischi(rischi);
    expect(result).toBe("⛰️ Idrogeologico: medio\n💨 Vento: basso");
  });

  it("filtra stringa vuota", () => {
    const rischi = { ...baseRischi, idraulico: "" };
    const result = formatRischi(rischi);
    expect(result).toBeNull();
  });

  it("filtra NA", () => {
    const rischi = { ...baseRischi, idrogeologico: "NA" };
    const result = formatRischi(rischi);
    expect(result).toBeNull();
  });

  it("mostra tutti i rischi se tutti sono attivi", () => {
    const rischi = {
      idraulico: "medio",
      idrogeologico: "elevato",
      temporali: "basso",
      vento: "molto elevato",
      neve: "basso",
      ghiaccio: "medio",
    };
    const result = formatRischi(rischi);
    expect(result).toContain("💧 Idraulico: medio");
    expect(result).toContain("⛰️ Idrogeologico: elevato");
    expect(result).toContain("⚡ Temporali: basso");
    expect(result).toContain("💨 Vento: molto elevato");
    expect(result).toContain("❄️ Neve: basso");
    expect(result).toContain("🧊 Ghiaccio: medio");
  });
});

describe("messages.nessunaAllerta", () => {
  it("contiene il testo atteso", () => {
    expect(messages.nessunaAllerta).toBe(
      "ℹ️ Nessuna allerta in corso o prevista per i prossimi giorni."
    );
  });
});

describe("fingerprintMeteo", () => {
  const baseDati: DatiMeteo = {
    comune: "Firenze",
    aggiornamento: "01/07/2026",
    allerta: "basso",
    rischi: {
      idraulico: "nessuno", idrogeologico: "nessuno", temporali: "nessuno",
      vento: "nessuno", neve: "nessuno", ghiaccio: "nessuno",
    },
    temperatura: { min: 10, max: 20 },
    temperaturaAttuale: 15, temperaturaPercepita: 14,
    umidita: 50, probabilitaPioggia: 0, uv: 4, quotaNeve: 2000,
    alba: "06:00", tramonto: "18:00", parteGiorno: "mattina",
  };

  it("include allerta e 6 rischi oggi", () => {
    const fp = fingerprintMeteo(baseDati);
    expect(fp).toContain("basso");
    expect(fp).toContain("nessuno");
  });

  it("include allertaDomani e rischiDomani se presenti", () => {
    const dati = {
      ...baseDati,
      allertaDomani: "basso" as const,
      rischiDomani: {
        idraulico: "medio", idrogeologico: "nessuno", temporali: "nessuno",
        vento: "nessuno", neve: "nessuno", ghiaccio: "nessuno",
      },
      nomeGiornoDomani: "Martedì",
    };
    const fp = fingerprintMeteo(dati);
    expect(fp).toContain("basso");
    expect(fp).toContain("medio");
  });

  it("non include domani se absent", () => {
    const fp = fingerprintMeteo(baseDati);
    expect(fp).toContain("||");
  });
});

describe("fingerprintCalore", () => {
  it("restituisce livelli oggi|domani", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-07-01",
      oggi: { livello: 2, url: "https://example.com/bol.pdf" },
      domani: { livello: 1, url: "https://example.com/bol.pdf" },
    };
    expect(fingerprintCalore(r)).toBe("2|1");
  });

  it("gestisce oggi nullo", () => {
    const r: RisultatoAllertaCalore = {
      errore: false, dataEstrazione: "2026-07-01",
      oggi: null, domani: { livello: 1, url: "" },
    };
    expect(fingerprintCalore(r)).toBe("|1");
  });

  it("restituisce __errore__ se fetch fallito", () => {
    const r: RisultatoAllertaCalore = { errore: true };
    expect(fingerprintCalore(r)).toBe("__errore__");
  });
});

describe("isStessoGiornoIt", () => {
  it("restituisce true per oggi", () => {
    expect(isStessoGiornoIt(new Date())).toBe(true);
  });

  it("restituisce false per ieri", () => {
    const ieri = new Date();
    ieri.setDate(ieri.getDate() - 1);
    expect(isStessoGiornoIt(ieri)).toBe(false);
  });
});
