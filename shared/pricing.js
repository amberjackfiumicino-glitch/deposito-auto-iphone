// Matematica dei soldi del deposito. INVARIANTI:
// - modulo PURO: nessun import, nessun accesso a DOM/Electron/filesystem
// - denaro sempre in centesimi interi
// - frazione iniziata = pagata intera (minimo 1 unità)
// Usato da: renderer (costo live), main (totale alla chiusura), tests.

const MS_ORA = 3_600_000;
const MS_GIORNO = 86_400_000;

/**
 * Unità fatturate (ore o giorni) fra ingresso e uscita.
 * Ogni frazione iniziata conta come unità intera; minimo 1.
 * @param {number} ingressoMs epoch ms
 * @param {number} uscitaMs epoch ms
 * @param {"oraria"|"giornaliera"} modoTariffa
 */
export function calcolaUnita(ingressoMs, uscitaMs, modoTariffa) {
  if (!Number.isFinite(ingressoMs) || !Number.isFinite(uscitaMs)) {
    throw new Error('Data di ingresso o uscita non valida');
  }
  const durataMs = uscitaMs - ingressoMs;
  if (durataMs < 0) {
    throw new Error("L'uscita precede l'ingresso");
  }
  const unitMs = modoTariffa === 'oraria' ? MS_ORA : MS_GIORNO;
  return Math.max(1, Math.ceil(durataMs / unitMs));
}

/**
 * Totale in centesimi: costo fisso + unità × tariffa + maggiorazioni.
 * Le maggiorazioni (es. veicolo incidentato, bonifica) sono fotografate
 * sull'auto all'ingresso; ognuna è "unatantum" (si somma una volta sola)
 * oppure "perUnita" (si somma per ogni ora/giorno fatturato).
 * Un'auto senza maggiorazioni dà lo stesso totale di sempre.
 * @param {{modoTariffa:"oraria"|"giornaliera", costoFissoCents:number, tariffaCents:number, maggiorazioni?:Array}} auto
 * @param {number} ingressoMs
 * @param {number} uscitaMs
 */
export function calcolaTotale(auto, ingressoMs, uscitaMs) {
  const unita = calcolaUnita(ingressoMs, uscitaMs, auto.modoTariffa);
  const costoFissoCents = auto.costoFissoCents | 0;
  const tariffaCents = auto.tariffaCents | 0;
  const subtotaleCents = unita * tariffaCents;

  const dettaglioMaggiorazioni = [];
  let maggiorazioniCents = 0;
  for (const m of auto.maggiorazioni ?? []) {
    const importoCents = m.importoCents | 0;
    if (importoCents <= 0) continue;
    const perUnita = m.modo === 'perUnita';
    const totale = perUnita ? importoCents * unita : importoCents;
    maggiorazioniCents += totale;
    dettaglioMaggiorazioni.push({
      chiave: m.chiave,
      nome: m.nome,
      importoCents,
      modo: perUnita ? 'perUnita' : 'unatantum',
      totaleCents: totale,
    });
  }

  return {
    unita,
    costoFissoCents,
    tariffaCents,
    subtotaleCents,
    maggiorazioniCents,
    dettaglioMaggiorazioni,
    totaleCents: costoFissoCents + subtotaleCents + maggiorazioniCents,
  };
}

/**
 * Durata leggibile in italiano: "2 giorni e 3 ore", "45 minuti", "1 ora".
 * @param {number} durataMs
 */
export function descriviDurata(durataMs) {
  if (durataMs < 0) durataMs = 0;
  const giorni = Math.floor(durataMs / MS_GIORNO);
  const ore = Math.floor((durataMs % MS_GIORNO) / MS_ORA);
  const minuti = Math.floor((durataMs % MS_ORA) / 60_000);
  const parti = [];
  if (giorni > 0) parti.push(giorni === 1 ? '1 giorno' : `${giorni} giorni`);
  if (ore > 0) parti.push(ore === 1 ? '1 ora' : `${ore} ore`);
  if (minuti > 0 || parti.length === 0) {
    parti.push(minuti === 1 ? '1 minuto' : `${minuti} minuti`);
  }
  return parti.join(' e ');
}
