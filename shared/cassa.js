// Chiusura di cassa: calcoli puri e testabili, per giorno e per mese.
// REGOLA CONTABILE: un'auto entra nel bilancio solo QUANDO ESCE (fa cassa il
// record in `storico`, non l'auto in deposito). I pagamenti differiti
// (bonifico 60 gg) contano nel mese di uscita ma restano "da incassare"
// finché non arriva l'accredito.
import { METODI, eDifferito } from './pagamenti.js';

/** Movimenti (uscite + pagamenti abbonamento) compresi in [inizio, fine). */
function movimentiDelPeriodo(stato, inizio, fine) {
  const movimenti = stato.storico.filter((r) => {
    const t = Date.parse(r.uscitaISO);
    return t >= inizio && t < fine;
  });

  for (const abb of stato.abbonamenti ?? []) {
    for (const p of abb.pagamenti ?? []) {
      const t = Date.parse(p.dataISO);
      if (t >= inizio && t < fine) {
        movimenti.push({
          tipo: 'abbonamento',
          id: p.id,
          targa: abb.targa,
          proprietario: abb.proprietario,
          categoriaNome: 'Abbonamento',
          numeroRicevuta: p.numeroRicevuta,
          uscitaISO: p.dataISO,
          totaleCents: p.importoCents,
          metodoPagamento: p.metodoPagamento,
          incassato: p.incassato !== false,
        });
      }
    }
  }
  movimenti.sort((a, b) => a.uscitaISO.localeCompare(b.uscitaISO));
  return movimenti;
}

/** Somme comuni a giorno e mese. */
function calcolaTotali(movimenti) {
  const perMetodo = {};
  for (const m of METODI) {
    perMetodo[m.chiave] = { nome: m.nome, icona: m.icona, totaleCents: 0, numero: 0 };
  }

  let totaleCents = 0, incassatoCents = 0, daIncassareCents = 0;
  for (const r of movimenti) {
    totaleCents += r.totaleCents;
    const slot = perMetodo[r.metodoPagamento];
    if (slot) {
      slot.totaleCents += r.totaleCents;
      slot.numero += 1;
    }
    if (r.incassato === false) daIncassareCents += r.totaleCents;
    else incassatoCents += r.totaleCents;
  }

  return {
    totaleCents,
    incassatoCents,
    daIncassareCents,
    perMetodo,
    // compatibilità con la vista/stampa esistenti
    contantiCents: perMetodo.contanti.totaleCents,
    cartaCents: perMetodo.carta.totaleCents,
  };
}

/** Raggruppa per cliente (nome, o targa se il nome manca). */
function raggruppaPerCliente(movimenti) {
  const mappa = new Map();
  for (const r of movimenti) {
    const nome = r.proprietario?.trim() || r.targa;
    if (!mappa.has(nome)) {
      mappa.set(nome, { nome, targhe: new Set(), numMovimenti: 0, totaleCents: 0, daIncassareCents: 0 });
    }
    const c = mappa.get(nome);
    c.targhe.add(r.targa);
    c.numMovimenti += 1;
    c.totaleCents += r.totaleCents;
    if (r.incassato === false) c.daIncassareCents += r.totaleCents;
  }
  return [...mappa.values()]
    .map((c) => ({ ...c, targhe: [...c.targhe] }))
    .sort((a, b) => b.totaleCents - a.totaleCents);
}

/**
 * Report del giorno che contiene `giornoMs` (istante qualunque, ora locale).
 * @param {{storico:Array, autoInDeposito:Array, abbonamenti?:Array}} stato
 */
export function reportGiorno(stato, giornoMs) {
  const d = new Date(giornoMs);
  const inizio = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fine = inizio + 86_400_000;

  const uscite = movimentiDelPeriodo(stato, inizio, fine);
  const entrate = [...stato.autoInDeposito, ...stato.storico]
    .filter((r) => {
      const t = Date.parse(r.ingressoISO);
      return t >= inizio && t < fine;
    })
    .sort((a, b) => a.ingressoISO.localeCompare(b.ingressoISO));

  return {
    periodo: 'giorno',
    inizioISO: new Date(inizio).toISOString(),
    fineISO: new Date(fine).toISOString(),
    numEntrate: entrate.length,
    numUscite: uscite.length,
    ...calcolaTotali(uscite),
    entrate,
    uscite,
  };
}

/**
 * Report del mese che contiene `meseMs`, con il dettaglio per cliente.
 */
export function reportMese(stato, meseMs) {
  const d = new Date(meseMs);
  const inizio = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const fine = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();

  const uscite = movimentiDelPeriodo(stato, inizio, fine);
  const entrate = [...stato.autoInDeposito, ...stato.storico]
    .filter((r) => {
      const t = Date.parse(r.ingressoISO);
      return t >= inizio && t < fine;
    });

  return {
    periodo: 'mese',
    inizioISO: new Date(inizio).toISOString(),
    fineISO: new Date(fine).toISOString(),
    numEntrate: entrate.length,
    numUscite: uscite.length,
    ...calcolaTotali(uscite),
    perCliente: raggruppaPerCliente(uscite),
    uscite,
    entrate,
  };
}

/**
 * Tutti i movimenti ancora da incassare (bonifici in attesa), dal più vecchio.
 * `scaduti` = scadenza già passata.
 */
export function daIncassare(stato, adessoMs) {
  const attesa = stato.storico
    .filter((r) => r.incassato === false)
    .sort((a, b) => (a.scadenzaISO ?? '').localeCompare(b.scadenzaISO ?? ''));
  const totaleCents = attesa.reduce((s, r) => s + r.totaleCents, 0);
  const scaduti = attesa.filter((r) => r.scadenzaISO && Date.parse(r.scadenzaISO) < adessoMs);
  return {
    movimenti: attesa,
    totaleCents,
    scaduti,
    scadutiCents: scaduti.reduce((s, r) => s + r.totaleCents, 0),
  };
}

export { eDifferito };

// --- Righe di riepilogo per stampa/PDF ed Excel (stesso ordine di colonne) ---
// Le maggiorazioni compaiono NUMERATE ("1, 3"): la colonna resta stretta e i
// nomi per esteso finiscono nella legenda in fondo al report. Il numero è
// fotografato sul veicolo all'ingresso, quindi rinumerare o cancellare una
// maggiorazione non cambia i report già emessi.

export const COLONNE_CASSA = ['Ora', 'Targa', 'Vettura', 'Entrata', 'Uscita',
  'Magg.', 'Totale'];

/** Segno usato quando lo snapshot non porta un numero (record vecchi). */
export const SENZA_NUMERO = '*';

/** Numeri delle maggiorazioni applicate a un movimento: "1, 3" oppure "—". */
export function numeriMaggiorazioni(r) {
  const magg = r.maggiorazioni ?? [];
  if (magg.length === 0) return '—';
  return magg.map((m) => (m.numero > 0 ? String(m.numero) : SENZA_NUMERO)).join(', ');
}

/**
 * Legenda da stampare sotto la tabella: "1 = Veicolo incidentato".
 * Si costruisce dai record del report, NON dal catalogo attuale, così i numeri
 * mostrati in colonna e i nomi in legenda corrispondono sempre.
 * @returns {Array<{numero:string, nome:string}>}
 */
export function legendaMaggiorazioni(movimenti) {
  const perNumero = new Map();
  const senzaNumero = new Set();
  for (const r of movimenti ?? []) {
    for (const m of r.maggiorazioni ?? []) {
      const nome = m.nome || 'Maggiorazione';
      if (m.numero > 0) {
        if (!perNumero.has(m.numero)) perNumero.set(m.numero, nome);
      } else {
        senzaNumero.add(nome);
      }
    }
  }
  const voci = [...perNumero.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([numero, nome]) => ({ numero: String(numero), nome }));
  if (senzaNumero.size > 0) {
    voci.push({ numero: SENZA_NUMERO, nome: [...senzaNumero].join(', ') });
  }
  return voci;
}

/**
 * Una riga di riepilogo cassa nell'ordine richiesto:
 * ora · targa · vettura · entrata · uscita · maggiorazioni (numeri) · totale.
 * @param {object} r movimento (uscita dallo storico o pagamento abbonamento)
 * @param {{dataOra:Function, euro:Function, soloData:Function, mensile?:boolean}} fmt
 */
export function rigaCassa(r, fmt) {
  const abbonamento = r.tipo === 'abbonamento';
  const oraUscita = fmt.dataOra(r.uscitaISO).slice(-5);
  return [
    fmt.mensile ? fmt.soloData(r.uscitaISO) + ' ' + oraUscita : oraUscita,
    r.targa || '—',
    abbonamento
      ? 'Abbonamento'
      : ([r.marca, r.modello].filter(Boolean).join(' ') || r.categoriaNome || '—'),
    abbonamento || !r.ingressoISO ? '—' : fmt.dataOra(r.ingressoISO),
    fmt.dataOra(r.uscitaISO),
    abbonamento ? '—' : numeriMaggiorazioni(r),
    fmt.euro(r.totaleCents),
  ];
}
