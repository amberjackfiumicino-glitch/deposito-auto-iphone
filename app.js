// Guscio dell'app del telefono: accesso, quattro schede, e un giro ogni pochi
// secondi per restare allineati a quello che si fa al PC.
//
// Il telefono NON ha un archivio proprio: legge e scrive sul database, che è il
// punto d'incontro con il computer del deposito. Serve quindi connessione per
// lavorare. Senza rete l'app si apre lo stesso e mostra l'ultimo elenco
// scaricato, IN SOLA LETTURA: si guarda, non si registra — così non nascono due
// verità diverse sulla stessa giornata.
import { collegato, esci, emailCollegata, scaricaTutto, ErroreNuvola } from './nuvola.js';
import { esegui as eseguiOperazione } from './operazioni.js';
import { salvaCopia, leggiCopia, descriviQuando } from './copia.js';
import { comodita } from './componenti/comodita.js';
import { render as renderCasa } from './viste/casa.js';
import { render as renderDeposito } from './viste/deposito.js';
import { render as renderEntrata, azzeraBozza } from './viste/entrata.js';
import { render as renderCerca } from './viste/cerca.js';
import { render as renderCassa } from './viste/cassa.js';
import { render as renderAccesso } from './viste/accesso.js';
import { render as renderAltro } from './viste/altro.js';
import { render as renderClienti, azzera as azzeraClienti } from './viste/clienti.js';
import { render as renderStorico } from './viste/storico.js';
import { render as renderCalendario } from './viste/calendario.js';
import { render as renderStatistiche } from './viste/statistiche.js';
import { render as renderAbbonamenti } from './viste/abbonamenti.js';
import { render as renderImpostazioni } from './viste/impostazioni.js';
import { render as renderAggiornamento } from './viste/aggiornamento.js';
import { controlla, disponibile, rimanda, rimandato } from './aggiornamento.js';

// Le quattro di tutti i giorni stanno nella barra in fondo; il resto entra da
// «☰ Altro», così il lavoro quotidiano resta a un tocco di distanza.
const SCHEDE = [
  { chiave: 'casa', ico: '🏠', nome: 'Home', render: renderCasa, offline: true },
  { chiave: 'deposito', ico: '🅿️', nome: 'Deposito', render: renderDeposito, offline: true },
  { chiave: 'entrata', ico: '➕', nome: 'Entrata', render: renderEntrata },
  { chiave: 'cassa', ico: '🧾', nome: 'Cassa', render: renderCassa },
  { chiave: 'altro', ico: '☰', nome: 'Altro', render: renderAltro, offline: true },
];

/** Schermate raggiungibili dal menu «Altro», fuori dalla barra in fondo. */
const INTERNE = {
  cerca: { nome: 'Cerca', render: renderCerca, offline: true },
  clienti: { nome: 'Clienti', render: renderClienti },
  storico: { nome: 'Storico', render: renderStorico, offline: true },
  calendario: { nome: 'Calendario', render: renderCalendario, offline: true },
  statistiche: { nome: 'Statistiche', render: renderStatistiche, offline: true },
  abbonamenti: { nome: 'Abbonamenti', render: renderAbbonamenti },
  impostazioni: { nome: 'Impostazioni', render: renderImpostazioni },
  aggiornamento: { nome: 'Aggiornamento', render: renderAggiornamento, offline: true },
};

const definizione = (chiave) => SCHEDE.find((s) => s.chiave === chiave) ?? INTERNE[chiave] ?? null;

const OGNI_MS = 5_000;   // il PC potrebbe aver registrato qualcosa

const app = document.getElementById('app');
let stato = null;
let scheda = 'casa';
let parametri = null;      // cosa si porta dietro una navigazione (es. clienteId)
let inLinea = true;
let soloLettura = false;    // stiamo guardando una copia: nessuna scrittura
let copiaPresoISO = '';

// --- avvisi in fondo allo schermo ---
let avvisoAperto = null;
export function avvisa(testo, tipo = '') {
  if (avvisoAperto) avvisoAperto.remove();
  const div = document.createElement('div');
  div.className = 'avviso ' + tipo;
  div.textContent = testo;
  document.body.appendChild(div);
  avvisoAperto = div;
  setTimeout(() => { div.remove(); if (avvisoAperto === div) avvisoAperto = null; }, 3200);
}

function avvisaErrore(err) {
  avvisa(err?.message ?? String(err), 'ko');
}

/** Foglio che sale dal basso; torna una funzione per chiuderlo. */
export function apriFoglio(costruisci) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  const foglio = document.createElement('div');
  foglio.className = 'foglio';
  const maniglia = document.createElement('div');
  maniglia.className = 'maniglia';
  foglio.appendChild(maniglia);
  velo.appendChild(foglio);
  const chiudi = () => velo.remove();
  velo.addEventListener('click', (e) => { if (e.target === velo) chiudi(); });
  costruisci(foglio, chiudi);
  document.body.appendChild(velo);
  comodita(foglio);
  return chiudi;
}

const ctx = {
  get stato() { return stato; },
  get soloLettura() { return soloLettura; },
  get email() { return emailCollegata(); },
  get parametri() { return parametri; },
  avvisa,
  avvisaErrore,
  apriFoglio,
  disconnetti: () => disconnetti(),
  vai(nuovaScheda, nuoviParametri = null) {
    scheda = nuovaScheda;
    parametri = nuoviParametri;
    monta();
  },
  /** Esegue un'operazione col motore condiviso e la manda al database. */
  async esegui(nome, ...args) {
    if (soloLettura) {
      throw new ErroreNuvola('Senza connessione qui si può solo guardare.', { rete: true });
    }
    const esito = await eseguiOperazione(stato, nome, ...args);
    salvaCopia(stato);
    monta();
    // il PC lo saprà al suo prossimo giro di sincronia, entro pochi secondi
    return esito;
  },
};

// --- schermate --------------------------------------------------------------

function montaAccesso(messaggio = '') {
  app.innerHTML = '';
  const main = document.createElement('main');
  renderAccesso(main, { onCollegato: () => avvia() }, messaggio);
  app.appendChild(main);
}

/**
 * Fascia verde quando c'è una versione nuova da installare.
 *
 * `monta()` gira ogni cinque secondi, quindi qui non si decide niente e non si
 * chiama la rete: si legge quello che `controlla()` ha già trovato, una volta
 * sola all'avvio. Niente animazioni, per lo stesso motivo: ripartirebbero a
 * ogni ridisegno e sembrerebbe un lampeggio.
 */
function fasciaAggiornamento() {
  const voluto = disponibile();
  if (!voluto || rimandato(voluto.versione)) return null;

  const fascia = document.createElement('div');
  fascia.className = 'fascia-aggiornamento';
  const testo = document.createElement('span');
  testo.textContent = `⬇️ C'è la versione ${voluto.versione}`;

  const ora = document.createElement('button');
  ora.textContent = 'Aggiorna';
  ora.addEventListener('click', () => ctx.vai('aggiornamento'));

  const dopo = document.createElement('button');
  dopo.className = 'tenue';
  dopo.textContent = 'Più tardi';
  dopo.addEventListener('click', () => { rimanda(voluto.versione); monta(); });

  fascia.append(testo, ora, dopo);
  return fascia;
}

/** Fascia gialla in cima quando si sta guardando la copia salvata. */
function fasciaCopia() {
  const fascia = document.createElement('div');
  fascia.className = 'fascia-copia';
  const testo = document.createElement('span');
  testo.textContent = `⚠️ Dati di ${descriviQuando(copiaPresoISO)} — nessuna connessione`;
  fascia.appendChild(testo);
  const riprova = document.createElement('button');
  riprova.textContent = 'Riprova';
  riprova.addEventListener('click', () => avvia());
  fascia.appendChild(riprova);
  return fascia;
}

function monta() {
  if (!stato) return montaAccesso();
  // A scorrere è il documento, non `main` (che non ha overflow): prima si
  // leggeva `main.scrollTop`, sempre 0, e ogni ridisegno — cioè ogni
  // salvataggio, e ogni cinque secondi — riportava la pagina in cima.
  const scorrimento = window.scrollY;
  app.innerHTML = '';

  // in sola lettura restano solo le schermate da guardare
  const schede = soloLettura ? SCHEDE.filter((s) => s.offline) : SCHEDE;
  let def = definizione(scheda);
  if (!def || (soloLettura && !def.offline)) {
    scheda = schede[0].chiave;
    parametri = null;
    def = schede[0];
  }
  const dentroAltro = !SCHEDE.some((s) => s.chiave === scheda);

  const testa = document.createElement('header');
  testa.className = 'testa';
  const h1 = document.createElement('h1');
  h1.textContent = def.nome;
  const rete = document.createElement('span');
  rete.className = 'stato-rete' + (inLinea ? '' : ' giu');
  rete.textContent = inLinea
    ? (stato.impostazioni?.nomeAttivita || 'collegato')
    : '⚠️ nessuna connessione';
  testa.append(h1, rete);

  const main = document.createElement('main');
  // dalle schermate interne si torna al menu, altrimenti si resta intrappolati
  if (dentroAltro) {
    const indietro = document.createElement('button');
    indietro.className = 'btn chiaro';
    indietro.textContent = '← Torna al menu';
    indietro.addEventListener('click', () => {
      azzeraClienti();
      ctx.vai('altro');
    });
    main.appendChild(indietro);
  }
  try {
    def.render(main, ctx);
  } catch (err) {
    main.textContent = 'Errore nel disegnare la schermata: ' + err.message;
  }

  const barra = document.createElement('nav');
  barra.className = 'schede';
  for (const s of schede) {
    const b = document.createElement('button');
    const attiva = s.chiave === scheda || (dentroAltro && s.chiave === 'altro');
    b.className = attiva ? 'attiva' : '';
    const ico = document.createElement('span');
    ico.className = 'ico';
    ico.textContent = s.ico;
    const nome = document.createElement('span');
    nome.textContent = s.nome;
    b.append(ico, nome);
    b.addEventListener('click', () => {
      if (s.chiave === 'altro') azzeraClienti();
      ctx.vai(s.chiave);
    });
    barra.appendChild(b);
  }

  const fascia = soloLettura ? fasciaCopia() : fasciaAggiornamento();
  if (fascia) app.appendChild(fascia);
  app.append(testa, main, barra);
  comodita(main);
  // dopo che il browser ha impaginato: prima la pagina è ancora corta e lo
  // scorrimento verrebbe troncato
  requestAnimationFrame(() => window.scrollTo(0, scorrimento));
}

/** Niente rete: si apre l'ultimo elenco salvato, da guardare soltanto. */
function passaASolaLettura() {
  const copia = leggiCopia();
  if (!copia) return false;
  stato = copia.stato;
  copiaPresoISO = copia.presoISO;
  soloLettura = true;
  inLinea = false;
  monta();
  return true;
}

// --- allineamento col database ---------------------------------------------

async function ricarica({ silenzioso = true } = {}) {
  try {
    const fresco = await scaricaTutto();
    stato = fresco;
    salvaCopia(fresco);
    inLinea = true;
    soloLettura = false;
    // Non si ridisegna sotto le mani di chi sta lavorando: né mentre scrive in
    // un campo, né con un foglio aperto, né — ed è il caso che faceva perdere
    // il modulo di entrata — mentre una schermata ha una compilazione in corso
    // ma nessun campo a fuoco (per esempio subito dopo un avviso di errore).
    const occupato = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      || document.querySelector('.velo')
      || document.querySelector('[data-in-lavorazione="1"]');
    if (!silenzioso || !occupato) monta();
    return true;
  } catch (err) {
    if (err instanceof ErroreNuvola && err.scaduto) {
      stato = null;
      soloLettura = false;
      montaAccesso('La sessione è scaduta: rientra con email e password.');
      return false;
    }
    if (!soloLettura && !passaASolaLettura()) {
      inLinea = false;
      if (stato) monta();
    }
    return false;
  }
}

setInterval(() => { if (stato || soloLettura) ricarica(); }, OGNI_MS);

// I costi maturano anche stando fermi: ogni mezzo minuto si ridisegna.
setInterval(() => {
  if (stato && scheda === 'deposito' && !document.querySelector('.velo')
    && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) monta();
}, 30000);

// --- avvio ------------------------------------------------------------------

function avvia() {
  if (!collegato()) return montaAccesso();
  ricarica({ silenzioso: false }).then((ok) => {
    // Il controllo degli aggiornamenti UNA VOLTA per avvio, e solo dopo che la
    // prima schermata è a posto: non deve rubare la scena all'apertura.
    if (ok) setTimeout(() => controlla().then((trovato) => { if (trovato) monta(); }), 3000);
  });
}
avvia();

/** Uscire dall account: lo chiama Impostazioni tramite ctx.disconnetti. */
export function disconnetti() {
  esci();
  stato = null;
  azzeraBozza();   // l'entrata a metà non resta lì per il prossimo che entra
  montaAccesso();
}
