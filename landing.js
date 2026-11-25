/* Travel Podcasting · script della landing (spostati da index.html per la Content Security Policy). */
/* Telefoni del carosello: niente trascinamento né menu contestuale sulle immagini */
(function(){var p=document.querySelector('.phones');if(!p)return;['dragstart','contextmenu'].forEach(function(t){p.addEventListener(t,function(e){e.preventDefault();});});})();

// Landing page di Travel Podcasting: comparsa allo scorrimento e invio del contatto.

// Indirizzo dell'app web di Google Apps Script che riceve i contatti.
// Finché resta vuoto il modulo non invia nulla e lo dice a chi scrive.
const ENDPOINT_CONTATTI = "https://script.google.com/macros/s/AKfycbwt-Zf3FUcc6cwhehmUQLlnNlNH8V_fspMk9lX5qwan7ABrTDu5bvSv-eaumsAHQEulyA/exec";

function mostraNota(nota, testo, stato) {
  nota.textContent = testo;
  nota.dataset.state = stato;
}

function attivaModulo() {
  const modulo = document.getElementById("contact-form");
  const nota = document.getElementById("form-note");

  if (!modulo || !nota) {
    return;
  }

  modulo.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const dati = new FormData(modulo);
    const campo = (k) => String(dati.get(k) || "").trim();
    const nome = campo("name");
    const ente = campo("ente");
    const email = campo("email").toLowerCase();
    const consenso = dati.get("consent") === "on";

    if (!nome || !ente) {
      mostraNota(nota, "Scrivete il vostro nome e il Comune o l'ente.", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      mostraNota(nota, "Controllate l'indirizzo email.", "error");
      return;
    }

    if (!consenso) {
      mostraNota(nota, "Serve la spunta sul consenso per poter rispondere.", "error");
      return;
    }

    if (!ENDPOINT_CONTATTI) {
      mostraNota(nota, "Il modulo non è ancora collegato: riprovate tra poco.", "error");
      return;
    }

    const pulsante = modulo.querySelector("button[type=submit]");
    pulsante.disabled = true;
    mostraNota(nota, "Invio in corso…", "");

    try {
      await fetch(ENDPOINT_CONTATTI, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          name: nome,
          ente,
          ruolo: campo("ruolo"),
          email,
          telefono: campo("telefono"),
          messaggio: campo("messaggio").slice(0, 1500),
          consent: true,
          website: campo("website"),
          page: location.href,
        }),
      });
      // Con mode "no-cors" la risposta non è leggibile: Apps Script riceve comunque
      // il contenuto, quindi un invio senza eccezioni viene considerato riuscito.
      modulo.reset();
      modulo.hidden = true;
      const ok = document.getElementById("contact-ok");
      if (ok) { ok.hidden = false; ok.setAttribute("tabindex", "-1"); ok.focus(); }
    } catch (errore) {
      mostraNota(
        nota,
        "Invio non riuscito: controllate la connessione e riprovate.",
        "error"
      );
    } finally {
      pulsante.disabled = false;
    }
  });
}

attivaModulo();

(function(){
  var cur=null;
  document.querySelectorAll('.voice').forEach(function(v){
    var a=new Audio(); a.preload='none'; a.src=v.dataset.src;
    var bar=v.querySelector('.voice__bar span');
    v.querySelector('.voice__play').addEventListener('click',function(){
      if(!a.paused){a.pause();return;}
      if(cur&&cur!==a){cur.pause();}
      cur=a; a.play();
    });
    a.addEventListener('play',function(){v.classList.add('is-playing');});
    a.addEventListener('pause',function(){v.classList.remove('is-playing');});
    a.addEventListener('ended',function(){v.classList.remove('is-playing');bar.style.width='0%';});
    a.addEventListener('timeupdate',function(){if(a.duration)bar.style.width=(a.currentTime/a.duration*100)+'%';});
  });
})();

(function(){
  var box=document.getElementById('voice-single'); if(!box) return;
  var a=new Audio(); a.preload='metadata';
  var sel=document.getElementById('vs-select'), name=document.getElementById('vs-name'), bar=document.getElementById('vs-bar'), dot=document.getElementById('vs-dot'), play=document.getElementById('vs-play'), ring=document.getElementById('vs-ring'), cur=document.getElementById('vs-cur'), dur=document.getElementById('vs-dur'), seek=document.getElementById('vs-seek');
  function fmt(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2)}
  function paint(){var p=a.duration?a.currentTime/a.duration*100:0;bar.style.width=p+'%';dot.style.left=p+'%';ring.style.setProperty('--p',(p*3.6)+'deg');cur.textContent=fmt(a.currentTime);seek.setAttribute('aria-valuenow',Math.round(p))}
  function reset(){dur.textContent='--:--';paint()}
  a.src=sel.value;
  sel.addEventListener('change',function(){
    var o=sel.options[sel.selectedIndex]; a.pause(); a.src=o.value; reset();
    name.textContent=o.dataset.name; name.lang=o.dataset.lang; name.dir=o.dataset.dir; var cd=document.getElementById('vs-code'); if(cd) cd.textContent=({zh:'中文'})[o.dataset.lang]||o.dataset.lang.toUpperCase(); a.play();
  });
  play.addEventListener('click',function(){ if(a.paused) a.play(); else a.pause(); });
  a.addEventListener('play',function(){box.classList.add('is-playing')});
  a.addEventListener('pause',function(){box.classList.remove('is-playing')});
  a.addEventListener('ended',function(){box.classList.remove('is-playing');a.currentTime=0;paint()});
  a.addEventListener('loadedmetadata',function(){dur.textContent=fmt(a.duration)});
  a.addEventListener('timeupdate',paint);
  function go(e){var r=seek.getBoundingClientRect();var f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));if(a.duration){a.currentTime=f*a.duration;paint()}}
  var drag=false;
  seek.addEventListener('pointerdown',function(e){drag=true;seek.setPointerCapture(e.pointerId);go(e)});
  seek.addEventListener('pointermove',function(e){if(drag)go(e)});
  seek.addEventListener('pointerup',function(){drag=false});
  seek.addEventListener('keydown',function(e){if(!a.duration)return;if(e.key==='ArrowRight'){a.currentTime=Math.min(a.duration,a.currentTime+5)}else if(e.key==='ArrowLeft'){a.currentTime=Math.max(0,a.currentTime-5)}else return;e.preventDefault();paint()});
})();

(function(){var i=document.getElementById('intro');if(!i)return;
  var partita=false;
  function parti(){ if(partita) return; partita=true; i.classList.add('pronto'); setTimeout(function(){i.remove()},3600); }
  if(document.fonts&&document.fonts.load){ document.fonts.load('700 36px Petrona').then(parti, parti); } else { parti(); }
  setTimeout(parti,1500);
})();

/* Carosello dei telefoni: una «ruota» ferma; le frecce (o i tasti freccia) portano al centro la schermata accanto */
(function () {
  var c = document.querySelector('.carousel'); if (!c) return;
  var track = c.querySelector('.phones'), items = [].slice.call(track.children), i = 0;
  items.forEach(function (p) { p.setAttribute('role', 'group'); p.setAttribute('aria-roledescription', 'schermata'); });
  function show(n) {
    i = (n + items.length) % items.length;
    items.forEach(function (p, k) {
      var d = k - i; if (d > items.length / 2) d -= items.length; if (d < -items.length / 2) d += items.length;
      p.style.setProperty('--d', d);
      p.classList.toggle('is-active', d === 0);
      p.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
    });
  }
  c.querySelector('.carousel__arrow--prev').addEventListener('click', function () { show(i - 1); });
  c.querySelector('.carousel__arrow--next').addEventListener('click', function () { show(i + 1); });
  c.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { show(i - 1); } else if (e.key === 'ArrowRight') { show(i + 1); } });
  items.forEach(function (p, k) { p.addEventListener('click', function () { if (k !== i) show(k); }); });
  var x0 = null;
  track.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  show(1);
})();
