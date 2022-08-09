const fs = require('fs');
const LOG_COMAND_FILE = './log/log_comand.txt';

module.exports = class Logger {
    constructor()
    {
        fs.appendFile(LOG_COMAND_FILE,'', function (err) {
            if (err) console.log("Errore creazione file log comandi");
          });
    }

    saveLog(message){
        let date = new Date().toLocaleDateString();
        let time = new Date().toLocaleTimeString();
        let log = "["+date+','+time+"]"+message;

        fs.appendFile(LOG_COMAND_FILE,log, function (err) {
            if (err) {console.log("Errore salvataggio log comando")}
            console.log('Log salvato:',log);
        });
    }
}
