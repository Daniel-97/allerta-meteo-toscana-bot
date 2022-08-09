const xml2js = require('xml2js');
const http = require('http')
const Markup = require('telegraf/markup')
const COMANDI = require('./comandi')

const STATO_START = "start";
const URL_DATI_TOSCANA = "http://www.lamma.rete.toscana.it/previ/ita/xml/comuni_web/dati/";
const URL_PREVISIONI_TOSCANA = "http://www.lamma.rete.toscana.it/meteo/bollettini-meteo/toscana";
const URL_ALLERTA_TOSCANA = "http://www.regione.toscana.it/allertameteo";
const URL_IMMAGINE_MATTINA = "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_M.jpg"
const URL_IMMAGINE_POMERIGGIO = "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_P.jpg"
const URL_IMMAGINE_SERA = "http://www.lamma.rete.toscana.it/previ/ita/immagini/image_1_S.jpg"

/*Se e' una notifica mando le informazioni in base al parametro notificheMeteo del database
    altrimenti significa che l'utente ha richiesto i dati manualmente(aggiorna) 
    e quindi mando tutte le informazioni */

exports.inviaInfoAllerta = function(bot,utente,modalita){
        
    var parser = new xml2js.Parser();
    var urlDati = URL_DATI_TOSCANA+utente.comune
    var XML = '';
    http.get(urlDati,(res)=>{
        res.on('data',(chunk)=> XML+=chunk)
        res.on('end',()=>{
            parser.parseString(XML,(err,res)=>{
                if(modalita == "allerta")
                    inviaAllerta(res.dati,utente,bot)
                if(modalita == "previsioni")
                    inviaPrevisioni(res.dati,utente,bot);
                if(modalita == "allertaprevisioni")
                    inviaAllertaPrevisioni(res.dati,utente,bot)
                    
            })
        })
    })
        
    
}
//Funzione che invia sia i dati di allerta sia i dati meteo del comune corrispondente
function inviaAllertaPrevisioni(XML,utente,bot)
{
    var comune = XML.comune[0]
    var soleSorge = XML.almanacco[0].sole_sorge[0]
    var soleTramonta = XML.almanacco[0].sole_tramonta[0]
    var aggiornamento = XML.aggiornamento
    var time_ms = XML.time_ms
    var minTemp = XML.previsione[0].temp[0]._
    var maxTemp = XML.previsione[0].temp[1]._ 
    var allerta = XML.previsione[0].allerta[0].$.value
    var rischioIdraulico = XML.previsione[0].rischio[0].$.value
    var rischioIdrogeologico = XML.previsione[0].rischio[1].$.value
    var rischioTemporali = XML.previsione[0].rischio[2].$.value
    var rischioVento = XML.previsione[0].rischio[3].$.value
    var rischioNeve = XML.previsione[0].rischio[4].$.value
    var rischioGhiaccio = XML.previsione[0].rischio[5].$.value
    var parteGiorno = calcolaParteGiorno(soleSorge,soleTramonta) // 1 mattino, 2 pomeriggio, 3 sera
    var parteGiornoStr = parteGiorno==1?"mattina":parteGiorno==2?"pomeriggio":"sera";
    var currentTemp = XML.previsione[parteGiorno].temp[0]._ //Temperatura attuale
    var currentTempPerc = XML.previsione[parteGiorno].temp[1]._ //Temperatura percepita
    var umidita = XML.previsione[parteGiorno].um[0]
    var probPioggia = XML.previsione[parteGiorno].prob_rain[0]
    
    var messaggio = "Dati del "+aggiornamento+" per comune di "+comune+"\n\n"
                     +"Allerta: "+allerta+"\n\n"+
                     "- Rischio idraulico: "+rischioIdraulico+"\n"+
                     "- Rischio idrogeologico: "+rischioIdrogeologico+"\n"+
                     "- Rischio temporali: "+rischioTemporali+"\n"+
                     "- Rischio vento: "+rischioVento+"\n"+
                     "- Rischio neve: "+rischioNeve+"\n"+
                     "- Rischio ghiaccio: "+rischioGhiaccio+"\n\n"+
                     "Informazioni meteo "+parteGiornoStr+"\n"+
                     "- Temperatura: "+currentTemp+"°\n"+
                     "- Temperatura percepita: "+currentTempPerc+"°\n"+
                     "- Umidita': "+umidita+"%\n"+
                     "- Probabilita' pioggia: "+probPioggia+"%\n\n"+
                     "Temp min: "+minTemp+"°         Temp max: "+maxTemp+"°\n"+
                     (parteGiorno==1?URL_IMMAGINE_MATTINA:parteGiorno==2?URL_IMMAGINE_POMERIGGIO:URL_IMMAGINE_SERA)+
                     "?v="+time_ms;
    
    // ctx.session.stato = STATO_START
    bot.telegram.sendMessage(utente.id,messaggio,
        Markup.keyboard(COMANDI,{columns: 2})
        .oneTime()
        .resize()
        .extra());
}
//Funzione che invia solamente i dati di allerta
function inviaAllerta(XML,utente,bot){
    var comune = XML.comune[0]
    var aggiornamento = XML.aggiornamento
    var allerta = XML.previsione[0].allerta[0].$.value
    var rischioIdraulico = XML.previsione[0].rischio[0].$.value
    var rischioIdrogeologico = XML.previsione[0].rischio[1].$.value
    var rischioTemporali = XML.previsione[0].rischio[2].$.value
    var rischioVento = XML.previsione[0].rischio[3].$.value
    var rischioNeve = XML.previsione[0].rischio[4].$.value
    var rischioGhiaccio = XML.previsione[0].rischio[5].$.value
    
    var messaggio = "Dati allerta del "+aggiornamento+" per comune di "+comune+"\n\n"
                     +"Allerta: "+allerta+"\n\n"+
                     "- Rischio idraulico: "+rischioIdraulico+"\n"+
                     "- Rischio idrogeologico: "+rischioIdrogeologico+"\n"+
                     "- Rischio temporali: "+rischioTemporali+"\n"+
                     "- Rischio vento: "+rischioVento+"\n"+
                     "- Rischio neve: "+rischioNeve+"\n"+
                     "- Rischio ghiaccio: "+rischioGhiaccio;
    
    // ctx.session.stato = STATO_START
    bot.telegram.sendMessage(utente.id,messaggio,
        Markup.keyboard(COMANDI,{columns: 2})
        .oneTime()
        .resize()
        .extra());
}
function inviaPrevisioni(XML,utente,bot){
    var comune = XML.comune[0]
    var aggiornamento = XML.aggiornamento
    var time_ms = XML.time_ms
    var soleSorge = XML.almanacco[0].sole_sorge[0]
    var soleTramonta = XML.almanacco[0].sole_tramonta[0]
    var minTemp = XML.previsione[0].temp[0]._
    var maxTemp = XML.previsione[0].temp[1]._ 
    var parteGiorno = calcolaParteGiorno(soleSorge,soleTramonta) // 1 mattino, 2 pomeriggio, 3 sera
    var parteGiornoStr = parteGiorno==1?"mattina":parteGiorno==2?"pomeriggio":"sera";
    var currentTemp = XML.previsione[parteGiorno].temp[0]._ //Temperatura attuale
    var currentTempPerc = XML.previsione[parteGiorno].temp[1]._ //Temperatura percepita
    var umidita = XML.previsione[parteGiorno].um[0]
    var probPioggia = XML.previsione[parteGiorno].prob_rain[0]
    
    var messaggio = "Dati meteo del "+aggiornamento+". Comune di "+comune+" "+parteGiornoStr+"\n\n"+
                     "- Temperatura: "+currentTemp+"°\n"+
                     "- Temperatura percepita: "+currentTempPerc+"°\n"+
                     "- Umidita': "+umidita+"%\n"+
                     "- Probabilita' pioggia: "+probPioggia+"%\n"+
                     "- Sole sorge: "+soleSorge+"\n"+
                     "- Sole tramonta: "+soleTramonta+"\n"+
                     "Temp min: "+minTemp+"°         Temp max: "+maxTemp+"°\n"+
                     (parteGiorno==1?URL_IMMAGINE_MATTINA:parteGiorno==2?URL_IMMAGINE_POMERIGGIO:URL_IMMAGINE_SERA)
                    +"?v="+time_ms;
    // ctx.session.stato = STATO_START
    bot.telegram.sendMessage(utente.id,messaggio,
        Markup.keyboard(COMANDI,{columns: 2})
        .oneTime()
        .resize()
        .extra());
}

function calcolaParteGiorno(soleSorge,soleTramonta)
{
    var current_date = new Date()
    if(current_date.getHours() >= 1 && current_date.getHours() < 13)
        return 1 //MATTINO
    else if(current_date.getHours() >=  13 && current_date.getHours() <= 19)
        return 2 //POMERIGGIO
    else
        return 3 //SERA
}

// function getPrevisioniToscana(ctx)
// {
//     var parser = new xml2js.Parser();
//     var XML = '';
//     http.get(URL_PREVISIONI_TOSCANA,(res)=>{
//         res.on('data',(chunk)=> XML+=chunk)
//         res.on('end',()=>{
//             parser.parseString(XML,(err,result)=>{
//                 elaboraXMLMeteo(result.bollettino,ctx)
//             })
//         })
//     })
// }

// function elaboraXMLMeteo(XML,ctx)
// {
//     var data = XML.data[0]
//     var cielo = XML.previsione[0].fenomeni[0].cielo
//     var vento = XML.previsione[0].fenomeni[0].vento
//     var mare = XML.previsione[0].fenomeni[0].mare
//     var temperatura = XML.previsione[0].fenomeni[0].temperatura[0]
//     var imgMattina = XML.previsione[0].immagine[0]._
//     var imgPomeriggio = XML.previsione[0].immagine[1]._
//     var imgSera = XML.previsione[0].immagine[2]._
    
//     var message = "PREVISIONI METEO TOSCANA DEL "+data+"\n"+
//                     "- Cielo: "+cielo+"\n"+
//                     "- Vento: "+vento+"\n"+
//                     "- Mare: "+mare+"\n"+
//                     "- Temperature: "+temperatura+"\n"

//     // displayMainMenu(ctx,message)
//     // MOSTRA LA FOTO
//     // ctx.reply(URL_IMMAGINI_METEO+imgMattina)
//     // ctx.reply(URL_IMMAGINI_METEO+imgPomeriggio)
//     // ctx.reply(URL_IMMAGINI_METEO+imgSera)
// } 