// Scelta da un elenco, per il telefono.
//
// PERCHÉ ESISTE: prima si usava `<datalist>`, la tendina nativa del browser.
// Dentro la WebView di Android quel menu si posiziona male e finisce
// sovrapposto alla pagina — è il bug segnalato provando l'app sul campo.
// Qui non c'è niente da posizionare: l'elenco si apre come foglio dal basso,
// che è anche il modo giusto di scegliere su uno schermo che si tocca.
//
// Il campo resta LIBERO: si può scegliere dall'elenco o scrivere a mano una
// cosa che nell'elenco non c'è (una marca strana, un cliente nuovo).

/**
 * @param {object} opzioni
 * @param {string} [opzioni.valore] valore iniziale
 * @param {string} [opzioni.segnaposto] testo grigio quando è vuoto
 * @param {string} [opzioni.titolo] intestazione del foglio
 * @param {() => Array<string|{valore:string, etichetta?:string, dettaglio?:string}>} opzioni.voci
 * @param {(valore:string, voce:any) => void} [opzioni.onScelta]
 * @param {Function} opzioni.apriFoglio la funzione del guscio (app.js)
 * @param {string} [opzioni.classe] classi extra per il campo
 */
export function scelta({
  valore = '', segnaposto = '', titolo = 'Scegli', voci, onScelta, apriFoglio, classe = '',
} = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'scelta';

  const campo = document.createElement('input');
  campo.type = 'text';
  campo.autocomplete = 'off';
  campo.spellcheck = false;
  campo.value = valore;
  campo.placeholder = segnaposto;
  if (classe) campo.className = classe;

  const apri = document.createElement('button');
  apri.type = 'button';
  apri.className = 'scelta-apri';
  apri.textContent = '▾';
  apri.setAttribute('aria-label', 'Apri l\'elenco');

  wrap.append(campo, apri);

  /** Normalizza le voci: si accettano stringhe o oggetti. */
  const normalizza = (v) => (typeof v === 'string'
    ? { valore: v, etichetta: v }
    : { valore: v.valore, etichetta: v.etichetta ?? v.valore, dettaglio: v.dettaglio ?? '', dato: v.dato });

  function apriElenco() {
    const tutte = (voci() ?? []).map(normalizza);

    apriFoglio((foglio, chiudi) => {
      const h = document.createElement('h2');
      h.textContent = titolo;
      h.style.cssText = 'margin:0 0 10px;font-size:19px;';

      const cerca = document.createElement('input');
      cerca.type = 'search';
      cerca.placeholder = 'Cerca…';
      cerca.autocomplete = 'off';

      const elenco = document.createElement('div');
      elenco.className = 'scelta-elenco';

      const disegna = () => {
        const q = cerca.value.trim().toLowerCase();
        const filtrate = q
          ? tutte.filter((v) => `${v.etichetta} ${v.dettaglio ?? ''}`.toLowerCase().includes(q))
          : tutte;
        elenco.innerHTML = '';

        // quello che si sta scrivendo vale come scelta, anche se non è in elenco
        if (q && !filtrate.some((v) => v.etichetta.toLowerCase() === q)) {
          elenco.appendChild(riga({ valore: cerca.value.trim(), etichetta: cerca.value.trim(), dettaglio: 'usa questo' }, chiudi));
        }
        if (filtrate.length === 0 && !q) {
          const vuoto = document.createElement('div');
          vuoto.className = 'vuoto';
          vuoto.textContent = 'Niente in elenco: scrivilo tu.';
          elenco.appendChild(vuoto);
        }
        for (const v of filtrate.slice(0, 200)) elenco.appendChild(riga(v, chiudi));
      };

      cerca.addEventListener('input', disegna);
      disegna();

      foglio.append(h, cerca, elenco);
      // niente focus automatico: su Android la tastiera coprirebbe l'elenco
    });
  }

  function riga(v, chiudi) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scelta-voce';
    const nome = document.createElement('span');
    nome.textContent = v.etichetta;
    b.appendChild(nome);
    if (v.dettaglio) {
      const det = document.createElement('span');
      det.className = 'tenue';
      det.textContent = v.dettaglio;
      b.appendChild(det);
    }
    b.addEventListener('click', () => {
      campo.value = v.valore;
      chiudi();
      onScelta?.(v.valore, v.dato ?? v);
    });
    return b;
  }

  apri.addEventListener('click', apriElenco);
  // toccare il campo apre l'elenco invece della tastiera: è la scorciatoia
  // che ci si aspetta, e si può sempre scrivere dalla ricerca del foglio
  campo.addEventListener('focus', (e) => { e.target.blur(); apriElenco(); });

  return {
    el: wrap,
    leggi: () => campo.value.trim(),
    scrivi(v) { campo.value = v ?? ''; },
  };
}
