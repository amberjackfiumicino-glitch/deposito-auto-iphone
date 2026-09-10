// Rubrica clienti automatica: ritrova l'ultimo passaggio di una targa nello
// storico per precompilare i dati del cliente. Modulo puro, testabile.

/**
 * Ultimo record di storico per la targa data (uscita più recente vince).
 * @returns il record oppure null
 */
export function cercaCliente(storico, targa) {
  if (!targa) return null;
  let migliore = null;
  for (const r of storico) {
    if (r.targa !== targa) continue;
    if (!migliore || r.uscitaISO > migliore.uscitaISO) migliore = r;
  }
  return migliore;
}

/** Numero di visite passate di una targa. */
export function contaVisite(storico, targa) {
  return storico.reduce((n, r) => n + (r.targa === targa ? 1 : 0), 0);
}

/**
 * Metodo di pagamento abituale del cliente: quello dell'ultimo passaggio.
 * Serve a preselezionarlo al checkout (chi paga a 60 giorni lo fa sempre).
 * @returns {string|null}
 */
export function metodoPreferito(storico, targa) {
  return cercaCliente(storico, targa)?.metodoPagamento ?? null;
}
