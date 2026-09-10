// Il filo che collega il telefono al database.
//
// Scritto a mano con `fetch` sulle API REST di Supabase: il progetto non ha un
// bundler e ogni file su disco è il file che gira, quindi non si aggiunge una
// libreria per fare tre chiamate HTTP.
//
// LA SESSIONE RESTA: si entra una volta con email e password, il *refresh
// token* si salva sul telefono e da lì in poi si rinnova da solo. Chiudere e
// riaprire l'app non deve mai richiedere di ridigitare niente.
import { impostazioniDaMandare } from './shared/sincronia.js';

const URL_BASE = 'https://msljxwfmsbvakakpvnaj.supabase.co';
// chiave pubblica per costruzione: la sicurezza sta nelle RLS del database,
// che lasciano vedere a ogni account soltanto le proprie righe
const CHIAVE = 'sb_publishable_xEFrKPYCdxeE1n4bWQvTKA_k4kMBzGV';

const CHIAVE_SESSIONE = 'deposito-sessione';
const MARGINE_MS = 60_000;   // si rinnova un minuto prima di scadere

let sessione = null;   // { access_token, refresh_token, scadeMs, email }
let rinnovoInCorso = null;

export class ErroreNuvola extends Error {
  constructor(messaggio, { scaduto = false, rete = false } = {}) {
    super(messaggio);
    this.scaduto = scaduto;
    this.rete = rete;
  }
}

// --- sessione ---------------------------------------------------------------

function leggiSessione() {
  if (sessione) return sessione;
  try {
    sessione = JSON.parse(localStorage.getItem(CHIAVE_SESSIONE) ?? 'null');
  } catch {
    sessione = null;
  }
  return sessione;
}

function scriviSessione(dati) {
  sessione = dati && {
    access_token: dati.access_token,
    refresh_token: dati.refresh_token,
    scadeMs: Date.now() + (dati.expires_in ?? 3600) * 1000,
    email: dati.user?.email ?? sessione?.email ?? '',
    // Serve per scrivere: `user_id` e' obbligatorio su ogni tabella e non ha
    // un valore automatico. Senza, ogni salvataggio dal telefono tornava
    // indietro con "null value in column user_id violates not-null".
    utenteId: dati.user?.id ?? idDalGettone(dati.access_token) ?? sessione?.utenteId ?? '',
  };
  try {
    if (sessione) localStorage.setItem(CHIAVE_SESSIONE, JSON.stringify(sessione));
    else localStorage.removeItem(CHIAVE_SESSIONE);
  } catch { /* spazio finito: si resta collegati solo per questa sessione */ }
  return sessione;
}

export function collegato() {
  return !!leggiSessione()?.refresh_token;
}

export function emailCollegata() {
  return leggiSessione()?.email ?? '';
}

/** L'id dell'utente, letto dal gettone: e' il `sub` del JWT. */
function idDalGettone(gettone) {
  try {
    const corpo = String(gettone ?? '').split('.')[1];
    if (!corpo) return '';
    const json = atob(corpo.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).sub ?? '';
  } catch { return ''; }
}

/** Chi sta scrivendo. Ogni riga del database porta il suo proprietario. */
function utenteId() {
  const s = leggiSessione();
  return s?.utenteId || idDalGettone(s?.access_token) || '';
}

/**
 * I messaggi del database arrivano in inglese: qui l'app parla italiano.
 * Passa di qui TUTTO, non solo l'accesso: prima le risposte di `rest()`
 * andavano a schermo così com'erano, e chi usava l'app si trovava davanti
 * frasi come «new row violates row-level security policy».
 */
function inItaliano(messaggio, ripiego = 'Operazione non riuscita') {
  const m = String(messaggio ?? '');
  // --- accesso ---
  if (/invalid login credentials/i.test(m)) return 'Email o password sbagliate';
  if (/email not confirmed/i.test(m)) return 'Email non ancora confermata: apri il link che ti è arrivato';
  if (/user not found/i.test(m)) return 'Nessun account con questa email';
  if (/rate limit|too many/i.test(m)) return 'Troppi tentativi: aspetta un minuto e riprova';
  if (/invalid refresh token|token.*expired/i.test(m)) return 'Sessione scaduta: rientra con email e password';
  if (/network|fetch|failed to fetch/i.test(m)) return 'Nessuna connessione';
  // --- database ---
  if (/row-level security|permission denied|not authorized/i.test(m)) {
    return 'Questo account non ha il permesso di scrivere questi dati. '
      + 'Controlla di essere entrato con la stessa email del computer.';
  }
  if (/duplicate key|already exists|unique constraint/i.test(m)) {
    return 'Questo dato risulta già registrato.';
  }
  if (/on conflict|exclusion constraint/i.test(m)) {
    return 'Il database non è configurato del tutto: manca un indice. Avvisa chi ha creato il progetto.';
  }
  if (/could not find the function|function .* does not exist/i.test(m)) {
    return 'Il database non ha ancora la funzione che assegna i numeri di ricevuta. '
      + 'Chiudi una sosta dal computer, oppure fai sistemare il database.';
  }
  if (/not-null|null value in column/i.test(m)) {
    return 'Manca un dato obbligatorio: riprova, e se insiste registra dal computer.';
  }
  if (/jwt|invalid api key/i.test(m)) return 'Sessione non valida: esci e rientra.';
  if (/timeout|timed out/i.test(m)) return 'Il database non ha risposto in tempo: riprova.';
  return m || ripiego;
}

async function auth(percorso, corpo) {
  let risposta;
  try {
    risposta = await fetch(`${URL_BASE}/auth/v1/${percorso}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CHIAVE },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new ErroreNuvola('Nessuna connessione: controlla la rete del telefono.', { rete: true });
  }
  const dati = await risposta.json().catch(() => ({}));
  if (!risposta.ok) {
    const messaggio = dati.error_description ?? dati.msg ?? dati.message;
    throw new ErroreNuvola(inItaliano(messaggio), {
      scaduto: risposta.status === 400 || risposta.status === 401,
    });
  }
  return dati;
}

export async function accedi(email, password) {
  const pulita = String(email ?? '').trim().toLowerCase();
  if (!pulita || !password) throw new ErroreNuvola('Servono email e password');
  const dati = await auth('token?grant_type=password', { email: pulita, password });
  scriviSessione({ ...dati, user: dati.user ?? { email: pulita } });
  return emailCollegata();
}

export function esci() {
  scriviSessione(null);
}

/** Rinnova il gettone se sta per scadere. Una sola richiesta anche se in tanti la chiedono. */
async function gettoneValido() {
  const s = leggiSessione();
  if (!s?.refresh_token) throw new ErroreNuvola('Non hai ancora fatto l\'accesso', { scaduto: true });
  if (s.access_token && Date.now() < s.scadeMs - MARGINE_MS) return s.access_token;

  if (!rinnovoInCorso) {
    rinnovoInCorso = auth('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
      .then((dati) => scriviSessione({ ...dati, user: dati.user ?? { email: s.email } }).access_token)
      .catch((err) => {
        // il refresh token non vale più: si rifà l'accesso, non si insiste
        if (err.scaduto) esci();
        throw err;
      })
      .finally(() => { rinnovoInCorso = null; });
  }
  return rinnovoInCorso;
}

// --- dati -------------------------------------------------------------------

async function rest(percorso, { metodo = 'GET', corpo = null, intestazioni = {} } = {}) {
  const token = await gettoneValido();
  let risposta;
  try {
    risposta = await fetch(`${URL_BASE}/rest/v1/${percorso}`, {
      method: metodo,
      headers: {
        apikey: CHIAVE,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...intestazioni,
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroreNuvola('Nessuna connessione al deposito.', { rete: true });
  }
  if (risposta.status === 401) {
    esci();
    throw new ErroreNuvola('Sessione scaduta: rifai l\'accesso.', { scaduto: true });
  }
  const testo = await risposta.text();
  let dati = null;
  try { dati = testo ? JSON.parse(testo) : null; } catch { dati = { message: testo }; }
  if (!risposta.ok) {
    // il 403 è un permesso negato, non una sessione scaduta: rimandare
    // all'accesso come si faceva col 401 avrebbe solo fatto girare a vuoto
    if (risposta.status === 403) {
      throw new ErroreNuvola(inItaliano(dati?.message,
        'Questo account non ha il permesso di fare questa operazione.'));
    }
    throw new ErroreNuvola(inItaliano(dati?.message ?? dati?.hint ?? dati?.details,
      'Il database non ha accettato l\'operazione. Riprova fra poco.'));
  }
  return dati;
}

// --- l'app da scaricare -----------------------------------------------------
// L'APK sta in un bucket privato dello Storage. Il telefono legge il manifesto
// per sapere se c'è una versione nuova, e per scaricarla si fa dare una URL
// FIRMATA che scade in dieci minuti: così il gettone di sessione non deve
// attraversare il ponte verso Java, e chi scarica non ha bisogno di header.

const BUCKET = 'app-telefono';

/** Il manifesto dell'ultima versione pubblicata, o `null` se non ce n'è. */
export async function leggiManifesto() {
  const token = await gettoneValido();
  let risposta;
  try {
    risposta = await fetch(
      `${URL_BASE}/storage/v1/object/authenticated/${BUCKET}/ultima.json?t=${Date.now()}`,
      { headers: { apikey: CHIAVE, Authorization: `Bearer ${token}` } },
    );
  } catch {
    throw new ErroreNuvola('Nessuna connessione: riprova più tardi.', { rete: true });
  }
  // 400/404 = non è mai stata pubblicata nessuna versione: non è un errore
  if (risposta.status === 400 || risposta.status === 404) return null;
  if (risposta.status === 401) {
    esci();
    throw new ErroreNuvola('Sessione scaduta: rientra con email e password.', { scaduto: true });
  }
  if (!risposta.ok) {
    throw new ErroreNuvola(inItaliano(await risposta.text(),
      'Non riesco a controllare gli aggiornamenti.'));
  }
  return risposta.json();
}

/**
 * Una URL monouso per scaricare l'APK, valida dieci minuti.
 * Serve perché chi scarica davvero è il codice Java, e così non deve
 * conoscere né gettoni né intestazioni: chiede quell'indirizzo e basta.
 */
export async function urlFirmata(percorso, secondi = 600) {
  const token = await gettoneValido();
  let risposta;
  try {
    risposta = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}/${percorso}`, {
      method: 'POST',
      headers: {
        apikey: CHIAVE,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: secondi }),
    });
  } catch {
    throw new ErroreNuvola('Nessuna connessione: riprova più tardi.', { rete: true });
  }
  if (!risposta.ok) {
    throw new ErroreNuvola(inItaliano(await risposta.text(),
      'Non riesco a preparare il collegamento per scaricare.'));
  }
  const dati = await risposta.json();
  const firmata = dati?.signedURL ?? dati?.signedUrl;
  if (!firmata) throw new ErroreNuvola('Il database non ha dato il collegamento per scaricare.');
  return `${URL_BASE}/storage/v1${firmata.startsWith('/') ? '' : '/'}${firmata}`;
}

/** Tutti i record dell'account, ricomposti nella forma di dati.json. */
export async function scaricaTutto() {
  const [record, impostazioni] = await Promise.all([
    rest('record_deposito?select=tipo,id,dati,cancellato&cancellato=is.false&limit=20000'),
    rest('impostazioni_deposito?select=dati&limit=1'),
  ]);

  const stato = {
    impostazioni: impostazioni?.[0]?.dati ?? {},
    autoInDeposito: [], storico: [], clienti: [], abbonamenti: [], cancellati: [],
  };
  const dove = { auto: 'autoInDeposito', storico: 'storico', cliente: 'clienti', abbonamento: 'abbonamenti' };
  for (const r of record ?? []) {
    const collezione = dove[r.tipo];
    if (collezione) stato[collezione].push(r.dati);
  }
  return stato;
}

/** Manda su i record toccati da un'operazione. */
export async function salvaRecord(record = []) {
  if (record.length === 0) return;
  const mio = utenteId();
  if (!mio) throw new ErroreNuvola('Sessione non valida: esci e rientra.', { scaduto: true });
  const righe = record.map((r) => ({
    user_id: mio,
    tipo: r.tipo,
    id: r.id,
    dati: r.dati,
    cancellato: !!r.cancellato,
    aggiornato_at: new Date().toISOString(),
  }));
  await rest('record_deposito?on_conflict=user_id,tipo,id', {
    metodo: 'POST',
    corpo: righe,
    intestazioni: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
}

/**
 * Salva le impostazioni dell'attività.
 *
 * ATTENZIONE: qui vanno solo le cose del DEPOSITO (tariffe, categorie,
 * maggiorazioni, stati veicolo, dati per la ricevuta). Le chiavi che
 * riguardano un singolo computer — tema, piano, modello AI, report automatici
 * — restano dove sono: le toglie `impostazioniDaMandare`, e il telefono non
 * deve poter cambiare il tema del PC.
 */
export async function salvaImpostazioni(impostazioni) {
  const dati = {
    ...impostazioniDaMandare(impostazioni),
    // la data di modifica è quello che permette al PC di capire chi ha
    // scritto per ultimo, invece di sovrascriversi a vicenda
    aggiornatoISO: new Date().toISOString(),
  };
  const mio = utenteId();
  if (!mio) throw new ErroreNuvola('Sessione non valida: esci e rientra.', { scaduto: true });
  await rest('impostazioni_deposito?on_conflict=user_id', {
    metodo: 'POST',
    corpo: [{ user_id: mio, dati, aggiornato_at: new Date().toISOString() }],
    intestazioni: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });
  return dati;
}

/**
 * Il prossimo numero di ricevuta, assegnato dal database.
 * È QUI che si garantisce che due dispositivi non ne emettano mai uno uguale.
 */
export async function prossimoNumeroRicevuta() {
  const dati = await rest('rpc/prendi_numeri', {
    metodo: 'POST',
    corpo: { p_quale: 'ricevute', p_quanti: 1, p_anno: new Date().getFullYear() },
  });
  const riga = Array.isArray(dati) ? dati[0] : dati;
  if (!riga) {
    throw new ErroreNuvola('Il database non ha dato il numero della ricevuta, '
      + 'quindi la sosta resta aperta. Riprova, o chiudila dal computer.');
  }
  return `${riga.anno}-${String(riga.primo).padStart(4, '0')}`;
}

export async function prossimoNumeroIngresso() {
  const dati = await rest('rpc/prendi_numeri', {
    metodo: 'POST',
    corpo: { p_quale: 'ingressi', p_quanti: 1, p_anno: new Date().getFullYear() },
  });
  const riga = Array.isArray(dati) ? dati[0] : dati;
  return riga ? `I-${String(riga.primo).padStart(4, '0')}` : '';
}
