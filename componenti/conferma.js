// Chiedere conferma prima di una cosa che non si torna indietro.
// Sul PC lo fa `components/modale.js#conferma`; qui non c'era niente, e senza
// non si possono offrire «annulla entrata» o «elimina» senza rischi.

/**
 * @param {string} messaggio cosa sta per succedere, detto chiaro
 * @param {object} opzioni
 * @param {Function} opzioni.apriFoglio la funzione del guscio (app.js)
 * @param {string} [opzioni.testoConferma] etichetta del pulsante che agisce
 * @param {boolean} [opzioni.pericoloso] colora di rosso il pulsante
 * @returns {Promise<boolean>}
 */
export function conferma(messaggio, { apriFoglio, testoConferma = 'Conferma', pericoloso = false } = {}) {
  return new Promise((risolvi) => {
    let deciso = false;

    let ilMioVelo = null;

    const chiudi = apriFoglio((foglio, chiudiFoglio) => {
      // il velo di QUESTA conferma, non il primo che capita nel documento
      queueMicrotask(() => { ilMioVelo = foglio.closest('.velo'); });
      const p = document.createElement('p');
      p.textContent = messaggio;
      p.style.cssText = 'font-size:18px;line-height:1.4;margin:4px 0 18px;';

      const si = document.createElement('button');
      si.className = 'btn ' + (pericoloso ? 'rosso' : 'verde');
      si.textContent = testoConferma;
      si.addEventListener('click', () => { deciso = true; chiudiFoglio(); risolvi(true); });

      const no = document.createElement('button');
      no.className = 'btn chiaro';
      no.textContent = 'Annulla';
      no.addEventListener('click', () => { deciso = true; chiudiFoglio(); risolvi(false); });

      foglio.append(p, si, no);
    });

    // Chiudere toccando fuori vale come «no»: il dubbio non fa danni.
    // Si guarda il PROPRIO velo: prima si cercava `document.querySelector('.velo')`,
    // cioè il primo del documento, e con una conferma aperta sopra un altro
    // foglio la promessa si scioglieva da sola o non si scioglieva mai.
    const osserva = setInterval(() => {
      if (ilMioVelo && !ilMioVelo.isConnected) {
        clearInterval(osserva);
        if (!deciso) risolvi(false);
      }
    }, 200);
    void chiudi;
  });
}
