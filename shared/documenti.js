// I REPORT STAMPABILI, costruiti in un posto solo.
//
// Storico, scheda cliente e chiusura di cassa producono tutti lo stesso tipo di
// oggetto — titolo, riepilogo, tabelle — che poi qualcuno disegna: sul PC la
// finestra nascosta di stampa (`renderer/ricevuta/documento.js`), sul telefono
// l'anteprima a schermo (`mobile/componenti/documento.js`).
//
// PERCHÉ CONDIVISO: la richiesta era «sul telefono uguale al PC». L'unico modo
// per garantirlo davvero è che le colonne, i totali e l'ordine li decida lo
// stesso codice; se le due parti costruissero il report per conto loro, si
// scosterebbero al primo ritocco e nessuno se ne accorgerebbe.
//
// Modulo PURO: nessun DOM, nessun Electron.
import { euro, dataOra, soloData } from './formato.js';
import { METODI, descriviMetodo } from './pagamenti.js';
import { COLONNE_CASSA, rigaCassa, legendaMaggiorazioni } from './cassa.js';
import { descriviAnagrafica } from './clienti.js';
import { calcolaTotale } from './pricing.js';
import { prospettoGiacenza, COLONNE_GIACENZA } from './giacenza.js';

export const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/**
 * La forma di un documento:
 * {
 *   titolo, sottotitolo, orizzontale?,
 *   riepilogo: [[etichetta, valore], …],
 *   sezioni: [{ titolo?, colonne, indiciEuro?, righe, totale?, seVuoto?, nota? }],
 *   piede?: string
 * }
 */

// --- storico ----------------------------------------------------------------

/**
 * @param {Array} righe le uscite che si stanno guardando (già filtrate)
 * @param {{testo?:string, dal?:string, al?:string}} filtri per il sottotitolo
 */
export function documentoStorico(righe, filtri = {}) {
  let totale = 0;
  let daIncassare = 0;
  const perMetodo = new Map(METODI.map((m) => [m.chiave, 0]));
  for (const r of righe) {
    totale += r.totaleCents;
    perMetodo.set(r.metodoPagamento, (perMetodo.get(r.metodoPagamento) ?? 0) + r.totaleCents);
    if (r.incassato === false) daIncassare += r.totaleCents;
  }

  const riepilogo = [[`Fatturato (${righe.length} uscite)`, euro(totale)]];
  for (const m of METODI) riepilogo.push([m.nome, euro(perMetodo.get(m.chiave) ?? 0)]);
  if (daIncassare > 0) riepilogo.push(['Da incassare', euro(daIncassare)]);

  const parti = [];
  if (filtri.testo) parti.push(`ricerca "${filtri.testo}"`);
  if (filtri.dal) parti.push(`dal ${soloData(filtri.dal + 'T12:00:00')}`);
  if (filtri.al) parti.push(`al ${soloData(filtri.al + 'T12:00:00')}`);

  const colonne = ['Ricevuta', 'Targa', 'Veicolo', 'Stato', 'Cliente',
    'Entrata', 'Uscita', 'Pagamento', 'Totale'];
  const totaleRiga = new Array(colonne.length).fill('');
  totaleRiga[0] = 'TOTALE';
  totaleRiga[colonne.length - 1] = euro(totale);

  return {
    titolo: 'STORICO VEICOLI',
    sottotitolo: parti.length ? parti.join(' · ') : 'tutte le uscite registrate',
    orizzontale: true,
    riepilogo,
    sezioni: [{
      colonne,
      indiciEuro: [colonne.length - 1],
      righe: righe.map((r) => [
        r.numeroRicevuta,
        r.targa,
        [r.marca, r.modello].filter(Boolean).join(' ') || r.categoriaNome || '—',
        r.statoVeicoloNome || '—',
        r.proprietario || '—',
        dataOra(r.ingressoISO),
        dataOra(r.uscitaISO),
        descriviMetodo(r.metodoPagamento) + (r.incassato === false ? ' (da incassare)' : ''),
        euro(r.totaleCents),
      ]),
      totale: totaleRiga,
      seVuoto: 'Nessuna uscita con questi filtri.',
    }],
  };
}

// --- scheda cliente ---------------------------------------------------------

/**
 * @param {object} r il resoconto di `riepilogoCliente` (contiene `cliente`)
 * @param {string} etichettaPeriodo per esempio "agosto 2026"
 */
export function documentoSchedaCliente(r, etichettaPeriodo) {
  const c = r.cliente;
  const sezioni = [];

  if (r.inDeposito.length > 0) {
    const adesso = Date.now();
    let maturato = 0;
    const righe = r.inDeposito.map((a) => {
      const ingressoMs = Date.parse(a.ingressoISO);
      const conto = calcolaTotale(a, ingressoMs, Math.max(adesso, ingressoMs));
      maturato += conto.totaleCents;
      return [
        a.targa,
        [a.categoriaNome, a.marca, a.modello].filter(Boolean).join(' ') || '—',
        a.statoVeicoloNome || '—',
        dataOra(a.ingressoISO),
        a.posto || '—',
        euro(conto.totaleCents),
      ];
    });
    sezioni.push({
      titolo: 'Auto attualmente in deposito',
      colonne: ['Targa', 'Veicolo', 'Stato', 'Entrata', 'Posto', 'Maturato a oggi'],
      indiciEuro: [5],
      righe,
      totale: ['TOTALE', '', '', '', '', euro(maturato)],
    });
  }

  sezioni.push({
    titolo: 'Riepilogo mese per mese',
    colonne: ['Mese', 'Soste', 'Dovuto', 'Pagato', 'Da incassare'],
    indiciEuro: [2, 3, 4],
    righe: r.mesi.map((m) => [
      `${NOMI_MESI[m.mese]} ${m.anno}`,
      String(m.numMovimenti),
      euro(m.fatturatoCents),
      euro(m.incassatoCents),
      m.daIncassareCents ? euro(m.daIncassareCents) : '—',
    ]),
    totale: ['TOTALE', String(r.numMovimenti), euro(r.fatturatoCents), euro(r.incassatoCents),
      r.daIncassareCents ? euro(r.daIncassareCents) : '—'],
    seVuoto: 'Nessuna sosta conclusa in questo periodo.',
  });

  sezioni.push({
    titolo: 'Dettaglio delle soste',
    colonne: ['Uscita', 'Ricevuta', 'Targa', 'Veicolo', 'Stato', 'Pagamento', 'Totale'],
    indiciEuro: [6],
    righe: r.movimenti.map((m) => [
      soloData(m.uscitaISO),
      m.numeroRicevuta ?? '—',
      m.targa,
      [m.marca, m.modello].filter(Boolean).join(' ') || m.categoriaNome || '—',
      m.statoVeicoloNome || '—',
      descriviMetodo(m.metodoPagamento) + (m.incassato === false ? ' (da incassare)' : ''),
      euro(m.totaleCents),
    ]),
    seVuoto: 'Nessuna sosta in questo periodo.',
  });

  // i dati fiscali in testa: così la scheda stampata si può usare per fatturare
  const anagrafica = descriviAnagrafica(c);
  const recapiti = [c.telefono, c.email, c.pec].filter(Boolean).join(' · ');
  const sottotitolo = [c.ragioneSociale, anagrafica, recapiti, `periodo: ${etichettaPeriodo}`]
    .filter(Boolean).join(' — ');

  const riepilogo = [
    ['Auto in gestione', String(r.inDeposito.length)],
    ['Totale dovuto', euro(r.fatturatoCents)],
    ['Pagato', euro(r.incassatoCents)],
    ['Da incassare', euro(r.daIncassareCents)],
    ['Soste nel periodo', String(r.numMovimenti)],
  ];
  if (c.partitaIva) riepilogo.push(['Partita IVA', c.partitaIva]);
  if (c.codiceFiscale) riepilogo.push(['Codice fiscale', c.codiceFiscale]);
  if (c.codiceSdi) riepilogo.push(['Codice SDI', c.codiceSdi]);
  if (c.iban) riepilogo.push(['IBAN', c.iban]);

  return { titolo: `SCHEDA CLIENTE — ${c.nome}`, sottotitolo, riepilogo, sezioni };
}

// --- chiusura di cassa ------------------------------------------------------

/**
 * Le stesse colonne e la stessa legenda del report che esce dal PC
 * (`renderer/ricevuta/rapporto.js`): la fonte è `shared/cassa.js`.
 * @param {object} report da `reportGiorno` o `reportMese`
 * @param {object} impostazioni per l'intestazione
 */
export function documentoCassa(report, impostazioni = {}) {
  const mensile = report.periodo === 'mese';
  const inizio = new Date(report.inizioISO);
  const fmt = { euro, dataOra, soloData, mensile };

  const movimenti = report.uscite ?? [];
  const legenda = legendaMaggiorazioni(movimenti);

  const perMetodo = (chiave) => euro(report.perMetodo?.[chiave]?.totaleCents ?? 0);
  const riepilogo = [
    ['Totale', euro(report.totaleCents)],
    ['Contanti', perMetodo('contanti')],
    ['Carta', perMetodo('carta')],
    ['Bonifico 60 gg', perMetodo('bonifico60')],
    [mensile ? 'Movimenti del mese' : 'Movimenti del giorno', String(movimenti.length)],
  ];
  if (report.daIncassareCents) riepilogo.push(['Da incassare', euro(report.daIncassareCents)]);

  const colonne = [...COLONNE_CASSA];
  const totaleRiga = new Array(colonne.length).fill('');
  totaleRiga[0] = 'TOTALE';
  totaleRiga[colonne.length - 1] = euro(report.totaleCents);

  const sezioni = [];

  // resoconto per cliente: solo nel mensile, come sul PC
  if (mensile && report.perCliente?.length) {
    sezioni.push({
      titolo: 'Resoconto per cliente',
      colonne: ['Cliente', 'Targhe', 'Mov.', 'Da incassare', 'Totale'],
      indiciEuro: [3, 4],
      righe: report.perCliente.map((c) => [
        c.nome,
        c.targhe.join(', '),
        String(c.numMovimenti),
        c.daIncassareCents ? euro(c.daIncassareCents) : '—',
        euro(c.totaleCents),
      ]),
    });
  }

  sezioni.push({
    titolo: mensile ? 'Movimenti del mese' : 'Movimenti del giorno',
    colonne,
    indiciEuro: [colonne.length - 1],
    righe: movimenti.map((r) => rigaCassa(r, fmt)),
    totale: totaleRiga,
    seVuoto: 'Nessun movimento in questo periodo.',
    // la legenda dei numeri va sotto la tabella, come sul PC: in colonna c'è
    // il numero per risparmiare spazio, il nome per esteso sta qui
    nota: legenda.length
      ? 'Maggiorazioni: ' + legenda.map((v) => `${v.numero} = ${v.nome}`).join(' · ')
      : '',
  });

  return {
    titolo: mensile ? 'INCASSI DEL MESE' : 'CHIUSURA DI CASSA',
    sottotitolo: [
      impostazioni.nomeAttivita,
      mensile ? `${NOMI_MESI[inizio.getMonth()]} ${inizio.getFullYear()}` : soloData(report.inizioISO),
    ].filter(Boolean).join(' — '),
    orizzontale: true,
    riepilogo,
    sezioni,
  };
}

// --- prospetto delle auto in deposito ---------------------------------------

/**
 * Le auto dentro adesso, col costo maturato. Le stesse colonne che il PC
 * stampa (`renderer/ricevuta/giacenza.js`): telefono e note restano fuori,
 * perché su un foglio appesantiscono senza servire.
 */
export function documentoGiacenza(stato, impostazioni = {}, adessoMs = Date.now()) {
  const prospetto = prospettoGiacenza(stato, adessoMs, { dataOra, euro });
  const tieni = ['Targa', 'Categoria', 'Stato veicolo', 'Cliente', 'Veicolo',
    'Posto', 'Entrata', 'Giorni in giacenza', 'Tariffa', 'Extra', 'Costo maturato a oggi'];
  const indici = tieni.map((c) => COLONNE_GIACENZA.indexOf(c)).filter((i) => i >= 0);

  const colonne = indici.map((i) => COLONNE_GIACENZA[i]);
  const totaleRiga = new Array(colonne.length).fill('');
  totaleRiga[0] = 'TOTALE';
  totaleRiga[colonne.length - 1] = euro(prospetto.totaleCents);

  return {
    titolo: 'AUTO IN DEPOSITO',
    sottotitolo: [impostazioni.nomeAttivita, `situazione al ${dataOra(new Date(adessoMs).toISOString())}`]
      .filter(Boolean).join(' — '),
    orizzontale: true,
    riepilogo: [
      ['Veicoli in deposito', String(prospetto.quante)],
      ['Maturato a oggi', euro(prospetto.totaleCents)],
    ],
    sezioni: [{
      colonne,
      indiciEuro: [colonne.length - 1],
      righe: prospetto.righe.map((r) => indici.map((i) => r[i])),
      totale: totaleRiga,
      seVuoto: 'Nessuna auto in deposito.',
    }],
  };
}

// --- ricevuta di una sosta --------------------------------------------------

/**
 * La ricevuta di un movimento già chiuso. Sul PC è un modello grafico a sé
 * (`ricevuta.html`); qui si usa la stessa forma degli altri report, con gli
 * stessi importi — serve per ristamparla stando fuori.
 */
export function documentoRicevuta(record, impostazioni = {}) {
  const righe = [
    ['Targa', record.targa],
    ['Veicolo', [record.categoriaNome, record.marca, record.modello].filter(Boolean).join(' ') || '—'],
    ['Cliente', [record.proprietario, record.telefono].filter(Boolean).join(' · ') || '—'],
  ];
  if (record.statoVeicoloNome) righe.push(['Stato del mezzo', record.statoVeicoloNome]);
  if (record.posto) righe.push(['Posto', record.posto]);
  righe.push(['Entrata', record.ingressoISO ? dataOra(record.ingressoISO) : '—']);
  righe.push(['Uscita', dataOra(record.uscitaISO)]);
  righe.push([record.modoTariffa === 'oraria' ? 'Ore fatturate' : 'Giorni fatturati',
    String(record.unitaFatturate ?? '—')]);

  const conti = [
    ['Costo fisso di partenza', euro(record.costoFissoCents ?? 0)],
    [record.modoTariffa === 'oraria' ? 'Tariffa oraria' : 'Tariffa giornaliera',
      euro(record.tariffaCents ?? 0)],
  ];
  for (const m of record.maggiorazioni ?? []) {
    conti.push([m.nome || 'Maggiorazione', euro(m.importoCents ?? 0)]);
  }

  return {
    titolo: `RICEVUTA ${record.numeroRicevuta ?? ''}`.trim(),
    sottotitolo: [impostazioni.nomeAttivita, impostazioni.indirizzo,
      impostazioni.telefono ? `Tel. ${impostazioni.telefono}` : '']
      .filter(Boolean).join(' — '),
    riepilogo: [
      ['Totale', euro(record.totaleCents)],
      ['Pagamento', descriviMetodo(record.metodoPagamento)],
      ['Incassato', record.incassato === false ? 'no, in attesa' : 'sì'],
      ['Emessa il', soloData(record.uscitaISO)],
    ],
    sezioni: [
      { titolo: 'Veicolo e sosta', colonne: ['Voce', 'Dato'], righe },
      {
        titolo: 'Conteggio',
        colonne: ['Voce', 'Importo'],
        indiciEuro: [1],
        righe: conti,
        totale: ['TOTALE', euro(record.totaleCents)],
      },
    ],
    piede: impostazioni.piedeRicevuta ?? '',
  };
}
