/* REQUIRE MODULE */
const fs = require('fs');
const xml2js = require('xml2js');

/*DECLARATION */
const PATH_XML_LOCALITA = "./XML/lista_comuni.xml";

module.exports = class ArchivioLocalita{
    constructor(){
        this.localita = new Array();
        this.loadLocalita();
    }

    loadLocalita()
    {
        var parser = new xml2js.Parser();
        var XMLDocment = fs.readFileSync(PATH_XML_LOCALITA,'utf-8');
        parser.parseString(XMLDocment,(err,result)=>{
            for(var i = 0; i < result.pages.link.length; i++)
                this.localita.push(new Localita(result.pages.link[i].title[0],result.pages.link[i].url[0],i));
            
        })
    }

    toString(){
        let s = ''; 
        for(var i = 0; i < this.localita.length; i++)
            s+= this.localita[i].indice+" "+this.localita[i].nome+"\n";
        return s;
    }
    ricercaLocalitaSimili(iniziali)
    {
        let comuniSimili = new Array();
        iniziali = iniziali.toLowerCase();
        for(var i = 0; i < this.localita.length; i++)
        {
            if(this.localita[i].nome.toLowerCase().search(iniziali) == 0)
                comuniSimili.push(this.localita[i].nome);
        }
        return comuniSimili;
    }
    ricercaIndiceLocalita(nomeComune)
    {
        for(var i = 0; i < this.localita.length; i++)
        {
            if(this.localita[i].nome.search(nomeComune) == 0)
                return i;
        }
        return -1;
    }

}

class Localita 
{
    constructor(nome,url,indice){
        this.nome = nome;
        this.url  = url;
        this.indice = indice;
    }
}
