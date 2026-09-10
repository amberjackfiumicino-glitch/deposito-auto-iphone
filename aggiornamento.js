// Sapere se c'è una versione nuova, e installarla.
//
// L'APK lo pubblica il PC su Supabase Storage; qui si legge il manifesto, si
// confronta con la versione installata e — se serve — si chiede ad Android di
// scaricare e installare. Prima bisognava passarsi il file a mano ogni volta.
//
// Il download vero lo fa il codice Java (`PonteAggiornamento`), per due
// motivi: 25 MB non devono passare per la memoria della pagina, e il file
// finisce dove l'installer di Android lo sa leggere. Da qui si passa solo una
// URL già firmata, che scade in dieci minuti.
import { leggiManifesto, urlFirmata } from './nuvola.js';
import { piuNuova } from './shared/versione.js';

const CHIAVE_RINVIO = 'deposito-aggiornamento-rimandato';

let manifesto = null;      // l'ultima versione pubblicata, o null
let installata = null;     // { versione, codice } di quella che gira adesso
let giaControllato = false;

/** Il ponte verso Android, se ci siamo davvero dentro. */
function ponte() {
  const p = globalThis.AggiornaAndroid;
  return p && typeof p.scaricaEInstalla === 'function' ? p : null;
}

/** Siamo dentro l'app Android, o in un browser di prova? */
export function dentroApp() {
  return !!ponte();
}

/**
 * La versione di QUESTA pagina, scritta nell'HTML al momento della build.
 *
 * Serve alla versione web (iPhone): lì non c'è nessun PackageManager a cui
 * chiedere, e senza questo la schermata Aggiornamento diceva «non lo so» —
 * proprio dove si va a guardare per capire se l'aggiornamento è arrivato.
 *
 * NON entra dentro `versioneInstallata()`, ed è la cosa importante: quella
 * governa il flusso di aggiornamento dell'APK, e se rispondesse anche fuori
 * da Android la fascia «C'è la versione X» comparirebbe pure su iPhone,
 * offrendo di installare un pacchetto Android.
 */
export function versioneDiQuestaPagina() {
  const meta = globalThis.document?.querySelector('meta[name="versione-app"]');
  const valore = meta?.content?.trim();
  return valore && valore !== 'sviluppo' ? valore : null;
}

/** La versione che gira adesso, chiesta ad Android. */
export function versioneInstallata() {
  if (installata) return installata;
  try {
    const grezzo = ponte()?.versione?.();
    installata = grezzo ? JSON.parse(grezzo) : null;
  } catch { installata = null; }
  return installata;
}

/**
 * Controlla una volta sola per avvio. Non lancia mai: senza rete o senza
 * niente di pubblicato semplicemente non c'è nessun aggiornamento, e non è un
 * errore da mostrare in faccia a chi sta lavorando.
 */
export async function controlla({ forza = false } = {}) {
  if (giaControllato && !forza) return manifesto;
  giaControllato = true;
  try {
    manifesto = await leggiManifesto();
  } catch {
    manifesto = null;   // niente rete, niente avviso
  }
  return manifesto;
}

/** Il manifesto, se è davvero più recente di quello che è installato. */
export function disponibile() {
  if (!manifesto?.versione) return null;
  const mia = versioneInstallata();
  // fuori dall'app Android non si sa cosa c'è installato: non si propone niente
  if (!mia?.versione) return null;
  return piuNuova(manifesto.versione, mia.versione) ? manifesto : null;
}

/** «Più tardi»: si tace per un giorno, ma una versione nuova azzera il rinvio. */
export function rimanda(versione) {
  try {
    localStorage.setItem(CHIAVE_RINVIO, JSON.stringify({
      versione, finoMs: Date.now() + 24 * 3600_000,
    }));
  } catch { /* senza spazio si ripropone: poco male */ }
}

export function rimandato(versione) {
  try {
    const r = JSON.parse(localStorage.getItem(CHIAVE_RINVIO) ?? 'null');
    return !!r && r.versione === versione && Date.now() < r.finoMs;
  } catch { return false; }
}

/** L'app ha il permesso di installare pacchetti? */
export function puoInstallare() {
  try { return ponte()?.puoInstallare?.() !== false; } catch { return true; }
}

/** Porta alla schermata di sistema dove si concede quel permesso. */
export function chiediPermesso() {
  try { ponte()?.chiediPermesso?.(); } catch { /* niente da fare da qui */ }
}

/**
 * Scarica e lancia l'installazione.
 * @param {(fatti:number, totale:number) => void} onProgresso
 * @returns {Promise<void>} si risolve quando parte l'installazione di sistema
 */
export function installa(voluto, onProgresso) {
  const p = ponte();
  if (!p) return Promise.reject(new Error('Da qui non si può aggiornare: apri l’app del telefono.'));

  return urlFirmata(voluto.percorso).then((url) => new Promise((risolvi, rifiuta) => {
    // il Java richiama queste funzioni dal thread della UI
    globalThis.aggiornamentoAvanza = (fatti, totale) => onProgresso?.(fatti, totale);
    globalThis.aggiornamentoFinito = (errore) => {
      delete globalThis.aggiornamentoAvanza;
      delete globalThis.aggiornamentoFinito;
      if (errore) rifiuta(new Error(errore));
      else risolvi();
    };
    try {
      p.scaricaEInstalla(url, `deposito-auto-${voluto.versione}.apk`, voluto.sha256 ?? '');
    } catch (err) {
      delete globalThis.aggiornamentoAvanza;
      delete globalThis.aggiornamentoFinito;
      rifiuta(err);
    }
  }));
}
