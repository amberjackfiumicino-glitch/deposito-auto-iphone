// Formattazione it-IT (euro, date) e normalizzazione input.
// Modulo puro come pricing.js: nessun import, nessun DOM.

/** 1150 → "11,50 €" */
export function euro(cents) {
  const n = (cents | 0) / 100;
  return n.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

/** "11,50" | "11.50" | "11" → 1150 centesimi; null se non è un numero valido */
export function parseEuro(testo) {
  if (typeof testo !== 'string') return null;
  const pulito = testo.trim().replace(/€/g, '').replace(/\s/g, '').replace(',', '.');
  if (pulito === '' || !/^\d+(\.\d{1,2})?$/.test(pulito)) return null;
  return Math.round(parseFloat(pulito) * 100);
}

/**
 * Stile registratore di cassa: le cifre entrano dai centesimi.
 * "250" → 250 (2,50 €), "1500" → 1500 (15,00 €), "" → 0.
 * Ignora tutto ciò che non è cifra; cap a 99.999,99 € per evitare importi assurdi.
 */
export function centsDaCifre(testo) {
  const cifre = String(testo ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (cifre === '') return 0;
  return Math.min(parseInt(cifre, 10), 9_999_999);
}

/** "ab 123 cd" → "AB123CD" */
export function normalizzaTarga(testo) {
  return String(testo ?? '').toUpperCase().replace(/[\s-]/g, '');
}

/** ISO → "09/08/2026 16:30" */
export function dataOra(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/** ISO → "09/08/2026" */
export function soloData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Date → valore per <input type="datetime-local"> (ora locale, senza secondi) */
export function perInputDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Data locale in formato AAAA-MM-GG (per nomi di file e chiavi di giorno).
 * NON usare toISOString(): di notte, con fuso positivo, darebbe il giorno prima.
 */
export function dataLocale(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Mese locale in formato AAAA-MM. */
export function meseLocale(d = new Date()) {
  return dataLocale(d).slice(0, 7);
}
