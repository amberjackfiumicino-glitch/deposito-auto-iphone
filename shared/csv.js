// Generazione CSV per Excel italiano: separatore ";", BOM UTF-8, importi con
// la virgola. Modulo puro come pricing.js: nessun import, testabile in Node.

/** Escapa un valore per il CSV (racchiude tra virgolette se serve). */
export function campoCsv(valore) {
  const s = String(valore ?? '');
  if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * righe: array di array di valori → testo CSV completo di BOM.
 * Il BOM fa capire a Excel che il file è UTF-8 (accenti giusti al doppio click).
 */
export function generaCsv(righe) {
  const corpo = righe.map((r) => r.map(campoCsv).join(';')).join('\r\n');
  return '﻿' + corpo + '\r\n';
}

/** "11,50 €" per Excel italiano (virgola decimale). */
function euroCsv(cents) {
  return ((cents | 0) / 100).toFixed(2).replace('.', ',') + ' €';
}

const plurale = (n) => `${n} moviment${n === 1 ? 'o' : 'i'}`;

/**
 * Righe di totale da appendere all'export storico: una per metodo di
 * pagamento (con la quota ancora da incassare) più il totale generale.
 * @param {Array} records record di storico
 * @param {Array<{chiave:string,nome:string}>} metodi elenco metodi conosciuti
 * @param {number} colonne quante colonne ha la tabella (per allineare i totali)
 */
export function righeTotaliPerMetodo(records, metodi, colonne = 4) {
  const larghezza = Math.max(4, colonne);
  /** riga con etichetta in testa, nota a fianco e importo nell'ultima colonna */
  const riga = (etichetta, nota, cents) => {
    const celle = new Array(larghezza).fill('');
    celle[0] = etichetta;
    celle[1] = nota;
    celle[larghezza - 1] = euroCsv(cents);
    return celle;
  };

  let totale = 0, totaleAttesa = 0;
  const perMetodo = new Map(metodi.map((m) => [m.chiave, { nome: m.nome, cents: 0, attesa: 0, numero: 0 }]));

  for (const r of records) {
    totale += r.totaleCents;
    const slot = perMetodo.get(r.metodoPagamento);
    if (!slot) continue;
    slot.cents += r.totaleCents;
    slot.numero += 1;
    if (r.incassato === false) {
      slot.attesa += r.totaleCents;
      totaleAttesa += r.totaleCents;
    }
  }

  const righe = [new Array(larghezza).fill(''), (() => {
    const intestazione = new Array(larghezza).fill('');
    intestazione[0] = 'TOTALI PER PAGAMENTO';
    return intestazione;
  })()];

  for (const { nome, cents, attesa, numero } of perMetodo.values()) {
    const nota = plurale(numero) + (attesa > 0 ? ` — da incassare ${euroCsv(attesa)}` : '');
    righe.push(riga(nome, nota, cents));
  }

  const notaTotale = plurale(records.length)
    + (totaleAttesa > 0 ? ` — da incassare ${euroCsv(totaleAttesa)}` : '');
  righe.push(riga('TOTALE GENERALE', notaTotale, totale));
  return righe;
}
