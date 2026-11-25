// Contatti della landing di Travel Podcasting (Google Apps Script, gira nel cloud di Google, gratis).
// A ogni invio del modulo: 1) salva una riga in un Foglio Google; 2) scrive in #bs-landing-page su Discord,
// firmato Bruno e con la menzione di Pietro; 3) manda una mail a Pietro e Iacopo (o a NOTIFICA_EMAIL).
//
// Setup (una volta), con l'account balestripietro@gmail.com:
// 1. script.google.com -> Nuovo progetto -> nome «Contatti landing Travel Podcasting» -> incolla questo file.
// 2. Discord, canale #bs-landing-page -> Modifica canale -> Integrazioni -> Webhook -> Nuovo webhook -> Copia URL.
// 3. Apps Script -> Impostazioni progetto -> Proprietà script:
//      DISCORD_WEBHOOK_URL = l'URL copiato al punto 2 (è un segreto: non va in chat, su GitHub o su Drive)
//      DISCORD_MENZIONE    = <@ID_DI_PIETRO>  (Discord -> Impostazioni -> Avanzate -> Modalità sviluppatore;
//                            poi clic destro sul proprio nome -> Copia ID utente). Facoltativa.
//      NOTIFICA_EMAIL      = indirizzi a cui mandare la mail, separati da virgola. Facoltativa: senza, va a Pietro e Iacopo (DESTINATARI).
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
    var c = {
      nome: pulisci(d.name, 120), ente: pulisci(d.ente, 160), ruolo: pulisci(d.ruolo, 80),
      email: pulisci(d.email, 160).toLowerCase(), telefono: pulisci(d.telefono, 40),
      messaggio: String(d.messaggio || '').trim().slice(0, 1500), pagina: pulisci(d.page, 300)
    };
    if (!c.nome || !c.ente || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email) || d.consent !== true) return risposta({ ok: false, errore: 'dati' });
    var cache = CacheService.getScriptCache();
    if (cache.get('mail:' + c.email)) return risposta({ ok: true });     // stesso indirizzo entro 10 minuti: niente doppioni
    cache.put('mail:' + c.email, '1', 600);
    foglio().appendRow([new Date(), c.nome, c.ente, c.ruolo, c.email, c.telefono, c.messaggio, 'sì', c.pagina]);
    avvisaDiscord(c);
    avvisaEmail(c);
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
    ss.getSheets()[0].appendRow(['Data', 'Nome', 'Comune o ente', 'Ruolo', 'Email', 'Telefono', 'Messaggio', 'Consenso', 'Pagina']);
    props.setProperty('FOGLIO_ID', ss.getId());
  }
  return ss.getSheets()[0];
}

function riassunto(c) {
  return [c.nome + ' · ' + c.ente + (c.ruolo ? ' (' + c.ruolo + ')' : ''), c.email + (c.telefono ? ' · ' + c.telefono : ''), c.messaggio ? '«' + c.messaggio + '»' : ''].filter(String).join('\n');
}

function avvisaDiscord(c) {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('DISCORD_WEBHOOK_URL');
  if (!url) return;
  var menzione = props.getProperty('DISCORD_MENZIONE') || '';
  var testo = (menzione ? menzione + ' ' : '') + 'nuovo contatto dalla landing.\n' + riassunto(c).replace(/[*_`~|>@]/g, '') +
    '\nFoglio: ' + SpreadsheetApp.openById(props.getProperty('FOGLIO_ID')).getUrl();
  var utente = (menzione.match(/\d{5,}/) || [])[0];
  var opzioni = {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ username: 'Bruno', avatar_url: AVATAR_BRUNO, content: testo.slice(0, 1900), allowed_mentions: { users: utente ? [utente] : [] } })
  };
  var r = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?wait=true' : '&wait=true'), opzioni);
  if (r.getResponseCode() >= 300) { Utilities.sleep(1500); r = UrlFetchApp.fetch(url, opzioni); }
  console.log('Discord: risposta ' + r.getResponseCode());
  return r.getResponseCode();
}

var DESTINATARI = 'balestripietro@gmail.com,iacopopicca@gmail.com';
var AVATAR_BRUNO = 'https://balestripietro-commits.github.io/landing-page-travel-podcasting/assets/bruno-avatar.png';
var LOGO = 'https://balestripietro-commits.github.io/landing-page-travel-podcasting/assets/logo-orizzontale-su-scuro.png';   // Pietro e Iacopo; NOTIFICA_EMAIL lo sostituisce

function esc(t) { return String(t || '').replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); }

function avvisaEmail(c) {
  var props = PropertiesService.getScriptProperties();
  var a = props.getProperty('NOTIFICA_EMAIL') || DESTINATARI;
  var foglioUrl = SpreadsheetApp.openById(props.getProperty('FOGLIO_ID')).getUrl();
  var righe = [['Nome', c.nome], ['Comune o ente', c.ente], ['Ruolo', c.ruolo], ['Email', c.email], ['Telefono', c.telefono], ['Messaggio', c.messaggio]]
    .filter(function (r) { return r[1]; })
    .map(function (r) {
      return '<tr><td style="padding:8px 12px 8px 0;color:#5b6b66;font-size:14px;vertical-align:top;white-space:nowrap">' + r[0] +
        '</td><td style="padding:8px 0;color:#173f39;font-size:16px;vertical-align:top">' + esc(r[1]).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('');
  var rispondi = 'mailto:' + encodeURIComponent(c.email) + '?subject=' + encodeURIComponent('Travel Podcasting · ' + c.ente);
  var html =
    '<div style="background:#fff8ef;padding:24px 12px;font-family:Georgia,\'Times New Roman\',serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dce3d6">' +
    '<div style="background:#245c52;padding:22px 26px;color:#fff8ef">' +
    '<img src="' + LOGO + '" width="200" alt="Travel Podcasting" style="display:block;width:200px;max-width:60%;height:auto;border:0">' +
    '<div style="font-size:24px;font-weight:bold;margin-top:8px">Nuovo contatto dalla landing</div>' +
    '<div style="font-size:16px;margin-top:4px;opacity:.9">' + esc(c.ente) + '</div></div>' +
    '<div style="padding:20px 26px 8px"><table style="border-collapse:collapse;width:100%">' + righe + '</table></div>' +
    '<div style="padding:12px 26px 26px">' +
    '<a href="' + rispondi + '" style="display:inline-block;background:#245c52;color:#fff8ef;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;margin:0 8px 8px 0">Rispondi a ' + esc(c.nome.split(' ')[0]) + '</a>' +
    '<a href="' + foglioUrl + '" style="display:inline-block;background:#245c52;color:#fff8ef;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;margin:0 0 8px">Apri il Foglio dei contatti</a>' +
    '</div></div>' +
    '<p style="max-width:560px;margin:14px auto 0;color:#5b6b66;font-size:12px;text-align:center">Mail automatica dal modulo di balestripietro-commits.github.io/landing-page-travel-podcasting · ' + esc(Utilities.formatDate(new Date(), 'Europe/Rome', 'dd/MM/yyyy HH:mm')) + '</p></div>';
  MailApp.sendEmail({
    to: a, replyTo: c.email, name: 'Travel Podcasting',
    subject: 'Nuovo contatto: ' + c.nome + ' · ' + c.ente,
    body: riassunto(c) + '\n\nFoglio: ' + foglioUrl + '\nRispondendo a questa mail scrivete direttamente a ' + c.email + '.',
    htmlBody: html
  });
}

// Prova da Apps Script: crea il Foglio (se manca) e manda su Discord un contatto finto, segnato come prova.
function prova() {
  var c = { nome: 'PROVA – da cancellare', ente: 'Comune di Prova', ruolo: 'Altro', email: 'prova@example.com', telefono: '', messaggio: 'Messaggio di prova', pagina: 'prova()' };
  foglio().appendRow([new Date(), c.nome, c.ente, c.ruolo, c.email, c.telefono, c.messaggio, 'sì', c.pagina]);
  avvisaDiscord(c);
  avvisaEmail(c);
}
