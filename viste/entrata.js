// Scheda "Entrata": registrare un'auto stando nel piazzale, col pollice.
//
// DUE COSE CHE QUESTA SCHERMATA DEVE GARANTIRE, e che prima non garantiva:
//
// 1. QUELLO CHE SI SCRIVE NON SI PERDE. Il guscio (app.js) ridisegna l'app ogni
//    pochi secondi per restare allineato al PC, e ogni ridisegno ricostruiva il
//    modulo da zero: bastava un errore di validazione — il momento in cui si sta
//    leggendo il messaggio e non si sta scrivendo — per ritrovare il modulo
//    vuoto. Adesso ogni campo vive in `bozza`, che sta FUORI da `render` e
//    sopravvive a rimontaggi, cambi di scheda e chiusure della tastiera. Si
//    svuota solo quando l'auto è dentro davvero.
// 2. LE MAGGIORAZIONI SI POSSONO SEMPRE METTERE. Prima la sezione spariva del
//    tutto se nessuna era configurata, e sembrava che l'app non le prevedesse.
//    Adesso c'è sempre: si spuntano quelle del listino e, in ogni caso, se ne
//    può aggiungere una al volo solo per questa sosta.
import { euro, normalizzaTarga, perInputDateTime, soloData } from '../shared/formato.js';
import { tariffaDaCategoria } from '../shared/categorie.js';
import { chiaveCliente } from '../shared/clienti.js';
import { listinoAttivo, tariffeEffettive, maggiorazioniPreferite } from '../shared/listinoCliente.js';
import { MARCHE, modelliDi } from '../shared/veicoli.js';
import { cercaCliente, contaVisite } from '../shared/rubrica.js';
import { abbonamentoAttivo } from '../shared/abbonamenti.js';
import { funzioneAttiva } from '../shared/funzioni.js';
import { scelta } from '../componenti/scelta.js';
import { campoEuro } from '../componenti/campoEuro.js';

/**
 * Quello che l'operatore ha inserito finora. Vive a livello di modulo apposta:
 * `render` viene richiamata di continuo, questa no.
 */
let bozza = null;
let inCorso = false;   // registrazione in volo: il bottone resta fermo

function bozzaNuova() {
  return {
    targa: '',
    cliente: '',
    telefono: '',
    marca: '',
    modello: '',
    categoriaId: '',
    modoTariffa: 'giornaliera',
    statoVeicoloId: '',
    posto: '',
    note: '',
    ingresso: '',            // vuoto = "adesso", deciso al momento di salvare
    prezziAMano: false,
    tariffaCents: 0,
    costoFissoCents: 0,
    scelti: [],              // chiavi delle maggiorazioni del listino spuntate
    libere: [],              // {nome, importoCents, modo} solo per questa sosta
  };
}

/** C'è qualcosa da perdere? Lo chiede il guscio prima di ridisegnare. */
export function bozzaInCorso() {
  if (!bozza) return false;
  return !!(bozza.targa || bozza.cliente || bozza.telefono || bozza.marca || bozza.modello
    || bozza.posto || bozza.note || bozza.scelti.length || bozza.libere.length
    || bozza.prezziAMano || bozza.ingresso);
}

/** Si riparte da foglio bianco: dopo una registrazione riuscita, o su richiesta. */
export function azzeraBozza() {
  bozza = null;
}

export function render(main, ctx) {
  const imp = ctx.stato.impostazioni;
  const categorie = imp.categorie?.length ? imp.categorie : [];
  const stati = imp.statiVeicolo ?? [];
  const catalogo = imp.maggiorazioni ?? [];
  const listino = catalogo.filter((m) => m.attiva && m.importoCents > 0);

  // Senza le impostazioni non si sa quanto far pagare: meglio dirlo che
  // mostrare un modulo che registrerebbe l'auto a tariffa zero. Succede solo
  // al primo avvio, se il telefono entra prima che il PC abbia sincronizzato.
  if (categorie.length === 0) {
    const vuoto = document.createElement('div');
    vuoto.className = 'vuoto';
    const faccia = document.createElement('span');
    faccia.className = 'faccia';
    faccia.textContent = '⏳';
    const testo = document.createElement('p');
    testo.textContent = 'Le tariffe non sono ancora arrivate dal computer del deposito. '
      + 'Apri Deposito Auto sul PC per un momento: appena si allinea, qui potrai registrare.';
    vuoto.append(faccia, testo);
    main.appendChild(vuoto);
    return;
  }

  if (!bozza) bozza = bozzaNuova();
  if (!categorie.some((c) => c.id === bozza.categoriaId)) bozza.categoriaId = categorie[0].id;

  // arrivando da "Nuova auto per questo cliente" il cliente è già deciso
  const clienti = [...(ctx.stato.clienti ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const clientePassato = ctx.parametri?.clienteId
    ? clienti.find((c) => c.id === ctx.parametri.clienteId)
    : null;
  if (clientePassato && !bozza.cliente) {
    bozza.cliente = clientePassato.nome;
    bozza.telefono = clientePassato.telefono ?? '';
  }

  /**
   * Annota sul DOM che qui c'è lavoro in corso: finché questo attributo esiste,
   * il giro di allineamento del guscio non ridisegna la schermata.
   */
  const salva = () => { main.dataset.inLavorazione = bozzaInCorso() ? '1' : ''; };
  salva();

  const etichetta = (testo) => {
    const l = document.createElement('label');
    l.textContent = testo;
    return l;
  };

  // --- targa ---
  const inTarga = document.createElement('input');
  inTarga.className = 'targa-input';
  inTarga.placeholder = 'AB123CD';
  inTarga.autocapitalize = 'characters';
  inTarga.autocomplete = 'off';
  inTarga.spellcheck = false;
  inTarga.value = bozza.targa;

  const bannerTarga = document.createElement('p');
  bannerTarga.className = 'nota-riga';
  const bannerAbbonato = document.createElement('p');
  bannerAbbonato.className = 'nota-riga giallo';
  main.append(etichetta('Targa'), inTarga, bannerTarga, bannerAbbonato);

  // --- cliente ---
  const inTelefono = document.createElement('input');
  inTelefono.type = 'tel';
  inTelefono.placeholder = 'Telefono (facoltativo)';
  inTelefono.value = bozza.telefono;
  inTelefono.addEventListener('input', () => {
    bozza.telefono = inTelefono.value;
    salva();
    aggiorna();
  });

  const selCliente = scelta({
    valore: bozza.cliente,
    segnaposto: 'Nome del cliente',
    titolo: 'Chi porta l’auto?',
    apriFoglio: ctx.apriFoglio,
    voci: () => clienti.map((c) => ({
      valore: c.nome, etichetta: c.nome, dettaglio: c.telefono ?? '', dato: c,
    })),
    onScelta: (v, c) => {
      bozza.cliente = v;
      if (c?.telefono && !inTelefono.value) {
        inTelefono.value = c.telefono;
        bozza.telefono = c.telefono;
      }
      salva();
      aggiorna();
    },
  });
  main.append(etichetta('Cliente'), selCliente.el, inTelefono);

  /** La scheda del cliente scelto (per nome, o nome+telefono). */
  const schedaCliente = () => {
    const nome = bozza.cliente.trim().toLowerCase();
    if (!nome) return null;
    const chiave = chiaveCliente(bozza.cliente, bozza.telefono);
    return clienti.find((c) => chiaveCliente(c.nome, c.telefono) === chiave)
      ?? clienti.find((c) => c.nome.toLowerCase() === nome)
      ?? null;
  };

  // --- veicolo ---
  const selMarca = scelta({
    valore: bozza.marca,
    segnaposto: 'Marca',
    titolo: 'Marca',
    apriFoglio: ctx.apriFoglio,
    voci: () => MARCHE.map((m) => m.nome ?? m),
    onScelta: (v) => {
      bozza.marca = v;
      bozza.modello = '';
      selModello.scrivi('');
      salva();
    },
  });
  const selModello = scelta({
    valore: bozza.modello,
    segnaposto: 'Modello',
    titolo: 'Modello',
    apriFoglio: ctx.apriFoglio,
    voci: () => modelliDi(bozza.marca),
    onScelta: (v) => { bozza.modello = v; salva(); },
  });
  main.append(etichetta('Veicolo'), selMarca.el, selModello.el);

  // --- categoria e modo di conteggio ---
  const scelteCategoria = document.createElement('div');
  scelteCategoria.className = 'scelte';
  main.append(etichetta('Tipo di veicolo'), scelteCategoria);

  const scelteModo = document.createElement('div');
  scelteModo.className = 'scelte';
  main.append(etichetta('Come si conta'), scelteModo);

  // --- prezzi: quelli del listino, o quelli corretti a mano ---
  const riepilogo = document.createElement('div');
  riepilogo.className = 'card';
  const bottoneMano = document.createElement('button');
  bottoneMano.type = 'button';
  bottoneMano.className = 'btn chiaro';
  const ceFisso = campoEuro(bozza.costoFissoCents);
  const ceTariffa = campoEuro(bozza.tariffaCents);
  const campiMano = document.createElement('div');
  campiMano.append(etichetta('Costo fisso di partenza'), ceFisso.el,
    etichetta('Tariffa'), ceTariffa.el);
  ceFisso.el.addEventListener('input', () => { bozza.costoFissoCents = ceFisso.leggiCents(); salva(); });
  ceTariffa.el.addEventListener('input', () => { bozza.tariffaCents = ceTariffa.leggiCents(); salva(); });
  main.append(riepilogo, bottoneMano, campiMano);

  const categoriaScelta = () => categorie.find((c) => c.id === bozza.categoriaId) ?? categorie[0];

  /** Tariffe del listino: quelle della categoria, sovrascritte dal cliente. */
  const tariffeDaListino = () => {
    const cat = categoriaScelta();
    const cliente = schedaCliente();
    if (!listinoAttivo(cliente)) {
      return {
        tariffaCents: tariffaDaCategoria(cat, bozza.modoTariffa),
        costoFissoCents: cat?.costoFissoCents ?? 0,
      };
    }
    return tariffeEffettive(imp, cliente, {
      modoTariffa: bozza.modoTariffa, categoriaId: cat?.id ?? '',
    });
  };

  /** Quello che si applicherà davvero: il listino, o la correzione a mano. */
  const prezziApplicati = () => (bozza.prezziAMano
    ? { tariffaCents: bozza.tariffaCents, costoFissoCents: bozza.costoFissoCents }
    : tariffeDaListino());

  const passaAMano = (tariffaCents, costoFissoCents) => {
    bozza.prezziAMano = true;
    bozza.tariffaCents = tariffaCents;
    bozza.costoFissoCents = costoFissoCents;
    ceTariffa.scriviCents(tariffaCents);
    ceFisso.scriviCents(costoFissoCents);
    salva();
  };

  bottoneMano.addEventListener('click', () => {
    if (bozza.prezziAMano) {
      bozza.prezziAMano = false;
      salva();
    } else {
      const l = tariffeDaListino();
      passaAMano(l.tariffaCents, l.costoFissoCents);
    }
    aggiorna();
  });

  // --- data e ora d'ingresso ---
  // Di solito è adesso e non si tocca; serve quando si registra un'auto entrata
  // prima (il classico "me ne ero dimenticato").
  const inIngresso = document.createElement('input');
  inIngresso.type = 'datetime-local';
  inIngresso.value = bozza.ingresso || perInputDateTime(new Date());
  inIngresso.addEventListener('change', () => { bozza.ingresso = inIngresso.value; salva(); });
  const adesso = document.createElement('button');
  adesso.type = 'button';
  adesso.className = 'btn chiaro';
  adesso.textContent = '🕐 Adesso';
  adesso.addEventListener('click', () => {
    bozza.ingresso = '';
    inIngresso.value = perInputDateTime(new Date());
    salva();
  });
  main.append(etichetta('Data e ora di ingresso'), inIngresso, adesso);

  // --- stato del veicolo ---
  if (stati.length) {
    const sel = document.createElement('select');
    const vuoto = document.createElement('option');
    vuoto.value = '';
    vuoto.textContent = 'Non indicato';
    sel.appendChild(vuoto);
    for (const s of stati) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.nome;
      sel.appendChild(o);
    }
    sel.value = bozza.statoVeicoloId;
    sel.addEventListener('change', () => { bozza.statoVeicoloId = sel.value; salva(); });
    main.append(etichetta('Stato del mezzo'), sel);
  }

  // --- maggiorazioni ---
  // La sezione c'è SEMPRE, anche col listino vuoto: prima spariva e sembrava
  // che dal telefono non si potessero mettere.
  const scelteExtra = document.createElement('div');
  scelteExtra.className = 'scelte';
  const elencoLibere = document.createElement('div');
  const notaExtra = document.createElement('p');
  notaExtra.className = 'nota-riga';
  const aggiungiExtra = document.createElement('button');
  aggiungiExtra.type = 'button';
  aggiungiExtra.className = 'btn chiaro';
  aggiungiExtra.textContent = '➕ Aggiungi una maggiorazione';
  main.append(etichetta('Maggiorazioni'), notaExtra, scelteExtra, elencoLibere, aggiungiExtra);

  /** La maggiorazione del listino come si applica a QUESTO cliente. */
  const perQuestoCliente = (m) => {
    const sua = maggiorazioniPreferite(schedaCliente(), catalogo).find((x) => x.chiave === m.id);
    return {
      chiave: m.id,
      nome: m.nome,
      importoCents: sua?.importoCents ?? m.importoCents,
      modo: sua?.modo ?? m.modo,
      numero: m.numero ?? 0,
      suMisura: !!sua?.suMisura,
    };
  };

  aggiungiExtra.addEventListener('click', () => {
    ctx.apriFoglio((foglio, chiudi) => {
      const h = document.createElement('h2');
      h.style.cssText = 'margin:0 0 4px;font-size:19px;';
      h.textContent = 'Maggiorazione per questa sosta';
      const spiega = document.createElement('p');
      spiega.className = 'tenue';
      spiega.textContent = 'Vale solo per questa auto. Quelle che ricorrono conviene '
        + 'metterle in Impostazioni: le ritrovi spuntabili ogni volta.';

      const inNome = document.createElement('input');
      inNome.placeholder = 'Es. Lavaggio motore';
      const ce = campoEuro(0);
      let modo = 'unatantum';

      const scelteModoExtra = document.createElement('div');
      scelteModoExtra.className = 'scelte';
      const disegnaModo = () => {
        scelteModoExtra.innerHTML = '';
        for (const [chiave, nome] of [['unatantum', 'Una volta sola'], ['perUnita', 'Per ogni giorno/ora']]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = chiave === modo ? 'scelta' : '';
          b.textContent = nome;
          b.addEventListener('click', () => { modo = chiave; disegnaModo(); });
          scelteModoExtra.appendChild(b);
        }
      };
      disegnaModo();

      const ok = document.createElement('button');
      ok.className = 'btn verde';
      ok.textContent = 'Aggiungi';
      ok.addEventListener('click', () => {
        const nome = inNome.value.trim();
        if (!nome) return ctx.avvisa('Serve un nome per la maggiorazione', 'ko');
        if (ce.leggiCents() <= 0) return ctx.avvisa('Serve un importo (250 = 2,50 €)', 'ko');
        bozza.libere.push({ nome, importoCents: ce.leggiCents(), modo });
        salva();
        chiudi();
        aggiorna();
      });
      const annulla = document.createElement('button');
      annulla.className = 'btn chiaro';
      annulla.textContent = 'Annulla';
      annulla.addEventListener('click', chiudi);

      const etNome = document.createElement('label');
      etNome.textContent = 'Che cos’è';
      const etImporto = document.createElement('label');
      etImporto.textContent = 'Quanto';
      const etModo = document.createElement('label');
      etModo.textContent = 'Come si conta';
      foglio.append(h, spiega, etNome, inNome, etImporto, ce.el, etModo, scelteModoExtra, ok, annulla);
    });
  });

  // --- posto e note ---
  const inPosto = document.createElement('input');
  inPosto.placeholder = 'Es. B12';
  inPosto.autocapitalize = 'characters';
  inPosto.value = bozza.posto;
  inPosto.addEventListener('input', () => { bozza.posto = inPosto.value; salva(); });
  const inNote = document.createElement('textarea');
  inNote.rows = 2;
  inNote.placeholder = 'Note (facoltative)';
  inNote.value = bozza.note;
  inNote.addEventListener('input', () => { bozza.note = inNote.value; salva(); });
  main.append(etichetta('Posto'), inPosto, etichetta('Note'), inNote);

  // --- registra ---
  const btn = document.createElement('button');
  btn.className = 'btn verde';
  btn.textContent = '✅ REGISTRA ENTRATA';
  main.appendChild(btn);

  // --- ridisegno delle parti che dipendono dalle scelte ------------------
  function aggiorna() {
    // chip delle categorie
    scelteCategoria.innerHTML = '';
    for (const c of categorie) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = c.id === bozza.categoriaId ? 'scelta' : '';
      b.textContent = `${c.icona ?? '🚗'} ${c.nome}`;
      b.addEventListener('click', () => { bozza.categoriaId = c.id; salva(); aggiorna(); });
      scelteCategoria.appendChild(b);
    }

    // chip orario/giornaliero
    scelteModo.innerHTML = '';
    for (const [chiave, nome] of [['giornaliera', '📅 A giornata'], ['oraria', '⏱ A ore']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = chiave === bozza.modoTariffa ? 'scelta' : '';
      b.textContent = nome;
      b.addEventListener('click', () => { bozza.modoTariffa = chiave; salva(); aggiorna(); });
      scelteModo.appendChild(b);
    }

    // riepilogo dei prezzi
    const conto = prezziApplicati();
    riepilogo.innerHTML = '';
    for (const [testo, valore, verde] of [
      ['Costo fisso di partenza', euro(conto.costoFissoCents), false],
      [bozza.modoTariffa === 'oraria' ? 'Ogni ora' : 'Ogni giorno', euro(conto.tariffaCents), true],
    ]) {
      const riga = document.createElement('div');
      riga.className = 'riga';
      const e = document.createElement('span');
      e.className = 'tenue';
      e.textContent = testo;
      const v = document.createElement('strong');
      if (verde) v.className = 'verde';
      v.textContent = valore;
      riga.append(e, v);
      riepilogo.appendChild(riga);
    }
    const cliente = schedaCliente();
    if (bozza.prezziAMano) {
      const nota = document.createElement('div');
      nota.className = 'tenue';
      nota.textContent = '✏️ prezzi corretti a mano per questa sosta';
      riepilogo.appendChild(nota);
    } else if (listinoAttivo(cliente)) {
      const nota = document.createElement('div');
      nota.className = 'tenue';
      nota.textContent = `💠 listino di ${cliente.nome}`;
      riepilogo.appendChild(nota);
    }
    bottoneMano.textContent = bozza.prezziAMano
      ? '↩️ Torna ai prezzi del listino'
      : '✏️ Correggi i prezzi a mano';
    campiMano.style.display = bozza.prezziAMano ? '' : 'none';

    // maggiorazioni del listino
    scelteExtra.innerHTML = '';
    for (const m of listino) {
      const eff = perQuestoCliente(m);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = bozza.scelti.includes(m.id) ? 'scelta' : '';
      b.textContent = `${eff.nome} +${euro(eff.importoCents)}`
        + (eff.modo === 'perUnita' ? ' cad.' : '')
        + (eff.suMisura ? ' 💠' : '');
      b.addEventListener('click', () => {
        bozza.scelti = bozza.scelti.includes(m.id)
          ? bozza.scelti.filter((x) => x !== m.id)
          : [...bozza.scelti, m.id];
        salva();
        aggiorna();
      });
      scelteExtra.appendChild(b);
    }
    scelteExtra.style.display = listino.length ? '' : 'none';

    // maggiorazioni al volo, con la crocetta per toglierle
    elencoLibere.innerHTML = '';
    bozza.libere.forEach((m, i) => {
      const riga = document.createElement('div');
      riga.className = 'riga riga-extra';
      const nome = document.createElement('span');
      nome.textContent = `${m.nome} +${euro(m.importoCents)}`
        + (m.modo === 'perUnita' ? ' cad.' : '');
      const via = document.createElement('button');
      via.type = 'button';
      via.className = 'via';
      via.textContent = '✕';
      via.setAttribute('aria-label', 'Togli');
      via.addEventListener('click', () => {
        bozza.libere.splice(i, 1);
        salva();
        aggiorna();
      });
      riga.append(nome, via);
      elencoLibere.appendChild(riga);
    });

    notaExtra.textContent = listino.length
      ? ''
      : 'Nel listino non ce n’è nessuna attiva. Puoi aggiungerne una qui sotto solo per '
        + 'questa sosta, oppure impostarle una volta per tutte in ☰ Altro → Impostazioni.';
    notaExtra.style.display = listino.length ? 'none' : '';

    // targa già passata di qui, e abbonamento
    const targa = normalizzaTarga(inTarga.value);
    const passato = funzioneAttiva(ctx.stato, 'rubrica') && targa
      ? cercaCliente(ctx.stato.storico, targa) : null;
    if (passato) {
      const visite = contaVisite(ctx.stato.storico, targa);
      bannerTarga.textContent = `🚗 Già passata di qui: ${visite} visit${visite === 1 ? 'a' : 'e'}, `
        + `l’ultima il ${soloData(passato.uscitaISO)}`;
    } else {
      bannerTarga.textContent = '';
    }
    bannerTarga.style.display = passato ? '' : 'none';

    const abb = funzioneAttiva(ctx.stato, 'abbonamenti') && targa
      ? abbonamentoAttivo(ctx.stato.abbonamenti, targa, Date.now()) : null;
    bannerAbbonato.textContent = abb
      ? `⭐ ABBONATO fino al ${soloData(abb.fineISO)} — nessun addebito`
      : '';
    bannerAbbonato.style.display = abb ? '' : 'none';

    btn.disabled = inCorso;
    btn.textContent = inCorso ? 'Registrazione in corso…' : '✅ REGISTRA ENTRATA';
  }

  // --- targa: precompilazione da chi è già passato di qui ---
  let ultimaTargaVista = '';
  inTarga.addEventListener('input', () => {
    bozza.targa = inTarga.value;
    salva();
    const targa = normalizzaTarga(inTarga.value);
    // si precompila una volta sola per targa, e solo i campi ancora vuoti:
    // correggere a mano e vedersi sovrascrivere sarebbe peggio del niente
    if (targa && targa !== ultimaTargaVista && funzioneAttiva(ctx.stato, 'rubrica')) {
      ultimaTargaVista = targa;
      const passato = cercaCliente(ctx.stato.storico, targa);
      if (passato) {
        if (!bozza.cliente && passato.proprietario) {
          bozza.cliente = passato.proprietario;
          selCliente.scrivi(passato.proprietario);
        }
        if (!bozza.telefono && passato.telefono) {
          bozza.telefono = passato.telefono;
          inTelefono.value = passato.telefono;
        }
        if (!bozza.marca && passato.marca) { bozza.marca = passato.marca; selMarca.scrivi(passato.marca); }
        if (!bozza.modello && passato.modello) { bozza.modello = passato.modello; selModello.scrivi(passato.modello); }
        if (passato.categoriaId && categorie.some((c) => c.id === passato.categoriaId)) {
          bozza.categoriaId = passato.categoriaId;
        }
        if (passato.modoTariffa) bozza.modoTariffa = passato.modoTariffa;
      }
    }
    // l'abbonato non paga: le tariffe vanno a zero, e restano correggibili
    const abb = funzioneAttiva(ctx.stato, 'abbonamenti') && targa
      ? abbonamentoAttivo(ctx.stato.abbonamenti, targa, Date.now()) : null;
    if (abb && !bozza.prezziAMano) passaAMano(0, 0);
    aggiorna();
  });

  btn.addEventListener('click', async () => {
    if (inCorso) return;
    const targa = normalizzaTarga(inTarga.value);
    // Attenzione: da qui in giù NON si perde niente. La bozza resta com'è, e
    // un avviso rosso è solo un avviso: si corregge il campo e si ripreme.
    if (!targa) return ctx.avvisa('Serve la targa', 'ko');
    if (ctx.stato.autoInDeposito.some((a) => a.targa === targa)) {
      return ctx.avvisa(`${targa} risulta già in deposito`, 'ko');
    }
    const conto = prezziApplicati();
    const abbonato = funzioneAttiva(ctx.stato, 'abbonamenti')
      && abbonamentoAttivo(ctx.stato.abbonamenti, targa, Date.now());
    if (conto.tariffaCents === 0 && conto.costoFissoCents === 0 && !abbonato) {
      return ctx.avvisa('Le tariffe sono a zero: correggile a mano o scegli un tipo di veicolo', 'ko');
    }

    // quelle spuntate dal listino (al prezzo di questo cliente), quelle fisse
    // del suo listino, e quelle aggiunte al volo per questa sosta
    const maggiorazioni = listino
      .filter((m) => bozza.scelti.includes(m.id))
      .map((m) => {
        const { chiave, nome, importoCents, modo, numero } = perQuestoCliente(m);
        return { chiave, nome, importoCents, modo, numero };
      });
    for (const m of maggiorazioniPreferite(schedaCliente(), catalogo)) {
      if (!maggiorazioni.some((x) => x.chiave === m.chiave)) {
        const { chiave, nome, importoCents, modo, numero } = m;
        maggiorazioni.push({ chiave, nome, importoCents, modo, numero });
      }
    }
    for (const m of bozza.libere) {
      maggiorazioni.push({
        chiave: '', nome: m.nome, importoCents: m.importoCents, modo: m.modo, numero: 0,
      });
    }

    inCorso = true;
    aggiorna();
    try {
      let clienteId = clientePassato?.id ?? '';
      const nome = bozza.cliente.trim();
      if (nome) {
        const risposta = await ctx.esegui('salvaCliente', { nome, telefono: bozza.telefono.trim() });
        clienteId = risposta.cliente.id;
      }
      await ctx.esegui('aggiungiAuto', {
        targa,
        proprietario: nome,
        telefono: bozza.telefono.trim(),
        marca: bozza.marca,
        modello: bozza.modello,
        note: bozza.note.trim(),
        posto: bozza.posto.trim(),
        ingressoISO: bozza.ingresso
          ? new Date(bozza.ingresso).toISOString()
          : new Date().toISOString(),
        modoTariffa: bozza.modoTariffa,
        costoFissoCents: conto.costoFissoCents,
        tariffaCents: conto.tariffaCents,
        categoriaId: bozza.categoriaId,
        statoVeicoloId: bozza.statoVeicoloId,
        clienteId,
        maggiorazioni,
      });
      inCorso = false;
      azzeraBozza();          // adesso sì: l'auto è dentro davvero
      ctx.avvisa(`${targa} è dentro`, 'ok');
      ctx.vai('deposito');
    } catch (err) {
      inCorso = false;
      // Se il cliente si era già salvato, il guscio ha ridisegnato e questo
      // modulo non è più quello a schermo: si ridisegna, e la bozza rimette
      // tutto al suo posto. Senza, il pulsante resterebbe grigio per sempre.
      ctx.vai('entrata', ctx.parametri);
      ctx.avvisaErrore(err);
    }
  });

  aggiorna();
}
