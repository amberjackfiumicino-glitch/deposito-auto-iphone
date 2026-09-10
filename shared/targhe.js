// Ordinamento delle targhe italiane. Modulo puro.
// Una targa moderna è LETTERE + NUMERI + LETTERE (es. DA123HX): si confronta
// prima il gruppo di lettere iniziali, poi i numeri, poi le lettere finali.
// Così DA123HX viene prima di DA123SU (H < S) e prima di DA325HX (123 < 325).

/** "DA123HX" → {inizio:'DA', numero:123, fine:'HX'}; null se non riconoscibile. */
export function analizzaTarga(targa) {
  const pulita = String(targa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = /^([A-Z]*)(\d*)([A-Z]*)$/.exec(pulita);
  if (!m || (!m[1] && !m[2])) return null;
  return {
    pulita,
    inizio: m[1],
    numero: m[2] === '' ? -1 : parseInt(m[2], 10),
    cifre: m[2],
    fine: m[3],
  };
}

/** Comparatore per Array.sort(): ordine "da elenco cartaceo". */
export function confrontaTarghe(a, b) {
  const pa = analizzaTarga(a);
  const pb = analizzaTarga(b);
  if (!pa || !pb) {
    return String(a ?? '').localeCompare(String(b ?? ''), 'it');
  }
  if (pa.inizio !== pb.inizio) return pa.inizio.localeCompare(pb.inizio, 'it');
  if (pa.numero !== pb.numero) return pa.numero - pb.numero;
  if (pa.fine !== pb.fine) return pa.fine.localeCompare(pb.fine, 'it');
  return pa.pulita.localeCompare(pb.pulita, 'it');
}

/** Copia ordinata per targa di una lista di veicoli (o di stringhe). */
export function ordinaPerTarga(lista) {
  return [...lista].sort((x, y) =>
    confrontaTarghe(typeof x === 'string' ? x : x?.targa, typeof y === 'string' ? y : y?.targa));
}
