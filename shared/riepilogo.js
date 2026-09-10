// Il riepilogo della giornata: i numeri della Home e le cose da guardare.
//
// Sta qui, e non nelle due viste, per la stessa ragione dei documenti: il PC e
// il telefono devono dire la STESSA cosa. Un avviso che compare su un solo
// dispositivo è peggio di un avviso che non c'è — uno dei due sembra rotto.
//
// Modulo puro: niente DOM, niente formattazione. Restituisce numeri e chiavi;
// il testo lo scrive chi disegna, con le parole del suo schermo.
import { calcolaTotale } from './pricing.js';
import { reportGiorno, daIncassare } from './cassa.js';
import { funzioneAttiva } from './funzioni.js';
import { statoAbbonamento } from './abbonamenti.js';
import { schedeDoppie } from './clienti.js';

const GIORNO_MS = 86_400_000;

/** Quanto hanno già maturato le auto ferme in piazzale, adesso. */
export function maturatoInPiazzale(stato, adessoMs = Date.now()) {
  let totale = 0;
  for (const a of stato.autoInDeposito ?? []) {
    const ingressoMs = Date.parse(a.ingressoISO);
    totale += calcolaTotale(a, ingressoMs, Math.max(adessoMs, ingressoMs)).totaleCents;
  }
  return totale;
}

/**
 * I quattro numeri che si guardano entrando in ufficio.
 * @returns {{dentro:number, incassatoOggiCents:number, daIncassareCents:number,
 *            maturatoCents:number, usciteOggi:number}}
 */
export function numeriGiornata(stato, adessoMs = Date.now()) {
  const oggi = reportGiorno(stato, adessoMs);
  const attesa = daIncassare(stato, adessoMs);
  return {
    dentro: (stato.autoInDeposito ?? []).length,
    incassatoOggiCents: oggi.totaleCents,
    usciteOggi: oggi.uscite.length,
    daIncassareCents: attesa.totaleCents,
    maturatoCents: maturatoInPiazzale(stato, adessoMs),
  };
}

/**
 * Le cose che meritano un'occhiata, dalla più urgente alla meno.
 *
 * Ogni voce porta `dove` (la schermata da aprire) e `quanti`, così chi disegna
 * costruisce la frase con le sue parole senza rifare i conti.
 * @returns {Array<{chiave:string, tono:'rosso'|'giallo', quanti:number,
 *                  importoCents?:number, giorni?:number, nome?:string,
 *                  dove:string, parametri?:object}>}
 */
export function avvisiGiornata(stato, adessoMs = Date.now()) {
  const fuori = [];

  // 1. bonifici scaduti: sono soldi che dovevano già essere arrivati
  const attesa = daIncassare(stato, adessoMs);
  if (attesa.scaduti?.length) {
    fuori.push({
      chiave: 'pagamentiScaduti', tono: 'rosso', dove: 'cassa',
      quanti: attesa.scaduti.length,
      importoCents: attesa.scadutiCents
        ?? attesa.scaduti.reduce((s, r) => s + r.totaleCents, 0),
    });
  }

  // 2. due schede per lo stesso cliente. Sta in alto perché è la causa più
  //    frequente dei «prezzi personalizzati che non funzionano»: il listino
  //    finisce su una scheda e al banco si sceglie l'altra, e da soli non ci
  //    si arriva mai.
  if (funzioneAttiva(stato, 'rubrica')) {
    for (const doppia of schedeDoppie(stato.clienti ?? [])) {
      fuori.push({
        chiave: 'schedeDoppie', tono: 'giallo', dove: 'clienti',
        quanti: doppia.schede.length, nome: doppia.nome,
        parametri: { clienteId: doppia.schede[0].id },
      });
    }
  }

  // 3. veicoli fermi da troppo tempo
  const giorni = stato.impostazioni?.giorniAvvisoGiacenza ?? 7;
  const ferme = (stato.autoInDeposito ?? []).filter(
    (a) => (adessoMs - Date.parse(a.ingressoISO)) / GIORNO_MS >= giorni,
  );
  if (ferme.length) {
    fuori.push({
      chiave: 'giacenzeLunghe', tono: 'giallo', dove: 'deposito',
      quanti: ferme.length, giorni,
    });
  }

  // 4. abbonamenti in scadenza
  if (funzioneAttiva(stato, 'abbonamenti')) {
    const inScadenza = (stato.abbonamenti ?? []).filter(
      (a) => statoAbbonamento(a, adessoMs) === 'in_scadenza',
    );
    if (inScadenza.length) {
      fuori.push({
        chiave: 'abbonamentiInScadenza', tono: 'giallo', dove: 'abbonamenti',
        quanti: inScadenza.length,
      });
    }
  }

  return fuori;
}

/** La frase italiana di un avviso, uguale sul PC e sul telefono. */
export function descriviAvviso(a, euro) {
  const uno = a.quanti === 1;
  switch (a.chiave) {
    case 'pagamentiScaduti':
      return `${a.quanti} pagament${uno ? 'o scaduto' : 'i scaduti'} · ${euro(a.importoCents)}`;
    case 'schedeDoppie':
      return `Due schede per «${a.nome}»: i prezzi suoi valgono su una sola`;
    case 'giacenzeLunghe':
      return `${a.quanti} veicol${uno ? 'o fermo' : 'i fermi'} da più di ${a.giorni} giorni`;
    case 'abbonamentiInScadenza':
      return `${a.quanti} abbonament${uno ? 'o in scadenza' : 'i in scadenza'}`;
    default:
      return '';
  }
}

/** L'icona di un avviso: stessa faccia sui due dispositivi. */
export const ICONE_AVVISO = {
  pagamentiScaduti: '🔴',
  schedeDoppie: '⚠️',
  giacenzeLunghe: '⏰',
  abbonamentiInScadenza: '⭐',
};
