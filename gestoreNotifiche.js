var cron = require('node-cron');
const sendingFunction  = require('./sendingFunction')
const Utente = require('./utente');

const ADMIN_ID = "112833302";

module.exports = class GestoreNotifiche{
    constructor(bot,mysqlConnection){
        this.scheduler;
        this.connessione = mysqlConnection;
        this.bot = bot;

    }

    startSchedulerNotifiche(){
        console.log("Avvio scheduler notifiche")
        // , valori multipli - range
        //Notifiche alle 9:30 e alle 15:30 tutti i giorni
        this.scheduler = cron.schedule('30 9,15 * * 0-6', () => {
            var query = "SELECT * FROM utente"
            this.connessione.query(query,(err,result)=>{
                for(var i = 0; i < result.length; i++)
                {
                    var myUtente = new Utente(  result[i].idTelegram,
                        result[i].usernameTelegram,
                        result[i].nomeTelegram,
                        result[i].comune,
                        result[i].notificheMeteo    
                    )
                    if(result[i].notificheMeteo)
                        sendingFunction.inviaInfoAllerta(this.bot,myUtente,"allertaprevisioni");
                    else
                        sendingFunction.inviaInfoAllerta(this.bot,myUtente,"allerta");
                }
            })
          });
    }

    //Funzione che manda un broadcast a tutti gli utenti del bot
    broadcast(messaggio){
        var query = "SELECT * FROM utente"
            this.connessione.query(query,(err,result)=>{
                for(var i = 0; i < result.length; i++)
                    this.bot.telegram.sendMessage(result[i].idTelegram,messaggio)
            })
    }
}