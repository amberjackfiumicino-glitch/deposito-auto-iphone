// Suggerimento del posto libero. Modulo puro.

/** "B12" → {fila:'B', numero:12} oppure null se non riconoscibile. */
export function analizzaPosto(posto) {
  const m = /^([A-Z]+)\s*-?\s*(\d+)$/.exec(String(posto ?? '').trim().toUpperCase());
  if (!m) return null;
  return { fila: m[1], numero: parseInt(m[2], 10) };
}

/**
 * Propone il primo numero libero nella fila più affollata (dove probabilmente
 * si sta riempiendo). Nessun posto assegnato in giro → "A1".
 */
export function suggerisciPosto(autoInDeposito) {
  const occupati = new Map(); // fila → Set numeri
  for (const a of autoInDeposito) {
    const p = analizzaPosto(a.posto);
    if (!p) continue;
    if (!occupati.has(p.fila)) occupati.set(p.fila, new Set());
    occupati.get(p.fila).add(p.numero);
  }
  if (occupati.size === 0) return 'A1';
  let migliore = null;
  for (const [fila, numeri] of occupati) {
    if (!migliore || numeri.size > occupati.get(migliore).size) migliore = fila;
  }
  const numeri = occupati.get(migliore);
  let n = 1;
  while (numeri.has(n)) n++;
  return `${migliore}${n}`;
}
