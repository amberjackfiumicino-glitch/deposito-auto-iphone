// IL MOTORE: tutte le operazioni sui dati, in un posto solo.
//
// Modulo PURO: riceve lo `stato` come parametro, lo muta e restituisce il pezzo
// che interessa. Nessun import di Node, nessun accesso al disco, nessuna rete.
// Lo usano il PC (src/main/azioni.js, che ci mette intorno getStato + salva) e
// il telefono (che ci mette intorno il database). Un solo motore, due porte.
//
// INVARIANTI:
//  - il totale di una sosta si calcola QUI dentro (`chiudiAuto`) e da nessun'altra
//    parte: renderer e telefono mostrano numeri di cortesia, questo fa fede;
//  - ogni record toccato prende `aggiornatoISO`: senza, la sincronia non sa
//    quale versione è la più recente;
//  - ogni cancellazione lascia un TOMBSTONE in `stato.cancellati`: senza, il
//    record cancellato qui resusciterebbe dall'altro dispositivo.
//
// I NUMERI (ricevuta, ingresso) NON nascono qui: arrivano da fuori, perché con
// più dispositivi devono venire dal database, che è l'unico a poterli garantire
// unici. Vedi src/main/numeri.js.
import { calcolaTotale } from './pricing.js';
import { normalizzaTarga } from './formato.js';
import { rinnovaScadenza } from './abbonamenti.js';
import { trovaCategoria } from './categorie.js';
import { trovaStato } from './statiVeicolo.js';
import { normalizzaNome, chiaveCliente, CAMPI_ANAGRAFICA, anagraficaVuota } from './clienti.js';
import { normalizzaPreferenze, preferenzeDefault } from './listinoCliente.js';
import { metodoValido, eDifferito, scadenzaPagamento } from './pagamenti.js';

/** Per quanto tempo si ricorda una cancellazione (poi il tombstone si pota). */
export const GIORNI_TOMBSTONE = 90;

const adesso = () => new Date().toISOString();

/** `crypto.randomUUID` esiste identico in Node 19+ e in ogni browser recente. */
function nuovoId() {
  return globalThis.crypto.randomUUID();
}

/** Marca il record come modificato adesso: è ciò che la sincronia confronta. */
export function timbra(record, quandoISO = adesso()) {
  record.aggiornatoISO = quandoISO;
  return record;
}

/** Annota che un record è stato cancellato, così non torna indietro dal cloud. */
export function segnaCancellato(stato, tipo, id, quandoISO = adesso()) {
  if (!Array.isArray(stato.cancellati)) stato.cancellati = [];
  const gia = stato.cancellati.find((c) => c.tipo === tipo && c.id === id);
  if (gia) gia.quandoISO = quandoISO;
  else stato.cancellati.push({ tipo, id, quandoISO });
  return stato.cancellati;
}

/** Toglie i tombstone troppo vecchi: hanno già fatto il loro lavoro. */
export function potaCancellati(stato, adessoMs = Date.now()) {
  if (!Array.isArray(stato.cancellati)) return [];
  const limite = adessoMs - GIORNI_TOMBSTONE * 86_400_000;
  stato.cancellati = stato.cancellati.filter((c) => Date.parse(c.quandoISO) >= limite);
  return stato.cancellati;
}

// --- validazioni ------------------------------------------------------------

function validaAuto(dati) {
  const targa = normalizzaTarga(dati.targa);
  if (!targa) throw new Error('La targa è obbligatoria');
  const ingressoMs = Date.parse(dati.ingressoISO);
  if (Number.isNaN(ingressoMs)) throw new Error('Data di ingresso non valida');
  if (dati.modoTariffa !== 'oraria' && dati.modoTariffa !== 'giornaliera') {
    throw new Error('Tipo di tariffa non valido');
  }
  if (!Number.isInteger(dati.tariffaCents) || dati.tariffaCents < 0) {
    throw new Error('Tariffa non valida');
  }
  if (!Number.isInteger(dati.costoFissoCents) || dati.costoFissoCents < 0) {
    throw new Error('Costo fisso non valido');
  }
  return targa;
}

const validaMetodoAbbonamento = (m) => {
  if (m !== 'contanti' && m !== 'carta') throw new Error('Metodo di pagamento non valido');
};

/** Categoria fotografata sull'auto: id + nome, così rinominarla non tocca lo storico. */
function categoriaSuAuto(stato, dati) {
  const cat = trovaCategoria(stato.impostazioni, dati.categoriaId);
  return { categoriaId: cat.id, categoriaNome: cat.nome };
}

/** Stato veicolo fotografato sull'auto (informativo, non tocca il prezzo). */
function statoSuAuto(stato, dati) {
  const s = trovaStato(stato.impostazioni, dati.statoVeicoloId);
  return { statoVeicoloId: s ? s.id : '', statoVeicoloNome: s ? s.nome : '' };
}

/** Ripulisce le maggiorazioni scelte (snapshot di nome, numero, importo e modo).
 *  Il `numero` è quello che finirà nella colonna della cassa: fotografarlo qui
 *  vuol dire che rinumerare il catalogo non cambia i report già emessi. Se chi
 *  chiama non lo manda (telefono, script) lo si pesca dal catalogo. */
export function normalizzaMaggiorazioni(maggiorazioni, catalogo = []) {
  if (!Array.isArray(maggiorazioni)) return [];
  const numeroDi = (m) => {
    if (Number.isInteger(m.numero) && m.numero > 0) return m.numero;
    const def = catalogo.find((c) => c.id === m.chiave);
    return def?.numero > 0 ? def.numero : 0;
  };
  return maggiorazioni
    .filter((m) => m && Number.isInteger(m.importoCents) && m.importoCents > 0)
    .map((m) => ({
      chiave: String(m.chiave ?? '').trim(),
      nome: String(m.nome ?? 'Maggiorazione').trim(),
      importoCents: m.importoCents,
      modo: m.modo === 'perUnita' ? 'perUnita' : 'unatantum',
      numero: numeroDi(m),
    }));
}

// --- i numeri quando si lavora da soli --------------------------------------

/**
 * Il prossimo numero dal contatore locale. È il RIPIEGO per chi non usa il
 * cloud: con un dispositivo solo non esiste il rischio di numeri doppi, e la
 * cassa deve poter chiudere anche senza account (piano BASE, invariante 8).
 * Chi ha il cloud acceso passa invece dal database, che li assegna atomicamente.
 */
export function numeroLocaleRicevuta(stato, annoOggi = new Date().getFullYear()) {
  if (stato.contatoreRicevute.anno !== annoOggi) {
    stato.contatoreRicevute = { anno: annoOggi, numero: 0 };
  }
  stato.contatoreRicevute.numero += 1;
  return `${annoOggi}-${String(stato.contatoreRicevute.numero).padStart(4, '0')}`;
}

export function numeroLocaleIngresso(stato) {
  stato.contatoreIngressi = (stato.contatoreIngressi | 0) + 1;
  return `I-${String(stato.contatoreIngressi).padStart(4, '0')}`;
}

// --- quali numeri servono a chi chiama --------------------------------------

/** L'ingresso ha un numero solo col plugin ticket acceso (serve per stamparlo). */
export function serveNumeroIngresso(stato) {
  return !!stato.impostazioni?.funzioni?.ticket;
}

// --- operazioni -------------------------------------------------------------

export function aggiungiAuto(stato, dati, { numeroIngresso = '' } = {}) {
  const targa = validaAuto(dati);
  if (stato.autoInDeposito.some((a) => a.targa === targa)) {
    throw new Error(`La targa ${targa} risulta già in deposito`);
  }
  const auto = timbra({
    id: nuovoId(),
    numeroIngresso: serveNumeroIngresso(stato) ? String(numeroIngresso ?? '') : '',
    targa,
    proprietario: String(dati.proprietario ?? '').trim(),
    telefono: String(dati.telefono ?? '').trim(),
    marca: String(dati.marca ?? '').trim(),
    modello: String(dati.modello ?? '').trim(),
    note: String(dati.note ?? '').trim(),
    posto: String(dati.posto ?? '').trim().toUpperCase(),
    ingressoISO: new Date(dati.ingressoISO).toISOString(),
    modoTariffa: dati.modoTariffa,
    costoFissoCents: dati.costoFissoCents,
    tariffaCents: dati.tariffaCents,
    ...categoriaSuAuto(stato, dati),
    ...statoSuAuto(stato, dati),
    clienteId: String(dati.clienteId ?? '').trim(),
    maggiorazioni: normalizzaMaggiorazioni(dati.maggiorazioni, stato.impostazioni.maggiorazioni),
  });
  stato.autoInDeposito.push(auto);
  return auto;
}

export function modificaAuto(stato, id, dati) {
  const auto = stato.autoInDeposito.find((a) => a.id === id);
  if (!auto) throw new Error('Auto non trovata');
  const targa = validaAuto({ ...auto, ...dati });
  if (stato.autoInDeposito.some((a) => a.targa === targa && a.id !== id)) {
    throw new Error(`La targa ${targa} risulta già in deposito`);
  }
  Object.assign(auto, {
    targa,
    proprietario: String(dati.proprietario ?? auto.proprietario).trim(),
    telefono: String(dati.telefono ?? auto.telefono).trim(),
    marca: String(dati.marca ?? auto.marca).trim(),
    modello: String(dati.modello ?? auto.modello).trim(),
    note: String(dati.note ?? auto.note).trim(),
    posto: String(dati.posto ?? auto.posto ?? '').trim().toUpperCase(),
    ingressoISO: new Date(dati.ingressoISO ?? auto.ingressoISO).toISOString(),
    modoTariffa: dati.modoTariffa ?? auto.modoTariffa,
    costoFissoCents: dati.costoFissoCents ?? auto.costoFissoCents,
    tariffaCents: dati.tariffaCents ?? auto.tariffaCents,
    ...categoriaSuAuto(stato, { categoriaId: dati.categoriaId ?? auto.categoriaId }),
    ...statoSuAuto(stato, { statoVeicoloId: dati.statoVeicoloId ?? auto.statoVeicoloId }),
    clienteId: String(dati.clienteId ?? auto.clienteId ?? '').trim(),
    maggiorazioni: dati.maggiorazioni
      ? normalizzaMaggiorazioni(dati.maggiorazioni, stato.impostazioni.maggiorazioni)
      : (auto.maggiorazioni ?? []),
  });
  return timbra(auto);
}

/**
 * Chiude la sosta e produce il record di storico. QUI nasce il totale.
 * @param {string} numeroRicevuta assegnato da fuori (dal database, così è unico)
 */
export function chiudiAuto(stato, id, { uscitaISO, metodoPagamento, numeroRicevuta } = {}) {
  const idx = stato.autoInDeposito.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Auto non trovata');
  if (!metodoValido(metodoPagamento)) throw new Error('Metodo di pagamento non valido');
  if (!numeroRicevuta) throw new Error('Numero di ricevuta mancante');

  const auto = stato.autoInDeposito[idx];
  const uscitaMs = uscitaISO ? Date.parse(uscitaISO) : Date.now();
  if (Number.isNaN(uscitaMs)) throw new Error('Data di uscita non valida');

  // se l'orario d'ingresso è più avanti dell'uscita (ora inserita a mano un
  // po' in avanti) non si blocca la cassa: si fattura il minimo di 1 unità
  const ingressoMs = Date.parse(auto.ingressoISO);
  const conto = calcolaTotale(auto, ingressoMs, Math.max(uscitaMs, ingressoMs));
  const differito = eDifferito(metodoPagamento);
  const record = timbra({
    ...auto,
    uscitaISO: new Date(uscitaMs).toISOString(),
    unitaFatturate: conto.unita,
    totaleCents: conto.totaleCents,
    maggiorazioniCents: conto.maggiorazioniCents,
    metodoPagamento,
    // i pagamenti differiti (bonifico 60 gg) entrano subito negli incassi
    // del mese di uscita, ma restano segnati DA INCASSARE fino all'accredito
    incassato: !differito,
    incassatoISO: differito ? null : new Date(uscitaMs).toISOString(),
    scadenzaISO: scadenzaPagamento(metodoPagamento, uscitaMs),
    numeroRicevuta: String(numeroRicevuta),
  });
  stato.autoInDeposito.splice(idx, 1);
  stato.storico.push(record);
  // l'auto sparisce da "in deposito" e riappare in "storico" con lo stesso id:
  // per il cloud sono due collezioni diverse, quindi serve il tombstone
  segnaCancellato(stato, 'auto', id, record.aggiornatoISO);
  return record;
}

export function segnaIncassato(stato, recordId, incassato = true) {
  const record = stato.storico.find((r) => r.id === recordId);
  if (!record) throw new Error('Movimento non trovato');
  record.incassato = !!incassato;
  record.incassatoISO = incassato ? adesso() : null;
  return timbra(record);
}

export function annullaEntrata(stato, id) {
  const idx = stato.autoInDeposito.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Auto non trovata');
  stato.autoInDeposito.splice(idx, 1);
  segnaCancellato(stato, 'auto', id);
  return id;
}

export function salvaCliente(stato, dati) {
  const nome = normalizzaNome(dati.nome);
  if (!nome) throw new Error('Il nome del cliente è obbligatorio');
  const campi = {
    nome,
    telefono: String(dati.telefono ?? '').trim(),
    email: String(dati.email ?? '').trim(),
    note: String(dati.note ?? '').trim(),
  };
  // anagrafica e listino si aggiornano SOLO se il chiamante li manda: dal
  // telefono arrivano nome e telefono soltanto, e P.IVA e tariffe del
  // cliente non devono azzerarsi per questo
  for (const chiave of CAMPI_ANAGRAFICA) {
    if (Object.hasOwn(dati, chiave)) campi[chiave] = String(dati[chiave] ?? '').trim();
  }
  if (Object.hasOwn(dati, 'preferenze')) {
    campi.preferenze = normalizzaPreferenze(dati.preferenze);
  }

  let cliente = dati.id ? stato.clienti.find((c) => c.id === dati.id) : null;
  if (!cliente) {
    // stesso nome e stesso telefono → è lo stesso cliente, non un doppione
    const chiave = chiaveCliente(campi.nome, campi.telefono);
    cliente = stato.clienti.find((c) => chiaveCliente(c.nome, c.telefono) === chiave) ?? null;
  }

  const toccate = [];
  if (cliente) {
    Object.assign(cliente, campi);
    timbra(cliente);
    // il nome aggiornato segue anche i veicoli ancora in deposito
    for (const a of stato.autoInDeposito) {
      if (a.clienteId === cliente.id) {
        a.proprietario = cliente.nome;
        a.telefono = cliente.telefono;
        toccate.push(timbra(a));
      }
    }
  } else {
    cliente = timbra({
      id: nuovoId(),
      ...anagraficaVuota(),
      preferenze: preferenzeDefault(),
      ...campi,
      creatoISO: adesso(),
    });
    stato.clienti.push(cliente);
  }
  return { cliente, autoToccate: toccate };
}

/**
 * Unisce due schede dello stesso cliente in una sola.
 *
 * PERCHÉ SERVE: nel deposito vero c'erano due schede «Avis», create in momenti
 * diversi con due numeri di telefono. Il listino personalizzato stava su una,
 * il lavoro di tutti i giorni sull'altra — e registrando un'entrata uscivano i
 * prezzi generali. Da fuori sembrava che i prezzi su misura «non funzionassero»,
 * mentre l'app stava semplicemente guardando l'altra scheda.
 *
 * Chi resta si prende tutto: auto in deposito, storico, e i campi che aveva
 * vuoti (telefono, P.IVA, IBAN…). Il listino di chi resta vince, ma se non ne
 * ha uno prende quello dell'altro — è il caso che ci ha portato qui.
 *
 * @returns {{cliente:object, autoSpostate:number, storicoSpostato:number}}
 */
export function unisciClienti(stato, idTenere, idDaUnire) {
  if (idTenere === idDaUnire) throw new Error('Sono la stessa scheda');
  const tenere = stato.clienti.find((c) => c.id === idTenere);
  const unire = stato.clienti.find((c) => c.id === idDaUnire);
  if (!tenere || !unire) throw new Error('Scheda cliente non trovata');

  // i campi che chi resta ha vuoti li prende dall'altro: non si perde niente
  for (const chiave of CAMPI_ANAGRAFICA) {
    if (!String(tenere[chiave] ?? '').trim() && String(unire[chiave] ?? '').trim()) {
      tenere[chiave] = unire[chiave];
    }
  }
  for (const chiave of ['telefono', 'email', 'note']) {
    if (!String(tenere[chiave] ?? '').trim() && String(unire[chiave] ?? '').trim()) {
      tenere[chiave] = unire[chiave];
    }
  }
  // il listino: quello di chi resta, o quello dell'altro se qui non c'è niente
  if (!normalizzaPreferenze(tenere.preferenze).attive) {
    const suo = normalizzaPreferenze(unire.preferenze);
    if (suo.attive) tenere.preferenze = suo;
  }
  timbra(tenere);

  let autoSpostate = 0;
  for (const a of stato.autoInDeposito) {
    if (a.clienteId !== idDaUnire) continue;
    a.clienteId = idTenere;
    a.proprietario = tenere.nome;
    a.telefono = tenere.telefono;
    timbra(a);
    autoSpostate += 1;
  }
  // lo storico si ricollega, ma nome e telefono restano quelli del giorno:
  // sono fotografati sulla ricevuta già emessa (invariante 6)
  let storicoSpostato = 0;
  for (const r of stato.storico) {
    if (r.clienteId !== idDaUnire) continue;
    r.clienteId = idTenere;
    timbra(r);
    storicoSpostato += 1;
  }

  stato.clienti.splice(stato.clienti.indexOf(unire), 1);
  segnaCancellato(stato, 'cliente', idDaUnire);
  return { cliente: tenere, autoSpostate, storicoSpostato };
}

export function eliminaCliente(stato, id) {
  const idx = stato.clienti.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Cliente non trovato');
  if (stato.autoInDeposito.some((a) => a.clienteId === id)) {
    throw new Error('Questo cliente ha ancora auto in deposito: falle uscire prima');
  }
  stato.clienti.splice(idx, 1);   // lo storico conserva nome e telefono
  segnaCancellato(stato, 'cliente', id);
  return id;
}

export function nuovoAbbonamento(stato, dati, metodoPagamento, { numeroRicevuta } = {}) {
  validaMetodoAbbonamento(metodoPagamento);
  if (!numeroRicevuta) throw new Error('Numero di ricevuta mancante');
  const targa = normalizzaTarga(dati.targa);
  if (!targa) throw new Error('La targa è obbligatoria');
  if (!Number.isInteger(dati.importoCents) || dati.importoCents <= 0) {
    throw new Error('Indica l\'importo mensile');
  }
  const inizioMs = dati.inizioISO ? Date.parse(dati.inizioISO) : Date.now();
  if (Number.isNaN(inizioMs)) throw new Error('Data di inizio non valida');

  const abb = timbra({
    id: nuovoId(),
    targa,
    proprietario: String(dati.proprietario ?? '').trim(),
    telefono: String(dati.telefono ?? '').trim(),
    note: String(dati.note ?? '').trim(),
    importoCents: dati.importoCents,
    inizioISO: new Date(inizioMs).toISOString(),
    fineISO: rinnovaScadenza(new Date(inizioMs).toISOString(), inizioMs),
    pagamenti: [{
      id: nuovoId(),
      dataISO: adesso(),
      importoCents: dati.importoCents,
      metodoPagamento,
      numeroRicevuta: String(numeroRicevuta),
    }],
  });
  stato.abbonamenti.push(abb);
  return abb;
}

export function rinnovaAbbonamento(stato, id, metodoPagamento, { numeroRicevuta } = {}) {
  validaMetodoAbbonamento(metodoPagamento);
  if (!numeroRicevuta) throw new Error('Numero di ricevuta mancante');
  const abb = stato.abbonamenti.find((a) => a.id === id);
  if (!abb) throw new Error('Abbonamento non trovato');
  abb.fineISO = rinnovaScadenza(abb.fineISO, Date.now());
  abb.pagamenti.push({
    id: nuovoId(),
    dataISO: adesso(),
    importoCents: abb.importoCents,
    metodoPagamento,
    numeroRicevuta: String(numeroRicevuta),
  });
  return timbra(abb);
}

export function eliminaAbbonamento(stato, id) {
  const idx = stato.abbonamenti.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Abbonamento non trovato');
  stato.abbonamenti.splice(idx, 1);
  segnaCancellato(stato, 'abbonamento', id);
  return id;
}
