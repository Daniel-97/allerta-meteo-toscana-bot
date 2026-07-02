# Fonti dati ambientali e meteo – Toscana
### Documentazione di API, servizi e feed

Questo documento raccoglie i punti di accesso ai dati di **tre enti distinti**:

| Ambito | Ente | Tipo di accesso |
|---|---|---|
| Meteo / previsioni / osservazioni | **Consorzio LaMMA** | Portale Open Data CKAN (API) + servizi OGC WMS/WMTS |
| Allerte meteo / criticità idro | **CFR – Centro Funzionale Regionale** / Regione Toscana | Pagine web, PDF, RSS, app (no API REST pubblica formale) |
| Qualità dell'aria | **ARPAT** – Agenzia Regionale Protezione Ambientale Toscana | API REST JSON + archivio CSV/XLS |

> Relazione tra gli enti: il **LaMMA** produce previsioni e bollettini di vigilanza meteo; il **CFR/Regione Toscana** emette l'**allerta** ufficiale; **ARPAT** si occupa dei dati ambientali (aria, acque, ecc.). Sono tre soggetti diversi.

---

# Parte A — Consorzio LaMMA · Meteo (Open Data CKAN + OGC)

Il LaMMA è il servizio meteorologico della Regione Toscana (CNR + Regione). Mette a disposizione i dati attraverso due canali principali.

## A.1 Portale Open Data CKAN

**Portale:** `http://dati.lamma.toscana.it`
La piattaforma è basata su **CKAN**, che espone le classiche **CKAN Action API** in JSON. I dataset riguardano principalmente meteo e dati geospaziali.

**Base API:** `http://dati.lamma.toscana.it/api/3/action/`

Azioni CKAN standard più utili:

| Azione | Scopo | Esempio |
|---|---|---|
| `package_list` | Elenco degli identificativi di tutti i dataset | `http://dati.lamma.toscana.it/api/3/action/package_list` |
| `package_search` | Ricerca dataset per parola chiave | `http://dati.lamma.toscana.it/api/3/action/package_search?q=bollettino` |
| `package_show` | Metadati e risorse di un dataset | `http://dati.lamma.toscana.it/api/3/action/package_show?id={dataset_id}` |
| `resource_show` | Dettagli di una singola risorsa | `http://dati.lamma.toscana.it/api/3/action/resource_show?id={resource_id}` |
| `datastore_search` | Dati tabellari di una risorsa (se il DataStore è attivo) | `http://dati.lamma.toscana.it/api/3/action/datastore_search?resource_id={id}&limit=100` |
| `datastore_search_sql` | Query SQL sul DataStore (se attivo) | `http://dati.lamma.toscana.it/api/3/action/datastore_search_sql?sql=SELECT * FROM "{resource_id}"` |

Formato risposta CKAN: oggetto JSON `{ "success": true, "result": { ... } }`.

> Nota operativa: gli **ID esatti** di dataset e risorse vanno letti da `package_list`/`package_search`, perché non sono fissi. La disponibilità di `datastore_search` dipende dall'attivazione del DataStore sulla singola risorsa (alcune risorse sono solo file scaricabili). Non ho potuto interrogare direttamente il portale (accesso automatico bloccato), quindi conviene verificare le azioni disponibili dalla home del portale.

## A.2 Servizi cartografici OGC (WMS / WMTS)

Le previsioni geo-riferite del visualizzatore LaMMA sono servite tramite **servizi OGC compliant WMS e WMTS**, entrambi con **parametro `TIME`** per la dimensione temporale, richiamabili da un qualsiasi client WMS/WMTS (QGIS, Leaflet/OpenLayers, ecc.).

Pattern tipici (l'URL esatto dell'endpoint va preso dal visualizzatore LaMMA — pagina `https://www.lamma.toscana.it/pubblicazione-dati-meteo`):

```
# elenco dei layer disponibili
{WMS_ENDPOINT}?service=WMS&version=1.3.0&request=GetCapabilities

# richiesta di una mappa a un dato istante
{WMS_ENDPOINT}?service=WMS&version=1.3.0&request=GetMap
    &layers={layer}&bbox={minx,miny,maxx,maxy}&crs=EPSG:4326
    &width=800&height=600&format=image/png&time={ISO8601}

# WMTS
{WMTS_ENDPOINT}?service=WMTS&request=GetCapabilities
```

## A.3 Dataset LaMMA sul portale regionale

Alcuni dataset LaMMA sono catalogati anche sul portale Open Data della Regione (`https://dati.toscana.it`, anch'esso CKAN, quindi stesse Action API). Tra i dataset pubblicati dal LaMMA:

- **Bollettini meteo della Toscana**, aggiornati due volte al giorno (mattina entro le 10, pomeriggio entro le 16).
- **Previsioni meteo delle località** della Toscana, aggiornate due volte al giorno con lo stesso orario.
- **Dati stazioni meteo** mediati sulla mezz'ora (dump da stazione).

Sito principale e app: `https://www.lamma.toscana.it` · sezione dati stazioni: `https://www.lamma.toscana.it/meteo/osservazioni-e-dati/dati-stazioni`.

---

# Parte B — CFR / Regione Toscana · Allerte meteo

Le allerte meteo e la valutazione delle criticità idrogeologiche/idrauliche sono emesse dal **Centro Funzionale Regionale (CFR)** della Regione Toscana. **Non esiste una API REST pubblica formale**: i prodotti sono diffusi come pagine web, PDF, feed **RSS** e tramite l'app "CFR Toscana" (alcune funzioni sono riservate ad autorità pubbliche e operatori di protezione civile).

## B.1 Punti di accesso

| Risorsa | URL | Contenuto |
|---|---|---|
| Allerta meteo (cittadini) | `https://www.regione.toscana.it/allertameteo` | Mappe allerta, sistema di allertamento, norme di comportamento |
| CFR (tecnico/operativo) | `https://www.cfr.toscana.it` | Bollettini, vigilanza, criticità, dati tempo reale, RSS |
| SIR – Servizio Idrologico Regionale | `https://www.sir.toscana.it` | Dati e storici idro-pluviometrici; statistiche emissioni allerte |

## B.2 Prodotti pubblicati (con cadenza giornaliera)

1. **Bollettino di Vigilanza Meteo Regionale** – previsione dei fenomeni.
2. **Bollettino di Valutazione delle Criticità / Avviso di Criticità Regionale.**
3. **Adozione Allerta** – atto con cui si adotta il livello di allerta.
4. **Bollettino meteo**, **dati in tempo reale** (livelli fiumi, piogge, temperature), **feed RSS**.

> Dal 3 novembre 2025 (DG n. 1526/2025), il Bollettino di Vigilanza Meteo e il Bollettino di Valutazione delle Criticità/Avviso di Criticità sono pubblicati contestualmente e **in forma libera** (accesso non riservato).

## B.3 Zone e livelli

- Il territorio è suddiviso in **26 zone di allerta**; per ciascuna si valuta un livello per ogni rischio.
- Le mappe sono aggiornate **almeno una volta al giorno alle 13:00** e indicano le criticità nelle **prossime 36 ore** (oggi e domani).
- **Rischi considerati:** idraulico (inondazioni), idrogeologico (frane, reticolo minore), temporali forti, vento, mareggiate, neve, ghiaccio.
- **Codici colore:**

| Colore | Significato |
|---|---|
| Verde | Nessun fenomeno intenso/pericoloso previsto (normale variabilità) |
| Giallo | Vigilanza |
| Arancione | Allerta |
| Rosso | Allerta (livello massimo) |

## B.4 RSS e accesso automatico

Il CFR mette a disposizione un feed **RSS** (voce "RSS" tra i prodotti giornalieri della app/sito). L'URL preciso del feed va preso dalla sezione RSS del sito CFR. In assenza di API REST, per un uso programmatico le opzioni pratiche sono: consumare il feed RSS, oppure fare parsing delle pagine/PDF di vigilanza e allerta (`cfr.toscana.it`).

## B.5 Livello nazionale (contesto)

Il quadro nazionale delle criticità è pubblicato dal **Dipartimento della Protezione Civile** (`https://www.protezionecivile.gov.it`), che diffonde il bollettino di criticità nazionale in cui rientrano anche le zone di allerta toscane.

---

# Parte C — ARPAT · Qualità dell'aria (API JSON)

**Documentazione ufficiale:** `https://www.arpat.toscana.it/open-data/open-data-sulla-qualita-dellaria/`
**Base URL:** `https://opendata.arpat.toscana.it/temi-ambientali/aria/qualita-aria`
**Formato:** JSON · **Licenza:** IODL 2.0
**Qualità dato:** validazione di primo livello (provvisori); per serie validate → archivio CSV/XLS.

La pagina di documentazione ufficiale contiene: le informazioni sui dati e sulla licenza, la base URL comune, la descrizione dei quattro dataset (Dati orari Near Real Time, Superamenti limiti giornalieri, Bollettini della qualità dell'aria, Struttura rete di monitoraggio) con i relativi esempi, e per ciascuno la sezione **"Tracciato Record"** con lo schema dei campi restituiti (da consultare per i nomi esatti dei campi JSON).

**Licenza (IODL 2.0) in sintesi** — consente di riprodurre, distribuire, modificare, elaborare e combinare (mashup) le informazioni, anche a fini commerciali, a condizione di: (1) indicare la fonte e il nome del licenziante (con link alla licenza, se possibile); (2) non far sembrare che le informazioni abbiano carattere ufficiale o che il licenziante approvi l'uso che se ne fa; (3) non travisare le informazioni.

| Dataset | Percorso (dopo la base URL) | Parametri | Esempio |
|---|---|---|---|
| Dati orari Near Real Time | `/dati_orari_real_time/json_orari_nrt/{stazione}/{data}` | `stazione` (obbl.); `data` `GG-MM-AAAA` o `last` (opz.) | `https://opendata.arpat.toscana.it/temi-ambientali/aria/qualita-aria/dati_orari_real_time/json_orari_nrt/FI-BASSI/31-03-2026` |
| Bollettini qualità aria | `/bollettini/bollettino_json/{tipo}/{data}` | `tipo` = `regionale`/`ozono`; `data` `GG-MM-AAAA` (opz.) | `https://opendata.arpat.toscana.it/temi-ambientali/aria/qualita-aria/bollettini/bollettino_json/regionale/22-01-2026` |
| Superamenti limiti giornalieri | `/bollettini/superamenti_json/{data}/{stazione}` | `data` `GG-MM-AAAA` o `-`; `stazione` (opz.) | `https://opendata.arpat.toscana.it/temi-ambientali/aria/qualita-aria/bollettini/superamenti_json/01-01-2026/PT-MONTALE` |
| Struttura rete monitoraggio | `/rete_monitoraggio/rete_json/{tipo_rete}` | `tipo_rete` = `regionale`/`provinciale`/`ozono` (opz.) | `https://opendata.arpat.toscana.it/temi-ambientali/aria/qualita-aria/rete_monitoraggio/rete_json/ozono` |

Comportamenti utili: senza `data` gli endpoint dei bollettini restituiscono l'ultimo pubblicato; per i superamenti, nessun superamento → oggetto con `superamenti: 0`, data fuori range → `[]`.

**Archivio storico validato (CSV/XLS):** `https://www.arpat.toscana.it/datiemappe/qualita-dellaria-dati-orari/`
File ZIP per provincia (AR, FI, GR, LI, LU, MS, PI, PO, PT, SI) e anno (2008–2024).
Esempio: `https://www.arpat.toscana.it/app/uploads/2025/08/FI_DATI_QA_2024_CSV.zip`

## C.1 Legenda livelli di criticità — Ozono (O₃)

La scala per livelli di criticità è una semplificazione comunicativa introdotta da ARPAT per il pubblico: mette in corrispondenza le classi di criticità mostrate sulla mappa con le diciture e i valori di riferimento previsti a norma di legge.

| Livello di criticità | Dicitura di legge | Valore di riferimento | Intervallo temporale | Rischio per la salute umana |
|---|---|---|---|---|
| **Molto elevata** | Superamento soglia di **ALLARME** | 240 μg/m³ | Media oraria | Livello oltre il quale sussiste un rischio per la salute umana in caso di esposizione di breve durata per la popolazione nel suo complesso. |
| **Elevata** | Superamento soglia di **INFORMAZIONE** | 180 μg/m³ | Media oraria | Livello oltre il quale sussiste un rischio per la salute umana in caso di esposizione di breve durata per alcuni gruppi particolarmente sensibili della popolazione. |
| **Media** | Superamento del **valore OBIETTIVO** | 120 μg/m³ | Media mobile su 8 ore della massima giornaliera | Livello fissato per evitare, prevenire o ridurre effetti nocivi per la salute umana o per l'ambiente. Il valore obiettivo non dovrebbe essere superato più di 25 volte per anno civile, come media su 3 anni. |
| **Nessuna** | Nella **NORMA** | Valori inferiori a 120 μg/m³ | Media mobile su 8 ore della massima giornaliera | Nessun rischio. |

> Nota di lettura: le soglie di **allarme** (240 μg/m³) e di **informazione** (180 μg/m³) si valutano sulla media oraria; il **valore obiettivo** (120 μg/m³) sulla massima giornaliera della media mobile su 8 ore. I livelli sono in ordine decrescente di gravità (Molto elevata → Nessuna).

---

## Attribuzione

- Dati LaMMA: citare «Consorzio LaMMA» secondo la licenza indicata sul singolo dataset del portale CKAN.
- Allerte/criticità: fonte «Regione Toscana – Centro Funzionale Regionale».
- Dati ARPAT (IODL 2.0): «Fonte: Agenzia regionale per la protezione ambientale della Toscana (ARPAT) – Sistema informativo regionale ambientale».

## Note sui limiti di questa documentazione

Alcuni endpoint (portale CKAN LaMMA, opendata ARPAT) bloccano l'accesso automatico non-browser e possono restituire errori 403/503 a client "nudi": impostare uno User-Agent da browser e header `Accept` adeguati. Gli ID esatti dei dataset CKAN, l'URL preciso dei servizi WMS/WMTS LaMMA e l'URL del feed RSS del CFR vanno confermati direttamente sui rispettivi portali, perché non sono documentati in modo statico.