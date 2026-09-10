// Scheda "Impostazioni" del telefono.
//
// Si cambiano le cose del DEPOSITO: tariffe, categorie, maggiorazioni, stati
// veicolo, dati per la ricevuta. Vanno sul database e arrivano al computer al
// suo prossimo giro di sincronia (e viceversa: vince chi ha modificato dopo).
//
// NON si toccano da qui: piano, tema del PC, modello AI, report automatici,
// azzeramento dati, backup e ripristino. Sono cose di quel computer, o troppo
// pericolose per un tocco distratto sul telefono.
import { euro } from '../shared/formato.js';
import { idDaNome } from '../shared/categorie.js';
import { campoEuro } from '../componenti/campoEuro.js';
import { conferma } from '../componenti/conferma.js';

/**
 * Quali sezioni erano aperte. Vive fuori da `render` perché il guscio
 * ricostruisce la schermata a ogni salvataggio e ogni cinque secondi: senza
 * questa memoria la sezione si richiudeva sotto le dita appena si salvava, e
 * sembrava che il salvataggio non fosse andato a buon fine.
 */
const aperte = new Set(['💶 Tariffe di partenza']);

export function render(main, ctx) {
  const imp = ctx.stato.impostazioni ?? {};

  if (ctx.soloLettura) {
    const avviso = document.createElement('div');
    avviso.className = 'vuoto';
    const faccia = document.createElement('span');
    faccia.className = 'faccia';
    faccia.textContent = '📴';
    const p = document.createElement('p');
    p.textContent = 'Senza connessione le impostazioni non si possono cambiare.';
    avviso.append(faccia, p);
    main.appendChild(avviso);
    return;
  }

  // Le impostazioni non sono ancora arrivate dal database. Mostrarle a zero era
  // peggio che non mostrarle: si vedeva "nessun tipo di veicolo", e chi ne
  // aggiungeva uno spediva un elenco di UN elemento che cancellava i quattro
  // del computer. Finché non sono arrivate, qui non si salva niente.
  if (!(imp.categorie ?? []).length) {
    const attesa = document.createElement('div');
    attesa.className = 'vuoto';
    const faccia = document.createElement('span');
    faccia.className = 'faccia';
    faccia.textContent = '⏳';
    const p = document.createElement('p');
    p.textContent = 'Le impostazioni non sono ancora arrivate dal computer del deposito. '
      + 'Apri Deposito Auto sul PC per un momento: appena si allinea, qui potrai cambiarle.';
    attesa.append(faccia, p);
    main.appendChild(attesa);
    main.appendChild(sezioneAccount(ctx));
    return;
  }

  // Finché c'è una modifica non salvata, il guscio non ridisegna: altrimenti
  // bastava togliere il dito dal campo (toccare un titolo, una spunta) perché
  // entro cinque secondi sparisse tutto quello che si stava scrivendo.
  const segnaLavoro = () => { main.dataset.inLavorazione = '1'; };
  main.addEventListener('input', segnaLavoro);
  main.addEventListener('change', segnaLavoro);

  const salva = async (patch, messaggio) => {
    try {
      await ctx.esegui('salvaImpostazioni', patch);
      main.dataset.inLavorazione = '';   // salvato: si può ridisegnare
      ctx.avvisa(messaggio ?? 'Salvato', 'ok');
    } catch (err) { ctx.avvisaErrore(err); }
  };

  main.append(
    sezioneTariffe(imp, salva),
    sezioneAttivita(imp, salva),
    sezioneCategorie(imp, salva, ctx),
    sezioneMaggiorazioni(imp, salva, ctx),
    sezioneStati(imp, salva, ctx),
    sezioneAccount(ctx),
  );
}

// ---------- mattoni ----------

function sezione(titolo) {
  const det = document.createElement('details');
  det.className = 'sezione';
  det.open = aperte.has(titolo);
  const sum = document.createElement('summary');
  sum.textContent = titolo;
  det.appendChild(sum);
  // così, dopo un salvataggio, la sezione si ritrova aperta com'era
  det.addEventListener('toggle', () => {
    if (det.open) aperte.add(titolo); else aperte.delete(titolo);
  });
  return det;
}

function etichetta(t) {
  const l = document.createElement('label');
  l.textContent = t;
  return l;
}

function bottoneSalva(testo, azione) {
  const b = document.createElement('button');
  b.className = 'btn verde';
  b.textContent = testo;
  b.addEventListener('click', async () => {
    b.disabled = true;
    await azione();
    b.disabled = false;
  });
  return b;
}

// ---------- sezioni ----------

function sezioneTariffe(imp, salva) {
  const det = sezione('💶 Tariffe di partenza');
  const nota = document.createElement('p');
  nota.className = 'tenue';
  nota.textContent = 'Sono i valori di partenza per le categorie nuove: il prezzo vero '
    + 'di ogni ingresso lo decide il tipo di veicolo qui sotto.';

  const ceFisso = campoEuro(imp.costoFissoCents ?? 0);
  const ceOraria = campoEuro(imp.tariffaOrariaCents ?? 0);
  const ceGiorn = campoEuro(imp.tariffaGiornalieraCents ?? 0);

  det.append(nota,
    etichetta('Costo fisso di partenza'), ceFisso.el,
    etichetta('Tariffa oraria'), ceOraria.el,
    etichetta('Tariffa giornaliera'), ceGiorn.el,
    bottoneSalva('💾 Salva le tariffe', () => salva({
      costoFissoCents: ceFisso.leggiCents(),
      tariffaOrariaCents: ceOraria.leggiCents(),
      tariffaGiornalieraCents: ceGiorn.leggiCents(),
    }, 'Tariffe salvate')));
  return det;
}

function sezioneAttivita(imp, salva) {
  const det = sezione('🏢 Dati dell\'attività');
  const inNome = document.createElement('input');
  inNome.value = imp.nomeAttivita ?? '';
  const inIndirizzo = document.createElement('input');
  inIndirizzo.value = imp.indirizzo ?? '';
  const inTelefono = document.createElement('input');
  inTelefono.type = 'tel';
  inTelefono.value = imp.telefono ?? '';
  const inPiede = document.createElement('input');
  inPiede.value = imp.piedeRicevuta ?? '';

  // Dopo quanti giorni un'auto ferma va segnalata. Non è una chiave di questo
  // computer, quindi si può cambiare anche da qui.
  const inGiorni = document.createElement('input');
  inGiorni.type = 'number';
  inGiorni.min = '1';
  inGiorni.inputMode = 'numeric';
  inGiorni.value = String(imp.giorniAvvisoGiacenza ?? 7);

  det.append(
    etichetta('Nome'), inNome,
    etichetta('Indirizzo'), inIndirizzo,
    etichetta('Telefono'), inTelefono,
    etichetta('Riga finale della ricevuta'), inPiede,
    etichetta('Segnala le auto ferme da più di (giorni)'), inGiorni,
    bottoneSalva('💾 Salva i dati', () => salva({
      nomeAttivita: inNome.value.trim(),
      indirizzo: inIndirizzo.value.trim(),
      telefono: inTelefono.value.trim(),
      piedeRicevuta: inPiede.value.trim(),
      giorniAvvisoGiacenza: Math.max(1, parseInt(inGiorni.value, 10) || 7),
    }, 'Dati salvati')));
  return det;
}

function sezioneCategorie(imp, salva, ctx) {
  const det = sezione('🚙 Tipi di veicolo');
  const categorie = JSON.parse(JSON.stringify(imp.categorie ?? []));

  for (const [i, cat] of categorie.entries()) {
    const card = document.createElement('div');
    card.className = 'card';

    const inNome = document.createElement('input');
    inNome.value = cat.nome;
    const inIcona = document.createElement('input');
    inIcona.value = cat.icona ?? '🚗';
    inIcona.maxLength = 4;
    inIcona.style.maxWidth = '90px';
    inIcona.style.textAlign = 'center';
    inIcona.style.fontSize = '24px';
    const ceOraria = campoEuro(cat.tariffaOrariaCents ?? 0);
    const ceGiorn = campoEuro(cat.tariffaGiornalieraCents ?? 0);
    const ceFisso = campoEuro(cat.costoFissoCents ?? 0);

    card.append(
      etichetta('Nome'), inNome,
      etichetta('Icona'), inIcona,
      etichetta('Tariffa oraria'), ceOraria.el,
      etichetta('Tariffa giornaliera'), ceGiorn.el,
      etichetta('Costo fisso'), ceFisso.el,
      bottoneSalva('💾 Salva', () => {
        categorie[i] = {
          ...cat,
          nome: inNome.value.trim() || cat.nome,
          icona: inIcona.value.trim() || cat.icona || '🚗',
          tariffaOrariaCents: ceOraria.leggiCents(),
          tariffaGiornalieraCents: ceGiorn.leggiCents(),
          costoFissoCents: ceFisso.leggiCents(),
        };
        return salva({ categorie }, 'Tipo di veicolo salvato');
      }));

    if (categorie.length > 1) {
      const elimina = document.createElement('button');
      elimina.className = 'btn chiaro';
      elimina.textContent = '🗑 Elimina';
      elimina.addEventListener('click', async () => {
        const ok = await conferma(
          `Eliminare "${cat.nome}"? I veicoli già registrati non cambiano.`,
          { apriFoglio: ctx.apriFoglio, testoConferma: 'Elimina', pericoloso: true },
        );
        if (!ok) return;
        await salva({ categorie: categorie.filter((_, n) => n !== i) }, 'Tipo eliminato');
      });
      card.appendChild(elimina);
    }
    det.appendChild(card);
  }

  const aggiungi = document.createElement('button');
  aggiungi.className = 'btn chiaro';
  aggiungi.textContent = '➕ Aggiungi un tipo di veicolo';
  aggiungi.addEventListener('click', () => {
    const nome = 'Nuovo tipo';
    salva({
      categorie: [...categorie, {
        id: idDaNome(nome, categorie), nome, icona: '🚗',
        tariffaOrariaCents: imp.tariffaOrariaCents ?? 0,
        tariffaGiornalieraCents: imp.tariffaGiornalieraCents ?? 0,
        costoFissoCents: imp.costoFissoCents ?? 0,
      }],
    }, 'Tipo aggiunto: dagli un nome');
  });
  det.appendChild(aggiungi);
  return det;
}

function sezioneMaggiorazioni(imp, salva, ctx) {
  const det = sezione('➕ Maggiorazioni');
  const nota = document.createElement('p');
  nota.className = 'tenue';
  nota.textContent = 'Il NUMERO è quello che compare nella colonna «Magg.» della '
    + 'chiusura di cassa.';
  det.appendChild(nota);

  const maggiorazioni = JSON.parse(JSON.stringify(imp.maggiorazioni ?? []));

  for (const [i, m] of maggiorazioni.entries()) {
    const card = document.createElement('div');
    card.className = 'card';

    const accesa = document.createElement('label');
    accesa.className = 'riga-interruttore';
    const sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.checked = !!m.attiva;
    const testoSw = document.createElement('span');
    testoSw.textContent = 'La uso';
    accesa.append(sw, testoSw);

    const inNome = document.createElement('input');
    inNome.value = m.nome;
    const inNumero = document.createElement('input');
    inNumero.type = 'number';
    inNumero.min = '1';
    inNumero.value = String(m.numero ?? i + 1);
    const ce = campoEuro(m.importoCents ?? 0);
    const selModo = document.createElement('select');
    for (const [v, t] of [['unatantum', 'Una tantum'], ['perUnita', 'Per ogni giorno/ora']]) {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      selModo.appendChild(o);
    }
    selModo.value = m.modo;

    card.append(accesa,
      etichetta('Nome'), inNome,
      etichetta('Numero in cassa'), inNumero,
      etichetta('Importo'), ce.el,
      etichetta('Come si applica'), selModo,
      bottoneSalva('💾 Salva', () => {
        const numero = parseInt(inNumero.value, 10);
        maggiorazioni[i] = {
          ...m,
          attiva: sw.checked,
          nome: inNome.value.trim() || m.nome,
          importoCents: ce.leggiCents(),
          modo: selModo.value,
          numero: Number.isInteger(numero) && numero > 0 ? numero : (m.numero ?? i + 1),
        };
        return salva({ maggiorazioni }, 'Maggiorazione salvata');
      }));

    const elimina = document.createElement('button');
    elimina.className = 'btn chiaro';
    elimina.textContent = '🗑 Elimina';
    elimina.addEventListener('click', async () => {
      const ok = await conferma(`Eliminare "${m.nome}"? I veicoli già registrati non cambiano.`,
        { apriFoglio: ctx.apriFoglio, testoConferma: 'Elimina', pericoloso: true });
      if (!ok) return;
      await salva({ maggiorazioni: maggiorazioni.filter((_, n) => n !== i) }, 'Maggiorazione eliminata');
    });
    card.appendChild(elimina);
    det.appendChild(card);
  }

  const aggiungi = document.createElement('button');
  aggiungi.className = 'btn chiaro';
  aggiungi.textContent = '➕ Aggiungi maggiorazione';
  aggiungi.addEventListener('click', () => {
    const nome = 'Nuova maggiorazione';
    const numero = maggiorazioni.reduce((max, m) => Math.max(max, m.numero | 0), 0) + 1;
    salva({
      maggiorazioni: [...maggiorazioni, {
        id: idDaNome(nome, maggiorazioni), attiva: false, nome,
        importoCents: 0, modo: 'unatantum', numero,
      }],
    }, 'Aggiunta: dalle nome e importo');
  });
  det.appendChild(aggiungi);
  return det;
}

function sezioneStati(imp, salva, ctx) {
  const det = sezione('🛠️ Stato del veicolo');
  const nota = document.createElement('p');
  nota.className = 'tenue';
  nota.textContent = 'È un\'informazione, non cambia il prezzo.';
  det.appendChild(nota);

  const stati = JSON.parse(JSON.stringify(imp.statiVeicolo ?? []));
  for (const [i, s] of stati.entries()) {
    const card = document.createElement('div');
    card.className = 'card';
    const inNome = document.createElement('input');
    inNome.value = s.nome;
    card.append(inNome, bottoneSalva('💾 Salva', () => {
      stati[i] = { ...s, nome: inNome.value.trim() || s.nome };
      return salva({ statiVeicolo: stati }, 'Stato salvato');
    }));
    const elimina = document.createElement('button');
    elimina.className = 'btn chiaro';
    elimina.textContent = '🗑 Elimina';
    elimina.addEventListener('click', async () => {
      const ok = await conferma(`Eliminare lo stato "${s.nome}"?`,
        { apriFoglio: ctx.apriFoglio, testoConferma: 'Elimina', pericoloso: true });
      if (!ok) return;
      await salva({ statiVeicolo: stati.filter((_, n) => n !== i) }, 'Stato eliminato');
    });
    card.appendChild(elimina);
    det.appendChild(card);
  }

  const aggiungi = document.createElement('button');
  aggiungi.className = 'btn chiaro';
  aggiungi.textContent = '➕ Aggiungi stato';
  aggiungi.addEventListener('click', () => {
    const nome = 'Nuovo stato';
    salva({ statiVeicolo: [...stati, { id: idDaNome(nome, stati), nome }] }, 'Stato aggiunto');
  });
  det.appendChild(aggiungi);
  return det;
}

function sezioneAccount(ctx) {
  const det = sezione('👤 Account e app');

  const email = document.createElement('p');
  email.className = 'tenue';
  email.textContent = ctx.email ? `Collegato come ${ctx.email}` : 'Collegato';
  det.appendChild(email);

  const nota = document.createElement('p');
  nota.className = 'tenue';
  nota.textContent = 'Restano sul computer: stampa e PDF, export Excel, foto, '
    + 'copia di sicurezza, azzeramento dati e scelta del piano.';
  det.appendChild(nota);

  const esci = document.createElement('button');
  esci.className = 'btn chiaro';
  esci.textContent = '🚪 Esci dall\'account';
  esci.addEventListener('click', async () => {
    const ok = await conferma('Uscire? Dovrai rimettere email e password per rientrare.',
      { apriFoglio: ctx.apriFoglio, testoConferma: 'Esci' });
    if (ok) ctx.disconnetti();
  });
  det.appendChild(esci);

  void euro;
  return det;
}
