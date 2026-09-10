// Le operazioni viste dal telefono: stesso motore del PC, database al posto
// del file su disco.
//
// Ogni operazione fa tre cose, in quest'ordine:
//   1. si procura dal database i numeri che servono (ricevuta, ingresso);
//   2. chiama `shared/motore.js` sullo stato in memoria — la stessa identica
//      funzione che gira sul PC, quindi il totale di una sosta è calcolato da
//      un pezzo di codice solo;
//   3. manda su i record che l'operazione ha toccato.
//
// Se il passo 3 non riesce, l'operazione è comunque già scritta nello stato in
// memoria: si ricarica dal database e si riparte da lì. Non esiste una coda
// offline, per scelta: due verità diverse sulla stessa giornata sono
// esattamente ciò che questa architettura evita.
import * as motore from './shared/motore.js';
import {
  salvaRecord, salvaImpostazioni, prossimoNumeroRicevuta, prossimoNumeroIngresso, ErroreNuvola,
} from './nuvola.js';

const auto = (a) => ({ tipo: 'auto', id: a.id, dati: a });
const tomba = (tipo, id) => ({ tipo, id, dati: { id, aggiornatoISO: new Date().toISOString() }, cancellato: true });

/**
 * Esegue un'operazione e la manda al database.
 * @param {object} stato lo stato in memoria del telefono (viene mutato)
 * @param {string} nome nome dell'operazione
 * @returns {Promise<object>} il pezzo che interessa alla vista
 */
export async function esegui(stato, nome, ...args) {
  switch (nome) {
    case 'aggiungiAuto': {
      const [dati] = args;
      const numeroIngresso = motore.serveNumeroIngresso(stato) ? await prossimoNumeroIngresso() : '';
      const nuova = motore.aggiungiAuto(stato, dati, { numeroIngresso });
      await salvaRecord([auto(nuova)]);
      return nuova;
    }

    case 'modificaAuto': {
      const [id, dati] = args;
      const cambiata = motore.modificaAuto(stato, id, dati);
      await salvaRecord([auto(cambiata)]);
      return cambiata;
    }

    case 'chiudiAuto': {
      const [id, opzioni = {}] = args;
      // il numero PRIMA di toccare i dati: se non si riesce ad averlo, la sosta
      // resta aperta invece di chiudersi senza una ricevuta valida
      const numeroRicevuta = await prossimoNumeroRicevuta();
      const record = motore.chiudiAuto(stato, id, { ...opzioni, numeroRicevuta });
      // l'auto cambia collezione: per il database è un record nuovo in "storico"
      // e una cancellazione in "auto"
      await salvaRecord([{ tipo: 'storico', id: record.id, dati: record }, tomba('auto', id)]);
      return record;
    }

    case 'segnaIncassato': {
      const [recordId, incassato = true] = args;
      const record = motore.segnaIncassato(stato, recordId, incassato);
      await salvaRecord([{ tipo: 'storico', id: record.id, dati: record }]);
      return record;
    }

    case 'annullaEntrata': {
      const [id] = args;
      motore.annullaEntrata(stato, id);
      await salvaRecord([tomba('auto', id)]);
      return id;
    }

    case 'salvaCliente': {
      const [dati] = args;
      const { cliente, autoToccate } = motore.salvaCliente(stato, dati);
      await salvaRecord([
        { tipo: 'cliente', id: cliente.id, dati: cliente },
        ...autoToccate.map(auto),
      ]);
      return { cliente, stato };
    }

    case 'eliminaCliente': {
      const [id] = args;
      motore.eliminaCliente(stato, id);
      await salvaRecord([tomba('cliente', id)]);
      return id;
    }

    case 'unisciClienti': {
      const [idTenere, idDaUnire] = args;
      const esito = motore.unisciClienti(stato, idTenere, idDaUnire);
      // tutto quello che ha cambiato padrone deve risalire, piu' la tomba
      const daMandare = [{ tipo: 'cliente', id: esito.cliente.id, dati: esito.cliente }];
      for (const a of stato.autoInDeposito) {
        if (a.clienteId === idTenere) daMandare.push({ tipo: 'auto', id: a.id, dati: a });
      }
      for (const r of stato.storico) {
        if (r.clienteId === idTenere) daMandare.push({ tipo: 'storico', id: r.id, dati: r });
      }
      daMandare.push(tomba('cliente', idDaUnire));
      await salvaRecord(daMandare);
      return esito;
    }

    case 'nuovoAbbonamento': {
      const [dati, metodoPagamento] = args;
      const numeroRicevuta = await prossimoNumeroRicevuta();
      const abb = motore.nuovoAbbonamento(stato, dati, metodoPagamento, { numeroRicevuta });
      await salvaRecord([{ tipo: 'abbonamento', id: abb.id, dati: abb }]);
      return abb;
    }

    case 'rinnovaAbbonamento': {
      const [id, metodoPagamento] = args;
      const numeroRicevuta = await prossimoNumeroRicevuta();
      const abb = motore.rinnovaAbbonamento(stato, id, metodoPagamento, { numeroRicevuta });
      await salvaRecord([{ tipo: 'abbonamento', id: abb.id, dati: abb }]);
      return abb;
    }

    case 'eliminaAbbonamento': {
      const [id] = args;
      motore.eliminaAbbonamento(stato, id);
      await salvaRecord([tomba('abbonamento', id)]);
      return id;
    }

    case 'salvaImpostazioni': {
      // Le impostazioni non passano dal motore nemmeno sul PC: sono la
      // configurazione, non i dati. Qui si scrivono nello stato in memoria e
      // si mandano su; il PC le prenderà al suo prossimo giro di sincronia.
      const [nuove] = args;
      // Rete di sicurezza: un elenco svuotato non parte. Il caso vero era il
      // telefono che apriva le Impostazioni prima di aver ricevuto i dati e
      // spediva `categorie: []`, cancellando quelle del computer.
      for (const chiave of ['categorie', 'maggiorazioni', 'statiVeicolo']) {
        if (Array.isArray(nuove?.[chiave]) && nuove[chiave].length === 0
          && (stato.impostazioni?.[chiave] ?? []).length > 0) {
          throw new ErroreNuvola(
            'Non posso svuotare del tutto questo elenco dal telefono: '
            + 'toglierebbe anche quello che c\'è sul computer.',
          );
        }
      }
      stato.impostazioni = { ...stato.impostazioni, ...nuove };
      stato.impostazioni.aggiornatoISO = new Date().toISOString();
      await salvaImpostazioni(stato.impostazioni);
      return stato.impostazioni;
    }

    default:
      throw new ErroreNuvola(`Operazione non disponibile dal telefono: ${nome}`);
  }
}
