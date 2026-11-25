// Contatti della landing di Travel Podcasting (Google Apps Script, gira nel cloud di Google, gratis).
// A ogni invio del modulo: 1) salva una riga in un Foglio Google; 2) scrive in #bs-landing-page su Discord,
// firmato Bruno e con la menzione di Pietro, così arriva la notifica sul telefono.
//
// Setup (una volta), con l'account balestripietro@gmail.com:
// 1. script.google.com -> Nuovo progetto -> nome «Contatti landing Travel Podcasting» -> incolla questo file.
// 2. Discord, canale #bs-landing-page -> Modifica canale -> Integrazioni -> Webhook -> Nuovo webhook -> Copia URL.
// 3. Apps Script -> Impostazioni progetto -> Proprietà script:
//      DISCORD_WEBHOOK_URL = l'URL copiato al punto 2 (è un segreto: non va in chat, su GitHub o su Drive)
//      DISCORD_MENZIONE    = <@ID_DI_PIETRO>  (Discord -> Impostazioni -> Avanzate -> Modalità sviluppatore;
//                            poi clic destro sul proprio nome -> Copia ID utente). Facoltativa.
// 4. Esegui una volta prova() e concedi i permessi: crea il Foglio «Contatti landing» e manda un messaggio di prova.
// 5. Distribuisci -> Nuova distribuzione -> Tipo «App web» -> Esegui come: Me -> Chi ha accesso: Chiunque -> Distribuisci.
//    Copia l'URL che finisce con /exec: va in ENDPOINT_CONTATTI nella landing (index.html).
// Ogni volta che si modifica questo file: Distribuisci -> Gestisci distribuzioni -> modifica -> Nuova versione
// (l'URL /exec resta lo stesso).

var NOME_FOGLIO = 'Contatti landing';

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return risposta({ ok: true });                       // campo esca: lo compilano solo i bot
    var nome = pulisci(d.name, 120), email = pulisci(d.email, 160).toLowerCase(), pagina = pulisci(d.page, 300);
    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || d.consent !== true) return risposta({ ok: false, errore: 'dati' });
    var cache = CacheService.getScriptCache();
    if (cache.get('mail:' + email)) return risposta({ ok: true });       // stesso indirizzo entro 10 minuti: niente doppioni
    cache.put('mail:' + email, '1', 600);
    foglio().appendRow([new Date(), nome, email, 'sì', pagina]);
    avvisaDiscord(nome, email, pagina);
    return risposta({ ok: true });
  } catch (err) {
    console.error(err);
    return risposta({ ok: false, errore: 'server' });
  }
}

function pulisci(v, max) { return String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function risposta(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function foglio() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOGLIO_ID'), ss;
  if (id) { ss = SpreadsheetApp.openById(id); }
  else {
    ss = SpreadsheetApp.create(NOME_FOGLIO);
    ss.getSheets()[0].appendRow(['Data', 'Nome e Comune o ente', 'Email', 'Consenso', 'Pagina']);
    props.setProperty('FOGLIO_ID', ss.getId());
  }
  return ss.getSheets()[0];
}

function avvisaDiscord(nome, email, pagina) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('DISCORD_WEBHOOK_URL');
  if (!url) return;
  var menzione = props.getProperty('DISCORD_MENZIONE') || '';
  var testo = (menzione ? menzione + ' ' : '') + 'nuovo contatto dalla landing.\n' +
    '**' + nome.replace(/[*_`~|>]/g, '') + '** · ' + email + '\n' +
    'Foglio: ' + SpreadsheetApp.openById(props.getProperty('FOGLIO_ID')).getUrl();
  var utente = (menzione.match(/\d{5,}/) || [])[0];
  UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ username: 'Bruno', content: testo, allowed_mentions: { users: utente ? [utente] : [] } })
  });
}

// Prova da Apps Script: crea il Foglio (se manca) e manda su Discord un contatto finto, segnato come prova.
function prova() {
  foglio().appendRow([new Date(), 'PROVA – da cancellare', 'prova@example.com', 'sì', 'prova()']);
  avvisaDiscord('PROVA – da cancellare', 'prova@example.com', 'prova()');
}
