// Abbonamenti mensili: logica pura e testabile.

const GIORNO_MS = 86_400_000;

/** 'attivo' | 'in_scadenza' (≤7 giorni alla fine) | 'scaduto' */
export function statoAbbonamento(abb, adessoMs) {
  const fine = Date.parse(abb.fineISO);
  if (fine <= adessoMs) return 'scaduto';
  if (fine - adessoMs <= 7 * GIORNO_MS) return 'in_scadenza';
  return 'attivo';
}

/** Abbonamento non scaduto per la targa, o null. */
export function abbonamentoAttivo(abbonamenti, targa, adessoMs) {
  if (!targa) return null;
  let migliore = null;
  for (const a of abbonamenti ?? []) {
    if (a.targa !== targa) continue;
    if (Date.parse(a.fineISO) <= adessoMs) continue;
    if (!migliore || a.fineISO > migliore.fineISO) migliore = a;
  }
  return migliore;
}

/**
 * Nuova scadenza dopo un rinnovo di un mese: parte dalla scadenza attuale se
 * è nel futuro (rinnovo anticipato non regala giorni), da adesso se scaduto.
 */
export function rinnovaScadenza(fineISO, adessoMs) {
  const base = new Date(Math.max(Date.parse(fineISO), adessoMs));
  const nuova = new Date(base);
  nuova.setMonth(nuova.getMonth() + 1);
  return nuova.toISOString();
}

/**
 * Il pagamento di un abbonamento vestito da record di uscita, perché la
 * ricevuta sappia stamparlo.
 *
 * Sta qui e non nel processo main perché adesso la ricevuta la fa anche il
 * telefono: due copie della stessa trasformazione vorrebbero dire, prima o
 * poi, due ricevute diverse per lo stesso incasso.
 */
export function ricevutaAbbonamento(abb, pagamento) {
  return {
    tipo: 'abbonamento',
    id: pagamento.id,
    targa: abb.targa,
    proprietario: abb.proprietario,
    telefono: abb.telefono,
    marca: '', modello: '', posto: '',
    numeroRicevuta: pagamento.numeroRicevuta,
    totaleCents: pagamento.importoCents,
    metodoPagamento: pagamento.metodoPagamento,
    ingressoISO: abb.inizioISO,
    uscitaISO: pagamento.dataISO,
    fineISO: abb.fineISO,
  };
}
