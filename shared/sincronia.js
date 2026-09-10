// Le REGOLE della sincronizzazione, senza toccare la rete.
//
// Modulo puro: da una parte lo stato locale, dall'altra i record arrivati dal
// database; qui si decide cosa applicare in locale e cosa spedire. Nessun
// `fetch`, nessun client Supabase: così tutta la logica delicata è testabile
// con `node --test`, che è l'unico modo per fidarsene.
//
// REGOLA UNICA: per ogni record vince chi ha `aggiornatoISO` più recente.
// Con una persona sola i conflitti veri non capitano quasi mai; la regola serve
// perché il sistema resti prevedibile quando capitano.

/** Le collezioni sincronizzate e dove stanno dentro lo stato. */
export const COLLEZIONI = {
  auto: 'autoInDeposito',
  storico: 'storico',
  cliente: 'clienti',
  abbonamento: 'abbonamenti',
};

/**
 * Chiavi di `impostazioni` che riguardano QUESTO computer e non devono
 * viaggiare: la porta del server, il tema dello schermo, il piano
 * dell'installazione, il modello AI installato qui, i report automatici che
 * ogni macchina genererebbe in doppio. E il PIN, che non deve uscire mai.
 */
export const CHIAVI_LOCALI = ['tema', 'piano', 'modelloAI', 'reportAutomatico', 'mobile'];

/** Plugin che dipendono da cosa c'è installato su questa macchina. */
export const FUNZIONI_LOCALI = ['fotoAI'];

/** Chiavi della radice dello stato che restano locali. */
export const RADICE_LOCALE = ['ultimoAvvioISO', 'schemaVersion', 'contatoreRicevute', 'contatoreIngressi'];

const quando = (record) => Date.parse(record?.aggiornatoISO ?? '') || 0;

/** Le impostazioni ripulite di tutto ciò che è di questa macchina. */
export function impostazioniDaMandare(impostazioni) {
  const fuori = { ...impostazioni };
  for (const chiave of CHIAVI_LOCALI) delete fuori[chiave];
  if (fuori.funzioni) {
    fuori.funzioni = { ...fuori.funzioni };
    for (const chiave of FUNZIONI_LOCALI) delete fuori.funzioni[chiave];
  }
  return fuori;
}

/**
 * Impostazioni arrivate dal cloud, rimesse insieme a quelle di questa macchina.
 *
 * Due regole:
 *  - ciò che è di questa macchina (`CHIAVI_LOCALI`) non viene MAI sovrascritto;
 *  - fra le due versioni delle impostazioni d'attività vince **la più recente**.
 *    Serve da quando anche il telefono può cambiare le tariffe: senza il
 *    confronto delle date, l'ultimo che sincronizza cancellerebbe il lavoro
 *    dell'altro senza accorgersene.
 */
export function fondiImpostazioni(locali, remote) {
  if (!remote) return locali;
  const quandoLocali = Date.parse(locali?.aggiornatoISO ?? '') || 0;
  const quandoRemote = Date.parse(remote.aggiornatoISO ?? '') || 0;
  if (quandoLocali > quandoRemote) return locali;   // qui si è modificato dopo
  const unite = { ...locali, ...impostazioniDaMandare(remote) };
  for (const chiave of CHIAVI_LOCALI) unite[chiave] = locali[chiave];
  unite.aggiornatoISO = remote.aggiornatoISO ?? locali?.aggiornatoISO;
  unite.funzioni = { ...locali.funzioni, ...impostazioniDaMandare(remote).funzioni };
  for (const chiave of FUNZIONI_LOCALI) unite.funzioni[chiave] = locali.funzioni?.[chiave] ?? false;

  // Un elenco remoto VUOTO non cancella quello di qui. Non è mai una decisione:
  // è un dispositivo che ha scritto prima di aver ricevuto le impostazioni.
  // Succedeva davvero — il telefono apriva le Impostazioni senza categorie,
  // se ne aggiungeva una e le quattro del PC sparivano al giro dopo.
  for (const chiave of ['categorie', 'maggiorazioni', 'statiVeicolo']) {
    if (!unite[chiave]?.length && locali?.[chiave]?.length) unite[chiave] = locali[chiave];
  }
  if (!Object.keys(unite.funzioni ?? {}).length) unite.funzioni = locali?.funzioni ?? {};
  return unite;
}

/** Tutti i record locali, appiattiti in `{tipo, id, dati}`. */
export function recordLocali(stato) {
  const fuori = [];
  for (const [tipo, collezione] of Object.entries(COLLEZIONI)) {
    for (const record of stato[collezione] ?? []) {
      fuori.push({ tipo, id: record.id, dati: record, aggiornatoISO: record.aggiornatoISO });
    }
  }
  return fuori;
}

/**
 * Cosa spedire al database: i record modificati dopo l'ultimo invio riuscito,
 * più i tombstone delle cancellazioni.
 * @param {object} stato
 * @param {string} dopoISO ultimo invio andato a buon fine ('' = manda tutto)
 */
export function daSpedire(stato, dopoISO = '') {
  const soglia = Date.parse(dopoISO) || 0;
  const record = recordLocali(stato)
    .filter((r) => quando(r.dati) > soglia)
    .map((r) => ({ tipo: r.tipo, id: r.id, dati: r.dati, cancellato: false }));

  const tombe = (stato.cancellati ?? [])
    .filter((c) => (Date.parse(c.quandoISO) || 0) > soglia)
    .map((c) => ({ tipo: c.tipo, id: c.id, dati: { id: c.id, aggiornatoISO: c.quandoISO }, cancellato: true }));

  return [...record, ...tombe];
}

/**
 * Applica allo stato locale i record arrivati dal database.
 *
 * REGOLE DI SICUREZZA, che sono il motivo per cui questa funzione esiste:
 *  - un record remoto più VECCHIO del locale non lo tocca;
 *  - una cancellazione remota vale solo se è più recente della modifica locale;
 *  - un elenco remoto VUOTO non cancella niente: "il cloud non ha nulla" vuol
 *    dire "carica tu", mai "svuota il computer".
 *
 * @returns {{applicati:number, ignorati:number, cancellati:number}}
 */
export function applicaRemoti(stato, remoti = []) {
  const conto = { applicati: 0, ignorati: 0, cancellati: 0 };

  for (const remoto of remoti) {
    const collezione = COLLEZIONI[remoto.tipo];
    if (!collezione) { conto.ignorati += 1; continue; }
    if (!Array.isArray(stato[collezione])) stato[collezione] = [];

    const elenco = stato[collezione];
    const idx = elenco.findIndex((r) => r.id === remoto.id);
    const locale = idx === -1 ? null : elenco[idx];
    const quandoRemoto = Date.parse(remoto.dati?.aggiornatoISO ?? remoto.aggiornatoISO ?? '') || 0;

    // il locale è più fresco: si tiene quello, e al prossimo giro lo si spedisce
    if (locale && quando(locale) > quandoRemoto) { conto.ignorati += 1; continue; }

    if (remoto.cancellato) {
      if (locale) { elenco.splice(idx, 1); conto.cancellati += 1; }
      // il tombstone si tiene anche se il record qui non c'era: un terzo
      // dispositivo potrebbe ancora avercelo
      segnaTomba(stato, remoto.tipo, remoto.id, remoto.dati?.aggiornatoISO);
      continue;
    }

    if (locale) elenco[idx] = remoto.dati;
    else elenco.push(remoto.dati);
    conto.applicati += 1;
  }
  return conto;
}

function segnaTomba(stato, tipo, id, quandoISO) {
  if (!Array.isArray(stato.cancellati)) stato.cancellati = [];
  const gia = stato.cancellati.find((c) => c.tipo === tipo && c.id === id);
  const data = quandoISO ?? new Date().toISOString();
  if (gia) gia.quandoISO = data;
  else stato.cancellati.push({ tipo, id, quandoISO: data });
}

/**
 * Due schemi diversi non si fondono: meglio fermarsi che corrompere i dati.
 * @returns {string} messaggio del problema, oppure '' se si può procedere
 */
export function schemiCompatibili(locale, remoto) {
  if (!remoto) return '';
  if (remoto === locale) return '';
  if (remoto > locale) {
    return `I dati sul cloud sono di una versione più nuova dell'app (${remoto} contro ${locale}): `
      + 'aggiorna Deposito Auto su questo computer prima di sincronizzare.';
  }
  return '';  // il cloud è più vecchio: le migrazioni locali lo porteranno avanti
}
