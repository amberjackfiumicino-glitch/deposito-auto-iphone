// Campo importo stile registratore di cassa, per il telefono.
// Stessa idea del PC (`renderer/components/campoEuro.js`): si digitano solo
// cifre e il valore entra dai centesimi (250 → 2,50 €). Niente virgole da
// scrivere, niente punti al posto sbagliato.
//
// PERCHÉ NON BASTAVA ASCOLTARE `input`: `euro()` chiude sempre con " €", e il
// cursore sta in fondo. Il tasto cancella quindi si portava via il simbolo €,
// che non è una cifra: rileggendo le sole cifre il valore tornava identico e
// sembrava che il campo si rifiutasse di farsi correggere. Era il "non mi
// lascia inserire le informazioni" segnalato provando l'APK: si potevano solo
// AGGIUNGERE cifre, mai togliere. Adesso la cancellazione si intercetta prima
// che il browser tocchi il testo (`beforeinput`), come fa il PC con `keydown`.
import { euro, centsDaCifre } from '../shared/formato.js';

/**
 * @param {number|null} valoreInizialeCents
 * @param {{vuoto?: boolean, segnaposto?: string}} [opzioni]
 *   `vuoto`: ammette il valore nullo (nel listino cliente vuol dire «come il
 *   listino generale», ed è diverso da zero, che vuol dire «non paga»).
 */
export function campoEuro(valoreInizialeCents, opzioni = {}) {
  const { vuoto: vuotoAmmesso = false, segnaposto = '' } = opzioni;
  let cents = normalizza(valoreInizialeCents);

  // NB: niente `= 0` sul parametro. Con quello, un `undefined` — cioè "questo
  // cliente non ha un prezzo suo per questo tipo di veicolo" — diventava uno
  // ZERO scritto apposta, e la casella mostrava 0,00 € invece di restare vuota.
  function normalizza(v) {
    if (vuotoAmmesso && (v === null || v === undefined || v === '')) return null;
    return v | 0;   // fuori dalla modalità vuoto, undefined vale 0 come prima
  }

  const el = document.createElement('input');
  el.type = 'text';
  el.className = 'campo-euro';
  el.inputMode = 'numeric';
  el.autocomplete = 'off';
  el.spellcheck = false;
  if (segnaposto) el.placeholder = segnaposto;

  const disegna = () => { el.value = cents === null ? '' : euro(cents); };
  disegna();

  const inFondo = () => requestAnimationFrame(() => {
    try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* niente */ }
  });

  /** Togliendo l'ultima cifra da un campo che ne aveva una sola si svuota. */
  const indietro = () => {
    if (cents === null) return;
    cents = vuotoAmmesso && cents < 10 ? null : Math.floor(cents / 10);
  };

  // La cancellazione si prende QUI: dopo, il testo è già stato toccato e le
  // cifre rimaste sarebbero le stesse di prima.
  el.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward'
      || e.inputType === 'deleteWordBackward' || e.inputType === 'deleteByCut') {
      e.preventDefault();
      if (e.inputType === 'deleteWordBackward') cents = vuotoAmmesso ? null : 0;
      else indietro();
      disegna();
      inFondo();
    }
  });

  // Tastiera fisica (rara sul telefono, normale in prova sul browser).
  el.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      indietro();
      disegna();
      inFondo();
    }
  });

  el.addEventListener('input', () => {
    // si prendono le sole cifre di quello che è rimasto scritto: qui arrivano
    // ormai solo gli inserimenti, la cancellazione l'ha già gestita beforeinput
    const cifre = el.value.replace(/\D/g, '');
    cents = cifre ? centsDaCifre(cifre) : (vuotoAmmesso ? null : 0);
    disegna();
    inFondo();
  });

  el.addEventListener('focus', inFondo);
  el.addEventListener('click', inFondo);

  return {
    el,
    /** @returns {number|null} null solo in modalità "vuoto ammesso" */
    leggiCents: () => cents,
    scriviCents(nuovi) { cents = normalizza(nuovi); disegna(); },
    svuota() { cents = vuotoAmmesso ? null : 0; disegna(); },
  };
}
