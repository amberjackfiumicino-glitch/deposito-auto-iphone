// L'ultimo elenco visto, tenuto sul telefono per quando il PC è spento.
//
// REGOLA: questa copia serve SOLO a guardare. Non si registra niente da qui e
// non torna mai indietro verso il PC: una sola verità resta il dati.json del
// computer (docs/DECISIONI.md n. 25). Se le due cose divergessero, vincerebbe
// sempre e comunque il PC.

const CHIAVE = 'deposito-copia';
const MOVIMENTI_DI_RISERVA = 200;

/**
 * Salva l'ultimo stato scaricato. Se non ci sta (lo storico cresce e non viene
 * mai potato), si riprova tenendo solo i movimenti più recenti: meglio un
 * elenco completo delle auto dentro che nessuna copia.
 * @returns {boolean} se qualcosa è stato salvato
 */
export function salvaCopia(stato) {
  if (!stato) return false;
  const scrivi = (dati) => {
    localStorage.setItem(CHIAVE, JSON.stringify({ presoISO: new Date().toISOString(), stato: dati }));
    return true;
  };
  try {
    return scrivi(stato);
  } catch {
    try {
      const ridotto = {
        ...stato,
        storico: (stato.storico ?? []).slice(-MOVIMENTI_DI_RISERVA),
      };
      return scrivi(ridotto);
    } catch {
      return false;   // spazio finito: pazienza, si resta senza copia
    }
  }
}

/** @returns {{stato:object, presoISO:string}|null} */
export function leggiCopia() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const copia = JSON.parse(grezzo);
    return copia?.stato ? copia : null;
  } catch {
    return null;
  }
}

export function dimenticaCopia() {
  localStorage.removeItem(CHIAVE);
}

/** "venerdì alle 18:40" — per la fascia in cima allo schermo. */
export function descriviQuando(presoISO) {
  const d = new Date(presoISO);
  if (Number.isNaN(d.getTime())) return 'poco fa';
  const oggi = new Date();
  const stessoGiorno = d.toDateString() === oggi.toDateString();
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (stessoGiorno) return `oggi alle ${ora}`;
  const ieri = new Date(oggi.getTime() - 86_400_000);
  if (d.toDateString() === ieri.toDateString()) return `ieri alle ${ora}`;
  return `${d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} alle ${ora}`;
}
