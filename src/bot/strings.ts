export const strings = {
  welcome: "Benvenuto/a in Allerta Meteo Toscana Bot!\nSeleziona una voce dal menu o usa i comandi.",
  credits: `Servizio di notifica allerta e previsioni meteo realizzato da @DaniZ97 basato sui dati resi liberamente disponibili a tutti i cittadini dal consorzio LAMMA.`,
  impostaPrompt: "Scrivi il nome del comune (es. /imposta pisa) oppure parte del nome per cercarlo.",
  impostaNonTrovato: "Nessun comune trovato con quel nome. Riprova.",
  impostaConferma: (comune: string) =>
    `Vuoi ricevere anche le informazioni meteo per ${comune} insieme alle notifiche di allerta?`,
  impostaOk: (comune: string) =>
    `Ok! Riceverai notifiche per ${comune}`,
  impostaOkAllerta: (comune: string) =>
    `Ok! Riceverai notifiche per ${comune}. Ti avviserò anche delle condizioni meteo.`,
  nonIscritto: "Non hai ancora impostato un comune. Usa /imposta per iniziare.",
  errore: "Si è verificato un errore. Riprova più tardi.",
};
