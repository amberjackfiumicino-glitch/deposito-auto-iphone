// Metodi di pagamento. Il bonifico a 60 giorni è "differito": l'importo entra
// negli incassi del mese in cui l'auto esce (competenza), ma resta segnato
// DA INCASSARE finché il bonifico non arriva davvero.
// Modulo puro: nessun import, nessun DOM.

export const METODI = [
  { chiave: 'contanti', nome: 'Contanti', icona: '💵', differito: false, giorniDilazione: 0 },
  { chiave: 'carta', nome: 'Carta', icona: '💳', differito: false, giorniDilazione: 0 },
  { chiave: 'bonifico60', nome: 'Bonifico 60 gg', icona: '🏦', differito: true, giorniDilazione: 60 },
];

export function trovaMetodo(chiave) {
  return METODI.find((m) => m.chiave === chiave) ?? null;
}

export function metodoValido(chiave) {
  return METODI.some((m) => m.chiave === chiave);
}

/** "💵 Contanti" — etichetta pronta da mostrare. */
export function descriviMetodo(chiave) {
  const m = trovaMetodo(chiave);
  return m ? `${m.icona} ${m.nome}` : String(chiave ?? '—');
}

export function eDifferito(chiave) {
  return !!trovaMetodo(chiave)?.differito;
}

/**
 * Scadenza del pagamento: null per i metodi immediati,
 * uscita + giorni di dilazione per quelli differiti.
 * @returns {string|null} ISO
 */
export function scadenzaPagamento(chiave, uscitaMs) {
  const m = trovaMetodo(chiave);
  if (!m || !m.differito) return null;
  return new Date(uscitaMs + m.giorniDilazione * 86_400_000).toISOString();
}

/** Un record è ancora da incassare? (i vecchi record senza campo sono incassati) */
export function daIncassare(record) {
  return record?.incassato === false;
}

/** Da incassare e scadenza già passata. */
export function scaduto(record, adessoMs) {
  return daIncassare(record) && !!record.scadenzaISO && Date.parse(record.scadenzaISO) < adessoMs;
}
