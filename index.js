"use strict";
// ctx e' l'oggetto del client
/*MODULE REQUIRE*/
const Telegraf = require('telegraf')
const Logger = require('./logger')
const ArchivioLocalita = require('./archivioLocalita')
const ArchivioUtenti = require('./archivioUtenti')
const sendingFunction  = require('./sendingFunction')
const GestoreNotifiche = require('./gestoreNotifiche')
const Utente = require('./utente');
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const session = require('telegraf/session')
var mysql = require('mysql');
const parameter = require('./databaseConfig')
const COMANDI = require('./comandi')
require('dotenv').config() // Load the configuration

const ALFABETO = ['A','B','C','D','E','F','G','H','I','L','M','N','O','P','Q','R','S','T','U','V','Z']
const STATO_START = "start";
const STATO_ALLERTA_METEO = "allertameteo";
const STATO_ALLERTA_METEO_SELEZIONE = "allertameteoselezione"
const STATO_CONFERMA_PREVISIONI = "confermaprevisioni"

const ADMIN_ID = process.env.ADMIN_CHAT_ID;

/* DECLARATION */
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.use(session())
var loggerManager = new Logger();
var localitaManager = new ArchivioLocalita();
var mySqlConnection = mysql.createConnection(parameter);
var myGestoreNotifiche;
var utentiManager;

console.log("Starting bot...")
mySqlConnection.connect(function(err){
    if(err) {
        console.log("ERRORE")
        warnAdmin("Failed to start bot").then(()=>process.exit())
        return
    }
    console.log("Connected to database allertameteotoscana")
    myGestoreNotifiche = new GestoreNotifiche(bot,mySqlConnection);
    utentiManager = new ArchivioUtenti(mySqlConnection);
    //Avvio lo scheduling delle notifiche
    myGestoreNotifiche.startSchedulerNotifiche();
    warnAdmin("Bot succesfully started")
})

bot.start((ctx) => {
    ctx.session.stato = STATO_START;
    // ctx.reply("Benvenuto in allerta meteo bot, per conoscere i comandi digita /help")
    displayMainMenu(ctx,"Benvenuto/a in allerta meteo bot. Per iniziare seleziona 'imposta comune'");
})

bot.command("annulla",(ctx)=>{
    ctx.session.stato = STATO_START;
    displayMainMenu(ctx,"Operazione annullata");
})
//AGGIORNA ALLERTA METEO
bot.hears(COMANDI[0],(ctx)=>{
    var query = "SELECT * FROM utente WHERE idTelegram = ?"
    var values = [[ctx.chat.id]]
    utentiManager.connessione.query(query,[values],(err,result)=>{
        if(result.length == 0 )
        {
            displayMainMenu(ctx,"Non hai ancora impostato il tuo comune, seleziona 'Imposta comune' prima")
            return
        }
        var myUtente = new Utente(  result[0].idTelegram,
                                    result[0].usernameTelegram,
                                    result[0].nomeTelegram,
                                    result[0].comune,
                                    result[0].notificheMeteo    
                                )
        sendingFunction.inviaInfoAllerta(bot,myUtente,"allerta")
    })
});
//AGGIORNA PREVISIONI
bot.hears(COMANDI[1],(ctx)=>{
    var query = "SELECT * FROM utente WHERE idTelegram = ?"
    var values = [[ctx.chat.id]]
    utentiManager.connessione.query(query,[values],(err,result)=>{
        if(result.length == 0 )
        {
            displayMainMenu(ctx,"Non hai ancora impostato il tuo comune, seleziona 'Imposta comune' prima")
            return
        }
        var myUtente = new Utente(  result[0].idTelegram,
                                    result[0].usernameTelegram,
                                    result[0].nomeTelegram,
                                    result[0].comune,
                                    result[0].notificheMeteo    
                                )
        sendingFunction.inviaInfoAllerta(bot,myUtente,"previsioni")
    })
});
//Impostazione comune
bot.hears(COMANDI[2],(ctx)=>{
    ctx.session.stato = STATO_ALLERTA_METEO;
    displayAlfabeto(ctx);
});
//CREDITS
bot.hears(COMANDI[3],(ctx)=>{
    var message =   "Servizio di notifica allerta e previsioni meteo realizzato da @DaniZ97 basato sui dati resi liberamente "+
                    "disponibili a tutti i cittadini dal consorzio lamma\n\n"+
                    "Questo servizio NON E' gestito da Regione Toscana, pertanto non si garantisce la correttezza"+
                    " e l'affidabilita' del sistema. Il sito ufficiale della Regione Toscana per le allerte e' il segente: http://www.regione.toscana.it/allertameteo."+
                    "\n\nIn caso di vera emergenza non esistare a contattare il numero di emergenza 118.\n\n"+
                    "Condividi il @allerta_meteo_toscana_bot con i tuoi amici!";
    displayMainMenu(ctx,message)
});

bot.on("message",(ctx)=>{

    //ALLERTA METEO
    if(ctx.session.stato == STATO_ALLERTA_METEO)
    {
        ctx.session.stato = STATO_ALLERTA_METEO_SELEZIONE;
        let comuniSimili = localitaManager.ricercaLocalitaSimili(ctx.message.text)
        if(comuniSimili.length == 0)
        {
            displayMainMenu(ctx,"Spiaciente non ho trovato nessun comune, riprova con un altro nome")
            ctx.session.stato = STATO_START;
            return
        }
        inviaListaComuni(ctx,comuniSimili);
        return
    }
    //SELEZIONE COMUNE ALLERTA METEO
    if(ctx.session.stato == STATO_ALLERTA_METEO_SELEZIONE)
    {
        let indiceComune = localitaManager.ricercaIndiceLocalita(ctx.message.text);
        ctx.session.indiceComune = indiceComune;
        var message = "Vuoi ricevere anche le informazioni meteo della tua zona insieme alle notifiche di allerta? (SI - NO)";
        bot.telegram.sendMessage(ctx.chat.id,message,
            Markup.keyboard(["SI","NO"],{ columns: 2 })
            .oneTime()
            .resize()
            .extra());

        ctx.session.stato = STATO_CONFERMA_PREVISIONI
        return
    }

    if(ctx.session.stato == STATO_CONFERMA_PREVISIONI)
    {
        var indiceComune = ctx.session.indiceComune
        if(ctx.message.text == "SI")
            utentiManager.iscriviUtente(ctx,localitaManager.localita[indiceComune],true,displayMainMenu);
        else if(ctx.message.text == "NO")
            utentiManager.iscriviUtente(ctx,localitaManager.localita[indiceComune],false,displayMainMenu);
        else{
            displayMainMenu(ctx,"Errore, riprova");
            ctx.session.stato = STATO_START;
            return
        }
        ctx.session.stato = STATO_START;
        return
    }
    //SE C'E' UN ERRORE MOSTRO IL MESSAGGIO COMANDO NON TROVATO
    displayMainMenu(ctx,"Comando non trovato")
    return
})
bot.help((ctx)=>{ ctx.reply("aiuto")});

bot.startPolling();


function inviaListaComuni(ctx,comuni)
{
    bot.telegram.sendMessage(ctx.chat.id,"Ecco i comuni simili che ho trovato, scegline uno oppure digita /annulla per annullare",
            Markup.keyboard(comuni,{ columns: 3 })
            .oneTime()
            .resize()
            .extra());
}

function displayMainMenu(ctx,message)
{
    bot.telegram.sendMessage(ctx.chat.id,message,
            Markup.keyboard(COMANDI,{columns: 2})
            .oneTime()
            .resize()
            .extra());
}

function displayAlfabeto(ctx)
{
    bot.telegram.sendMessage(ctx.chat.id,"Ok seleziona la lettera inziale o inserisci le prime lettere del tuo comune",
            Markup.keyboard(ALFABETO,{ columns: 6 })
            .oneTime()
            .resize()
            .extra());
}

async function warnAdmin(message)
{
    let date = new Date().toLocaleDateString();
    let time = new Date().toLocaleTimeString();
    message = "["+date+","+time+"] "+message;
    await bot.telegram.sendMessage(ADMIN_ID,message)
}