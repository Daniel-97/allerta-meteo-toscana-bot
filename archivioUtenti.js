const fs = require('fs');
const Utente = require('./utente');

const PATH_LOG_DATABASE = "./log/log_database.txt";

module.exports = class ArchivioUtenti{
    constructor(mysqlConnection)
    {
        this.utenti = []
        this.connessione = mysqlConnection;
    }
    loadUtenti(callback)
    {
        var query = "SELECT * FROM utenti";
        this.connessione.query(query,(err,result,fields)=>{
            if(err){
                console.log(err);
                return;
            }
            else
                for(var i = 0; i < result.length; i++)
                    this.utenti.push(new Utente(result[i].telegramId,result[i].telegramUsername,result[i].telegramName));
        })
    }
    iscriviUtente(telegramClient,comune,previsioni,callback){
        var query = "INSERT INTO utente (idTelegram,usernameTelegram,nomeTelegram,comune,notificheMeteo) VALUES ?"
        var id = telegramClient.chat.id;
        var username = telegramClient.chat.username;
        var nome = telegramClient.chat.first_name;
        if(previsioni)
            var values = [[id,username,nome,comune.url,true]]
        else
            var values = [[id,username,nome,comune.url,false]]

        this.connessione.query("DELETE FROM utente WHERE idTelegram = ?",[id],(err,result)=>{
            this.connessione.query(query,[values],(err,result)=>{
                if(err){
                    console.log(err)
                    var message = "Errore sconosciuto, riprova piu tardi";
                    log(id+" "+err);
                }
                else{
                    if(!previsioni)
                        var message = "Ok, da questo momento in poi riceverai notifiche di allerta meteo per "+comune.nome
                    else
                        var message = "Ok, da questo momento in poi riceverai notifiche di allerta meteo e previsioni per "+comune.nome
                }
                callback(telegramClient,message);
            });
        })
    }
}

function log(logMessage)
{
    var date = new Date().toLocaleDateString();
    var time = new Date().toLocaleTimeString();
    
    var log = "["+date+" "+time+" ] "+logMessage+"\n";
    fs.appendFile(PATH_LOG_DATABASE,log, function (err) {
		if (err) throw err;
		    console.log('Log database salvato! -->',log);
	});
}