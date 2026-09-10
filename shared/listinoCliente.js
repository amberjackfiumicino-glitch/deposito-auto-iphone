// Listino personalizzato per cliente: tariffe, categoria, tipo tariffa,
// maggiorazioni predefinite e metodo di pagamento abituale.
// Le impostazioni GLOBALI restano il default: qui c'è solo ciò che il cliente
// vuole diverso, e ogni valore resta comunque modificabile a mano all'ingresso.
// Modulo puro: nessun DOM, nessun Electron. Importato da main e renderer.
import { trovaCategoria, tariffaDaCategoria } from './categorie.js';
import { metodoValido } from './pagamenti.js';

/** Preferenze vuote: tutto vale "usa il globale". */
export function preferenzeDefault() {
  return {
    attive: false,
    modoTariffa: '',              // '' | 'oraria' | 'giornaliera'
    categoriaId: '',              // '' = nessuna categoria preferita
    tariffaOrariaCents: null,     // null = quella della categoria
    tariffaGiornalieraCents: null,
    costoFissoCents: null,
    // Tariffe per SINGOLO tipo di veicolo: il caso vero di un cliente che porta
    // mezzi diversi a prezzi diversi (auto a 8, furgoni a 25). Le tre chiavi
    // qui sopra restano il valore unico valido per tutti i tipi; questa mappa
    // le sovrascrive dove serve.  { auto: { tariffaGiornalieraCents: 800 } }
    tariffePerCategoria: {},
    metodoPagamento: '',          // '' | contanti | carta | bonifico60
    maggiorazioni: [],            // [{chiave, importoCents, modo}]
  };
}

// Per le TARIFFE lo zero è una scelta legittima (quel cliente non paga la
// sosta), quindi si tiene. Per una MAGGIORAZIONE invece un supplemento di zero
// non vuol dire niente: significa "come il listino generale".
const importoOpzionale = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
const supplementoOpzionale = (v) => (Number.isInteger(v) && v > 0 ? v : null);

/** Ripulisce le preferenze arrivate dal renderer (o da un file vecchio). */
export function normalizzaPreferenze(p) {
  const d = preferenzeDefault();
  if (!p || typeof p !== 'object') return d;
  const n = {
    // dedotto in fondo: non è più una spunta, è "c'è dentro qualcosa"
    attive: false,
    modoTariffa: p.modoTariffa === 'oraria' || p.modoTariffa === 'giornaliera' ? p.modoTariffa : '',
    categoriaId: String(p.categoriaId ?? '').trim(),
    tariffaOrariaCents: importoOpzionale(p.tariffaOrariaCents),
    tariffaGiornalieraCents: importoOpzionale(p.tariffaGiornalieraCents),
    costoFissoCents: importoOpzionale(p.costoFissoCents),
    tariffePerCategoria: normalizzaPerCategoria(p.tariffePerCategoria),
    metodoPagamento: metodoValido(p.metodoPagamento) ? p.metodoPagamento : '',
    // Qui si annota SOLO la scelta del cliente: quali maggiorazioni applicargli
    // e, se vuole, a che prezzo. `importoCents: null` (e `modo: null`) vuol
    // dire "come nel listino generale": si risolve al momento dell'uso, contro
    // il catalogo di adesso. Senza il null, gli importi qui dentro sarebbero una
    // fotografia congelata che invecchia da sola.
    maggiorazioni: Array.isArray(p.maggiorazioni)
      ? p.maggiorazioni
        .filter((m) => m && String(m.chiave ?? '').trim())
        .map((m) => ({
          chiave: String(m.chiave).trim(),
          importoCents: supplementoOpzionale(m.importoCents),
          modo: m.modo === 'perUnita' || m.modo === 'unatantum' ? m.modo : null,
        }))
      : [],
  };
  n.attive = haQualcosa(n);
  return n;
}

/** Su preferenze GIÀ normalizzate: c'è almeno una cosa decisa dal cliente? */
function haQualcosa(n) {
  return !!(n.modoTariffa || n.categoriaId || n.metodoPagamento
    || n.tariffaOrariaCents !== null
    || n.tariffaGiornalieraCents !== null
    || n.costoFissoCents !== null
    || Object.keys(n.tariffePerCategoria).length
    || n.maggiorazioni.length);
}

/** Tariffe per tipo di veicolo: si tiene solo ciò che è davvero impostato. */
function normalizzaPerCategoria(mappa) {
  if (!mappa || typeof mappa !== 'object') return {};
  const fuori = {};
  for (const [id, v] of Object.entries(mappa)) {
    if (!id || !v || typeof v !== 'object') continue;
    const riga = {
      tariffaOrariaCents: importoOpzionale(v.tariffaOrariaCents),
      tariffaGiornalieraCents: importoOpzionale(v.tariffaGiornalieraCents),
      costoFissoCents: importoOpzionale(v.costoFissoCents),
    };
    // una riga tutta vuota non serve a niente
    if (Object.values(riga).some((x) => x !== null)) fuori[String(id).trim()] = riga;
  }
  return fuori;
}

/**
 * C'è davvero qualcosa di personalizzato in queste preferenze?
 *
 * È la domanda che sostituisce l'interruttore. Fino alla v1.13 il listino di un
 * cliente si applicava solo se qualcuno aveva spuntato «Usa le tariffe di
 * questo cliente» — e finché era spento la scheda nascondeva i campi da
 * compilare. Chi non trovava l'interruttore compilava il vuoto e in entrata
 * vedeva comparire i prezzi generali, senza capire perché.
 * Adesso `attive` non si spunta: si deduce da qui, quando si salva.
 */
export function preferenzeValorizzate(p) {
  return normalizzaPreferenze(p).attive;
}

/** Il cliente ha un listino suo da applicare? */
export function listinoAttivo(cliente) {
  return !!cliente?.preferenze?.attive;
}

/**
 * Tariffe da precompilare all'ingresso: si parte dalla categoria e il listino
 * del cliente sovrascrive solo ciò che ha davvero impostato.
 * @param {object} impostazioni impostazioni globali (categorie dentro)
 * @param {object|null} cliente scheda cliente (può essere null)
 * @param {{categoriaId?:string, modoTariffa?:string}} scelta ciò che c'è già a schermo
 * @returns {{modoTariffa:string, categoriaId:string, categoriaNome:string,
 *            tariffaCents:number, costoFissoCents:number, daCliente:boolean}}
 */
export function tariffeEffettive(impostazioni, cliente, scelta = {}) {
  const p = listinoAttivo(cliente) ? normalizzaPreferenze(cliente.preferenze) : null;

  const modoTariffa = scelta.modoTariffa
    || (p && p.modoTariffa)
    || 'giornaliera';
  const categoria = trovaCategoria(impostazioni, scelta.categoriaId || (p && p.categoriaId) || '');

  // La cascata, dal più specifico al più generico:
  //   1. il prezzo che il cliente ha per QUESTO tipo di veicolo
  //   2. il prezzo unico del cliente, valido per tutti i tipi
  //   3. il prezzo del tipo di veicolo nel listino generale
  const perCategoria = p?.tariffePerCategoria?.[categoria.id] ?? null;
  const chiaveTariffa = modoTariffa === 'oraria' ? 'tariffaOrariaCents' : 'tariffaGiornalieraCents';

  const tariffaSuaQui = perCategoria?.[chiaveTariffa] ?? null;
  const tariffaSuaOvunque = p ? p[chiaveTariffa] : null;
  const tariffaCents = tariffaSuaQui
    ?? tariffaSuaOvunque
    ?? tariffaDaCategoria(categoria, modoTariffa);

  const fissoSuoQui = perCategoria?.costoFissoCents ?? null;
  const fissoSuoOvunque = p ? p.costoFissoCents : null;
  const costoFissoCents = fissoSuoQui ?? fissoSuoOvunque ?? categoria.costoFissoCents ?? 0;

  return {
    modoTariffa,
    categoriaId: categoria.id,
    categoriaNome: categoria.nome,
    tariffaCents,
    costoFissoCents,
    daCliente: !!p && [tariffaSuaQui, tariffaSuaOvunque, fissoSuoQui, fissoSuoOvunque]
      .some((x) => x !== null),
  };
}

/**
 * Le maggiorazioni da applicare a questo cliente, già risolte: dove il cliente
 * non ha messo un importo suo si prende quello del listino generale.
 * @param {object|null} cliente
 * @param {Array} catalogo `impostazioni.maggiorazioni`
 * @returns {Array<{chiave,nome,importoCents,modo,numero,suMisura:boolean}>}
 */
export function maggiorazioniPreferite(cliente, catalogo = []) {
  if (!listinoAttivo(cliente)) return [];
  const scelte = normalizzaPreferenze(cliente.preferenze).maggiorazioni;
  const fuori = [];
  for (const s of scelte) {
    const def = catalogo.find((c) => c.id === s.chiave);
    // una maggiorazione cancellata dal listino generale sparisce anche di qui
    if (!def) continue;
    const importoCents = s.importoCents ?? def.importoCents;
    if (!(importoCents > 0)) continue;
    fuori.push({
      chiave: s.chiave,
      nome: def.nome,
      importoCents,
      modo: s.modo ?? def.modo,
      numero: def.numero ?? 0,
      suMisura: s.importoCents !== null || (s.modo !== null && s.modo !== def.modo),
    });
  }
  return fuori;
}

/** Il prezzo che questo cliente paga per una maggiorazione ('' se è il generale). */
export function importoPerCliente(cliente, chiave) {
  if (!listinoAttivo(cliente)) return null;
  const s = normalizzaPreferenze(cliente.preferenze).maggiorazioni.find((m) => m.chiave === chiave);
  return s ? s.importoCents : null;
}

/** Metodo di pagamento abituale scritto sulla scheda ('' se non impostato). */
export function metodoPreferitoCliente(cliente) {
  if (!listinoAttivo(cliente)) return '';
  const m = cliente?.preferenze?.metodoPagamento;
  return metodoValido(m) ? m : '';
}
