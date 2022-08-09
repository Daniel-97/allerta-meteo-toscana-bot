//CLASSE PER UTENTE
module.exports = class Utente {
    constructor(id,username,nome,comune,notificheMeteo)
    {
        this.id = id;
        this.username = username;
        this.nome = nome;
        this.comune = comune;
        this.notificheMeteo = notificheMeteo;
    }
}