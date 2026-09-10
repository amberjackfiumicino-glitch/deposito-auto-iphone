// L'anteprima di un report sul telefono, e il PDF.
//
// Il documento (titolo, riepilogo, tabelle) lo costruisce `shared/documenti.js`,
// lo stesso codice che lo costruisce per la stampa del PC: quello che si vede
// qui è per definizione uguale a quello che esce dal computer.
//
// IL PDF: sul PC lo produce Electron con una finestra nascosta; su Android non
// c'è niente del genere, ma il sistema operativo sa già stampare una pagina —
// e nel suo pannello di stampa la prima voce è «Salva come PDF». Il ponte
// verso quel pannello è `StampaAndroid`, aggiunto in MainActivity.java. Fuori
// dall'app (per esempio provandola nel browser) si ripiega su `window.print()`.

/**
 * Apre l'anteprima a tutto schermo.
 * @param {object} doc il documento da `shared/documenti.js`
 * @param {{nomeFile?: string, avvisa?: Function}} opzioni
 */
export function apriDocumento(doc, { nomeFile = 'report', avvisa } = {}) {
  const velo = document.createElement('div');
  velo.className = 'velo-documento';

  const foglio = document.createElement('div');
  foglio.className = 'documento-stampa';

  // --- intestazione ---
  const h = document.createElement('h1');
  h.textContent = doc.titolo;
  foglio.appendChild(h);
  if (doc.sottotitolo) {
    const sot = document.createElement('p');
    sot.className = 'documento-sottotitolo';
    sot.textContent = doc.sottotitolo;
    foglio.appendChild(sot);
  }

  // --- riepilogo in caselle ---
  if (doc.riepilogo?.length) {
    const box = document.createElement('div');
    box.className = 'documento-riepilogo';
    for (const [etichetta, valore] of doc.riepilogo) {
      const cella = document.createElement('div');
      const e = document.createElement('div');
      e.className = 'etichetta';
      e.textContent = etichetta;
      const v = document.createElement('div');
      v.className = 'valore';
      v.textContent = valore;
      cella.append(e, v);
      box.appendChild(cella);
    }
    foglio.appendChild(box);
  }

  // --- tabelle ---
  for (const sezione of doc.sezioni ?? []) {
    if (sezione.titolo) {
      const h2 = document.createElement('h2');
      h2.textContent = sezione.titolo;
      foglio.appendChild(h2);
    }
    if (!sezione.righe?.length) {
      const vuoto = document.createElement('p');
      vuoto.className = 'documento-vuoto';
      vuoto.textContent = sezione.seVuoto ?? 'Niente da mostrare.';
      foglio.appendChild(vuoto);
      continue;
    }

    const indiciEuro = new Set(sezione.indiciEuro ?? []);
    // su uno schermo stretto la tabella scorre di lato invece di spezzarsi
    const scorri = document.createElement('div');
    scorri.className = 'documento-tabella';
    const tab = document.createElement('table');

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    (sezione.colonne ?? []).forEach((c, i) => {
      const th = document.createElement('th');
      th.textContent = c;
      if (indiciEuro.has(i)) th.className = 'euro';
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tab.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const riga of sezione.righe) {
      const tr = document.createElement('tr');
      riga.forEach((cella, i) => {
        const td = document.createElement('td');
        td.textContent = cella ?? '';
        if (indiciEuro.has(i)) td.className = 'euro';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    if (sezione.totale) {
      const tr = document.createElement('tr');
      tr.className = 'totale';
      sezione.totale.forEach((cella, i) => {
        const td = document.createElement('td');
        td.textContent = cella ?? '';
        if (indiciEuro.has(i)) td.className = 'euro';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    tab.appendChild(tbody);
    scorri.appendChild(tab);
    foglio.appendChild(scorri);

    if (sezione.nota) {
      const nota = document.createElement('p');
      nota.className = 'documento-nota';
      nota.textContent = sezione.nota;
      foglio.appendChild(nota);
    }
  }

  if (doc.piede) {
    const piede = document.createElement('p');
    piede.className = 'documento-piede';
    piede.textContent = doc.piede;
    foglio.appendChild(piede);
  }

  // --- comandi (non finiscono nel PDF: li nasconde il foglio di stampa) ---
  const comandi = document.createElement('div');
  comandi.className = 'documento-comandi';

  const pdf = document.createElement('button');
  pdf.className = 'btn verde';
  pdf.textContent = '📄 Salva PDF o stampa';
  pdf.addEventListener('click', () => stampa(nomeFile, avvisa));

  const chiudi = document.createElement('button');
  chiudi.className = 'btn chiaro';
  chiudi.textContent = 'Chiudi';
  chiudi.addEventListener('click', () => {
    velo.remove();
    document.body.classList.remove('documento-aperto');
  });

  comandi.append(pdf, chiudi);
  foglio.appendChild(comandi);

  velo.appendChild(foglio);
  document.body.appendChild(velo);
  // mentre l'anteprima è aperta il resto della pagina non scorre sotto
  document.body.classList.add('documento-aperto');
  velo.scrollTop = 0;
  return () => { velo.remove(); document.body.classList.remove('documento-aperto'); };
}

/** Apre il pannello di stampa del telefono, dove c'è «Salva come PDF». */
function stampa(nomeFile, avvisa) {
  const ponte = globalThis.StampaAndroid;
  if (ponte && typeof ponte.stampa === 'function') {
    try {
      ponte.stampa(String(nomeFile));
      return;
    } catch (err) {
      avvisa?.('Stampa non riuscita: ' + err.message, 'ko');
      return;
    }
  }
  // fuori dall'app Android (browser, prova): la stampa del browser fa lo stesso
  if (typeof globalThis.print === 'function') {
    globalThis.print();
    return;
  }
  avvisa?.('Da qui non si può salvare il PDF: usa il computer.', 'ko');
}
