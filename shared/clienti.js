// Rubrica clienti: schede riutilizzabili all'ingresso e resoconto per cliente.
// Modulo puro: nessun import, nessun DOM.

/**
 * Campi anagrafici oltre a nome/telefono/email/note, raggruppati come nel form.
 * Sono tutti testo libero e opzionali: nessun formato imposto, l'utente deve
 * poter scrivere (e forzare) quello che vuole.
 */
export const GRUPPI_ANAGRAFICA = [
  {
    titolo: 'Dati fiscali',
    campi: [
      { chiave: 'ragioneSociale', etichetta: 'Ragione sociale' },
      { chiave: 'partitaIva', etichetta: 'Partita IVA' },
      { chiave: 'codiceFiscale', etichetta: 'Codice fiscale' },
    ],
  },
  {
    titolo: 'Sede',
    campi: [
      { chiave: 'indirizzo', etichetta: 'Indirizzo' },
      { chiave: 'cap', etichetta: 'CAP' },
      { chiave: 'citta', etichetta: 'Città' },
      { chiave: 'provincia', etichetta: 'Provincia' },
    ],
  },
  {
    titolo: 'Fatturazione elettronica',
    campi: [
      { chiave: 'pec', etichetta: 'PEC' },
      { chiave: 'codiceSdi', etichetta: 'Codice destinatario (SDI)' },
      { chiave: 'iban', etichetta: 'IBAN' },
    ],
  },
  {
    titolo: 'Referente',
    campi: [
      { chiave: 'referente', etichetta: 'Persona di riferimento' },
      { chiave: 'telefono2', etichetta: 'Secondo telefono' },
      { chiave: 'email2', etichetta: 'Seconda email' },
    ],
  },
];

/** Elenco piatto delle chiavi anagrafiche aggiuntive. */
export const CAMPI_ANAGRAFICA = GRUPPI_ANAGRAFICA.flatMap((g) => g.campi.map((c) => c.chiave));

/** Tutti i campi anagrafici a stringa vuota: default e migrazione. */
export function anagraficaVuota() {
  const v = {};
  for (const chiave of CAMPI_ANAGRAFICA) v[chiave] = '';
  return v;
}

/** "P.IVA 01234567890 · Via Roma 1, 00054 Fiumicino (RM)" per schermo e stampa. */
export function descriviAnagrafica(cliente) {
  const fiscali = [
    cliente?.partitaIva ? 'P.IVA ' + cliente.partitaIva : '',
    cliente?.codiceFiscale ? 'C.F. ' + cliente.codiceFiscale : '',
  ].filter(Boolean).join(' · ');
  const luogo = [cliente?.cap, cliente?.citta].filter(Boolean).join(' ');
  const sede = [cliente?.indirizzo, luogo, cliente?.provincia ? '(' + cliente.provincia + ')' : '']
    .filter(Boolean).join(', ');
  return [fiscali, sede].filter(Boolean).join(' · ');
}

/** Chiave di deduplica: nome normalizzato + ultime cifre del telefono. */
export function chiaveCliente(nome, telefono) {
  const n = String(nome ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const t = String(telefono ?? '').replace(/\D/g, '');
  return `${n}|${t}`;
}

export function normalizzaNome(nome) {
  return String(nome ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Ricava la rubrica dai veicoli già registrati (usata dalla migrazione).
 * @returns {{clienti:Array, perChiave:Map}} clienti dedotti e indice per collegarli
 */
export function costruisciRubrica(stato, creaId = () => Math.random().toString(36).slice(2)) {
  const perChiave = new Map();
  const clienti = [];
  const tutti = [...(stato.autoInDeposito ?? []), ...(stato.storico ?? [])];

  for (const r of tutti) {
    const nome = normalizzaNome(r.proprietario);
    if (!nome) continue;
    const chiave = chiaveCliente(nome, r.telefono);
    if (!perChiave.has(chiave)) {
      const cliente = {
        id: creaId(),
        nome,
        telefono: String(r.telefono ?? '').trim(),
        email: '',
        note: '',
        creatoISO: r.ingressoISO ?? new Date().toISOString(),
      };
      perChiave.set(chiave, cliente);
      clienti.push(cliente);
    }
  }
  return { clienti, perChiave };
}

/** Filtra la rubrica per nome o telefono (per la tendina di ricerca). */
export function cercaClienti(clienti, testo) {
  const q = String(testo ?? '').trim().toLowerCase();
  if (!q) return [...(clienti ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const soloCifre = q.replace(/\D/g, '');
  return (clienti ?? [])
    .filter((c) => c.nome.toLowerCase().includes(q)
      || (soloCifre && String(c.telefono).replace(/\D/g, '').includes(soloCifre)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

export function trovaCliente(stato, clienteId) {
  return (stato.clienti ?? []).find((c) => c.id === clienteId) ?? null;
}

/** Tutti i movimenti che riguardano un cliente (per id, o per nome se il record è vecchio). */
function movimentiDelCliente(stato, cliente) {
  const chiave = chiaveCliente(cliente.nome, cliente.telefono);
  return (stato.storico ?? []).filter((r) =>
    (r.clienteId && r.clienteId === cliente.id)
    || (!r.clienteId && chiaveCliente(r.proprietario, r.telefono) === chiave));
}

/**
 * Riepilogo per la scheda cliente: auto in gestione adesso e storico mese per
 * mese (dovuto / pagato / da incassare).
 */
export function riepilogoCliente(stato, clienteId, intervallo = null) {
  const cliente = trovaCliente(stato, clienteId);
  if (!cliente) return null;
  const chiave = chiaveCliente(cliente.nome, cliente.telefono);

  const inDeposito = (stato.autoInDeposito ?? []).filter((a) =>
    (a.clienteId && a.clienteId === cliente.id)
    || (!a.clienteId && chiaveCliente(a.proprietario, a.telefono) === chiave));

  // le auto in gestione sono sempre quelle di adesso; le soste si filtrano
  const movimenti = movimentiDelCliente(stato, cliente)
    .filter((r) => {
      if (!intervallo) return true;
      const t = Date.parse(r.uscitaISO);
      return t >= intervallo.inizioMs && t < intervallo.fineMs;
    })
    .sort((a, b) => b.uscitaISO.localeCompare(a.uscitaISO));

  const perMese = new Map();
  let fatturatoCents = 0, incassatoCents = 0, daIncassareCents = 0;
  for (const r of movimenti) {
    const d = new Date(r.uscitaISO);
    const chiaveMese = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!perMese.has(chiaveMese)) {
      perMese.set(chiaveMese, {
        chiave: chiaveMese, anno: d.getFullYear(), mese: d.getMonth(),
        fatturatoCents: 0, incassatoCents: 0, daIncassareCents: 0, numMovimenti: 0,
      });
    }
    const m = perMese.get(chiaveMese);
    m.numMovimenti += 1;
    m.fatturatoCents += r.totaleCents;
    fatturatoCents += r.totaleCents;
    if (r.incassato === false) {
      m.daIncassareCents += r.totaleCents;
      daIncassareCents += r.totaleCents;
    } else {
      m.incassatoCents += r.totaleCents;
      incassatoCents += r.totaleCents;
    }
  }

  return {
    cliente,
    intervallo,
    inDeposito,
    movimenti,
    mesi: [...perMese.values()].sort((a, b) => b.chiave.localeCompare(a.chiave)),
    fatturatoCents,
    incassatoCents,
    daIncassareCents,
    numMovimenti: movimenti.length,
  };
}

/**
 * Riepiloghi di TUTTI i clienti in una sola passata sui dati.
 * Serve all'elenco della rubrica: calcolarli uno per uno significherebbe
 * rileggere l'intero storico per ogni cliente a ogni tasto premuto.
 * @returns {Map<string, {inDeposito:number, numMovimenti:number, fatturatoCents:number, incassatoCents:number, daIncassareCents:number}>}
 */
export function riepiloghiRapidi(stato) {
  const perId = new Map();
  const perChiave = new Map();
  const vuoto = () => ({ inDeposito: 0, numMovimenti: 0, fatturatoCents: 0, incassatoCents: 0, daIncassareCents: 0 });

  for (const c of stato.clienti ?? []) {
    const r = vuoto();
    perId.set(c.id, r);
    perChiave.set(chiaveCliente(c.nome, c.telefono), r);
  }
  const trova = (record) => (record.clienteId && perId.get(record.clienteId))
    || perChiave.get(chiaveCliente(record.proprietario, record.telefono));

  for (const a of stato.autoInDeposito ?? []) {
    const r = trova(a);
    if (r) r.inDeposito += 1;
  }
  for (const m of stato.storico ?? []) {
    const r = trova(m);
    if (!r) continue;
    r.numMovimenti += 1;
    r.fatturatoCents += m.totaleCents;
    if (m.incassato === false) r.daIncassareCents += m.totaleCents;
    else r.incassatoCents += m.totaleCents;
  }
  return perId;
}

/**
 * Intervallo di date per i resoconti: giorno, settimana (lunedì→domenica),
 * mese, anno oppure tutto. Calcolato in ora LOCALE.
 * @param {'giorno'|'settimana'|'mese'|'anno'|'tutto'} tipo
 * @param {number} riferimentoMs un istante qualunque dentro il periodo
 */
export function intervalloPeriodo(tipo, riferimentoMs) {
  const d = new Date(riferimentoMs);
  const anno = d.getFullYear();
  const mese = d.getMonth();
  const giorno = d.getDate();

  if (tipo === 'giorno') {
    const inizio = new Date(anno, mese, giorno).getTime();
    return { tipo, inizioMs: inizio, fineMs: inizio + 86_400_000 };
  }
  if (tipo === 'settimana') {
    const scarto = (d.getDay() + 6) % 7; // lunedì = 0
    const inizio = new Date(anno, mese, giorno - scarto).getTime();
    return { tipo, inizioMs: inizio, fineMs: inizio + 7 * 86_400_000 };
  }
  if (tipo === 'mese') {
    return {
      tipo,
      inizioMs: new Date(anno, mese, 1).getTime(),
      fineMs: new Date(anno, mese + 1, 1).getTime(),
    };
  }
  if (tipo === 'anno') {
    return {
      tipo,
      inizioMs: new Date(anno, 0, 1).getTime(),
      fineMs: new Date(anno + 1, 0, 1).getTime(),
    };
  }
  return { tipo: 'tutto', inizioMs: -Infinity, fineMs: Infinity };
}

const NOMI_MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** "settimana dal 17 al 23 agosto 2026" — da mostrare e da stampare. */
export function descriviPeriodo(intervallo) {
  if (intervallo.tipo === 'tutto') return 'tutto lo storico';
  const dal = new Date(intervallo.inizioMs);
  const al = new Date(intervallo.fineMs - 1);
  if (intervallo.tipo === 'giorno') {
    return dal.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (intervallo.tipo === 'settimana') {
    return `settimana dal ${dal.getDate()} ${NOMI_MESI_IT[dal.getMonth()]}`
      + ` al ${al.getDate()} ${NOMI_MESI_IT[al.getMonth()]} ${al.getFullYear()}`;
  }
  if (intervallo.tipo === 'mese') return `${NOMI_MESI_IT[dal.getMonth()]} ${dal.getFullYear()}`;
  return String(dal.getFullYear());
}

/**
 * Schede diverse che portano lo stesso nome.
 *
 * Succede senza accorgersene: si registra un'auto scrivendo il nome a mano e
 * nasce una scheda nuova accanto a quella che c'era già. Poi il listino
 * personalizzato finisce su una e il lavoro sull'altra, e i prezzi su misura
 * sembrano non funzionare. Meglio dirlo prima che dopo.
 *
 * @returns {Array<{nome:string, schede:Array}>} solo i gruppi con più di una
 */
export function schedeDoppie(clienti = []) {
  const perNome = new Map();
  for (const c of clienti) {
    const chiave = normalizzaNome(c?.nome ?? '').toLowerCase();
    if (!chiave) continue;
    if (!perNome.has(chiave)) perNome.set(chiave, []);
    perNome.get(chiave).push(c);
  }
  return [...perNome.entries()]
    .filter(([, schede]) => schede.length > 1)
    .map(([, schede]) => ({ nome: schede[0].nome, schede }));
}

/** Le altre schede che si chiamano come questa. */
export function gemelleDi(clienti, cliente) {
  if (!cliente?.nome) return [];
  const chiave = normalizzaNome(cliente.nome).toLowerCase();
  return (clienti ?? []).filter(
    (c) => c.id !== cliente.id && normalizzaNome(c.nome ?? '').toLowerCase() === chiave,
  );
}
