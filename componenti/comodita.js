// Le comodità che ci si aspetta da un'app fatta bene, applicate in un colpo
// solo a tutte le schermate.
//
// PERCHÉ QUI E NON IN OGNI VISTA: sono regole meccaniche che dipendono dal tipo
// del campo, non da cosa fa la schermata. Scriverle a mano su ogni `input`
// significherebbe dimenticarsene su metà, e infatti era così: il campo del
// telefono apriva la tastiera delle lettere, la targa veniva "corretta"
// dall'autocorrettore, e il tasto Invio diceva sempre «vai a capo».
//
// Si chiama dopo aver montato la schermata, e non tocca niente che sia già
// stato deciso a mano dalla vista.

/** Tastiera giusta, autocorrettore fermo, tasto Invio sensato. */
export function comodita(radice) {
  const campi = [...radice.querySelectorAll('input, textarea')];

  for (const [i, el] of campi.entries()) {
    const tipo = (el.getAttribute('type') ?? 'text').toLowerCase();

    // niente autocorrettore e niente maiuscola automatica dove darebbe fastidio
    // (targhe, nomi propri, note tecniche): correggere è più lento che scrivere
    if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off');
    if (!el.hasAttribute('autocorrect')) el.setAttribute('autocorrect', 'off');
    if (el.spellcheck !== false) el.spellcheck = false;

    // la tastiera giusta al primo colpo
    if (!el.getAttribute('inputmode')) {
      if (tipo === 'tel') el.setAttribute('inputmode', 'tel');
      else if (tipo === 'email') el.setAttribute('inputmode', 'email');
      else if (tipo === 'number') el.setAttribute('inputmode', 'numeric');
      else if (tipo === 'search') el.setAttribute('inputmode', 'search');
    }
    if (tipo === 'tel' && !el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'tel');
    if (tipo === 'email') {
      el.setAttribute('autocomplete', 'email');
      el.setAttribute('autocapitalize', 'off');
    }

    // il tasto in basso a destra della tastiera dice cosa succede davvero
    if (!el.hasAttribute('enterkeyhint') && el.tagName === 'INPUT') {
      if (tipo === 'search') el.setAttribute('enterkeyhint', 'search');
      else el.setAttribute('enterkeyhint', i === campi.length - 1 ? 'done' : 'next');
    }

    // Invio passa al campo dopo invece di non fare niente
    if (el.tagName === 'INPUT' && tipo !== 'search' && !el.dataset.invioPronto) {
      el.dataset.invioPronto = '1';
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const dopo = campi.slice(i + 1).find((c) => !c.disabled && c.offsetParent !== null);
        if (dopo) { e.preventDefault(); dopo.focus(); }
        else el.blur();          // ultimo campo: si chiude la tastiera
      });
    }
  }

  for (const el of radice.querySelectorAll('input[type="search"]')) crocettaPerPulire(el);
}

/**
 * La ✕ che svuota il campo di ricerca. Su Android quella nativa non compare, e
 * cancellare una targa lettera per lettera col pollice è una piccola tortura.
 */
function crocettaPerPulire(el) {
  if (el.parentElement?.classList.contains('con-crocetta')) return;

  const guscio = document.createElement('div');
  guscio.className = 'con-crocetta';
  el.parentElement.insertBefore(guscio, el);
  guscio.appendChild(el);

  const via = document.createElement('button');
  via.type = 'button';
  via.className = 'crocetta';
  via.textContent = '✕';
  via.setAttribute('aria-label', 'Svuota');
  via.addEventListener('click', () => {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  });
  guscio.appendChild(via);

  const mostra = () => { via.style.display = el.value ? '' : 'none'; };
  el.addEventListener('input', mostra);
  mostra();
}
