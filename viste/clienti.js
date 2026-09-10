// Scheda "Clienti" del telefono: rubrica, anagrafica completa e listino
// personalizzato — le stesse cose che si fanno dal PC, con le dita.
//
// I calcoli non si rifanno qui: `riepiloghiRapidi` e `riepilogoCliente` sono
// gli stessi moduli puri che usa il computer, quindi i numeri non possono
// divergere fra i due.
import { euro, soloData } from '../shared/formato.js';
import {
  cercaClienti, riepilogoCliente, riepiloghiRapidi,
  GRUPPI_ANAGRAFICA, CAMPI_ANAGRAFICA, descriviAnagrafica, gemelleDi,
} from '../shared/clienti.js';
import { METODI, descriviMetodo } from '../shared/pagamenti.js';
import { preferenzeDefault, listinoAttivo } from '../shared/listinoCliente.js';
import { campoEuro } from '../componenti/campoEuro.js';
import { documentoSchedaCliente } from '../shared/documenti.js';
import { apriDocumento } from '../componenti/documento.js';
import { conferma } from '../componenti/conferma.js';

let filtro = '';
let apertoId = null;
let parametriUsati = null;   // il guscio ridisegna ogni 5 s con gli stessi parametri

export function render(main, ctx) {
  // arrivando dalla Home («due schede per lo stesso cliente») si apre subito
  // quella scheda. Una volta sola, o non si riuscirebbe più a tornare indietro.
  if (ctx.parametri?.clienteId && ctx.parametri !== parametriUsati) {
    parametriUsati = ctx.parametri;
    apertoId = ctx.parametri.clienteId;
  }
  if (apertoId) return scheda(main, ctx);
  elenco(main, ctx);
}

/** Torna all'elenco (serve al guscio quando si cambia scheda). */
export function azzera() {
  apertoId = null;
  filtro = '';
  parametriUsati = null;
}

// ---------- elenco ----------

function elenco(main, ctx) {
  const cerca = document.createElement('input');
  cerca.type = 'search';
  cerca.placeholder = 'Cerca per nome o telefono…';
  cerca.value = filtro;
  main.appendChild(cerca);

  const nuovo = document.createElement('button');
  nuovo.className = 'btn verde';
  nuovo.textContent = '➕ Nuovo cliente';
  nuovo.addEventListener('click', () => modifica(null, ctx));
  main.appendChild(nuovo);

  const area = document.createElement('div');
  main.appendChild(area);

  const disegna = () => {
    filtro = cerca.value;
    area.innerHTML = '';
    const trovati = cercaClienti(ctx.stato.clienti, filtro);
    const riepiloghi = riepiloghiRapidi(ctx.stato);

    if (trovati.length === 0) {
      const vuoto = document.createElement('div');
      vuoto.className = 'vuoto';
      const faccia = document.createElement('span');
      faccia.className = 'faccia';
      faccia.textContent = '👤';
      const p = document.createElement('p');
      p.textContent = (ctx.stato.clienti ?? []).length === 0
        ? 'Non c\'è ancora nessun cliente.'
        : 'Nessun cliente con questa ricerca.';
      vuoto.append(faccia, p);
      area.appendChild(vuoto);
      return;
    }

    for (const c of trovati) {
      const r = riepiloghi.get(c.id) ?? { inDeposito: 0, numMovimenti: 0, fatturatoCents: 0, daIncassareCents: 0 };
      const card = document.createElement('div');
      card.className = 'card tocca';

      const alto = document.createElement('div');
      alto.className = 'riga';
      const nome = document.createElement('div');
      nome.style.fontWeight = '700';
      nome.textContent = c.ragioneSociale || c.nome;
      alto.appendChild(nome);
      if (listinoAttivo(c)) {
        const b = document.createElement('span');
        b.className = 'pillola blu';
        b.textContent = '💠';
        b.title = 'Listino personalizzato';
        alto.appendChild(b);
      }

      const sotto = document.createElement('div');
      sotto.className = 'tenue';
      sotto.textContent = [c.telefono, descriviAnagrafica(c)].filter(Boolean).join(' · ') || 'nessun recapito';

      const conti = document.createElement('div');
      conti.className = 'riga';
      const sx = document.createElement('span');
      sx.className = 'tenue';
      sx.textContent = r.inDeposito > 0
        ? `🚗 ${r.inDeposito} in deposito · ${r.numMovimenti} soste`
        : `${r.numMovimenti} soste`;
      const dx = document.createElement('strong');
      dx.textContent = euro(r.fatturatoCents);
      conti.append(sx, dx);

      card.append(alto, sotto, conti);
      if (r.daIncassareCents > 0) {
        const attesa = document.createElement('div');
        attesa.className = 'giallo';
        attesa.textContent = `⏳ ${euro(r.daIncassareCents)} da incassare`;
        card.appendChild(attesa);
      }
      card.addEventListener('click', () => { apertoId = c.id; ctx.vai('clienti'); });
      area.appendChild(card);
    }
  };

  cerca.addEventListener('input', disegna);
  disegna();
}

// ---------- scheda ----------

function scheda(main, ctx) {
  const r = riepilogoCliente(ctx.stato, apertoId, null);
  if (!r) { apertoId = null; return elenco(main, ctx); }
  const c = r.cliente;

  const indietro = document.createElement('button');
  indietro.className = 'btn chiaro';
  indietro.textContent = '← Tutti i clienti';
  indietro.addEventListener('click', () => { apertoId = null; ctx.vai('clienti'); });
  main.appendChild(indietro);

  const titolo = document.createElement('h2');
  titolo.style.cssText = 'margin:14px 0 2px;font-size:22px;';
  titolo.textContent = `👤 ${c.ragioneSociale || c.nome}`;
  main.appendChild(titolo);

  const anagrafica = descriviAnagrafica(c);
  const sotto = document.createElement('p');
  sotto.className = 'tenue';
  sotto.style.margin = '0 0 12px';
  sotto.textContent = [c.telefono, c.email, anagrafica].filter(Boolean).join(' · ') || 'nessun recapito';
  main.appendChild(sotto);

  // Due schede con lo stesso nome sono la trappola più subdola: il listino
  // personalizzato finisce su una e il lavoro di tutti i giorni sull'altra, e
  // al banco escono i prezzi generali senza che niente lo spieghi. È successo
  // con «Avis», e per settimane è sembrato che i prezzi su misura fossero rotti.
  for (const gemella of gemelleDi(ctx.stato.clienti, c)) {
    const avviso = document.createElement('div');
    avviso.className = 'card avviso-doppione';

    const testo = document.createElement('p');
    testo.style.margin = '0 0 10px';
    testo.textContent = `⚠️ C’è un’altra scheda «${gemella.nome}»`
      + (gemella.telefono ? ` (tel. ${gemella.telefono})` : '')
      + (listinoAttivo(gemella) && !listinoAttivo(c)
        ? '. Il prezzo personalizzato sta su QUELLA: è per questo che qui escono i prezzi generali.'
        : '.');

    const unisci = document.createElement('button');
    unisci.className = 'btn';
    unisci.textContent = '🔗 Unisci qui';
    unisci.addEventListener('click', async () => {
      const ok = await conferma(
        `Unire le due schede di ${c.nome}? Auto, storico e listino dell’altra passano a questa.`,
        { apriFoglio: ctx.apriFoglio, testoConferma: 'Unisci' },
      );
      if (!ok) return;
      unisci.disabled = true;
      try {
        const esito = await ctx.esegui('unisciClienti', c.id, gemella.id);
        ctx.avvisa(`Schede unite: ${esito.autoSpostate} auto e ${esito.storicoSpostato} soste`, 'ok');
      } catch (err) { unisci.disabled = false; ctx.avvisaErrore(err); }
    });

    const vedi = document.createElement('button');
    vedi.className = 'btn chiaro';
    vedi.textContent = 'Vedi quell’altra';
    vedi.addEventListener('click', () => { apertoId = gemella.id; ctx.vai('clienti'); });

    avviso.append(testo, unisci, vedi);
    main.appendChild(avviso);
  }

  // --- riepilogo ---
  const box = document.createElement('div');
  box.className = 'card';
  for (const [et, val, classe] of [
    ['🚗 Auto in gestione', String(r.inDeposito.length), ''],
    ['Totale dovuto', euro(r.fatturatoCents), ''],
    ['✅ Pagato', euro(r.incassatoCents), 'verde'],
    ['⏳ Da incassare', euro(r.daIncassareCents), r.daIncassareCents ? 'giallo' : ''],
    ['Soste', String(r.numMovimenti), ''],
  ]) {
    const riga = document.createElement('div');
    riga.className = 'riga';
    const e = document.createElement('span');
    e.className = 'tenue';
    e.textContent = et;
    const v = document.createElement('strong');
    v.className = classe;
    v.textContent = val;
    riga.append(e, v);
    box.appendChild(riga);
  }
  main.appendChild(box);

  // --- azioni ---
  const nuovaAuto = document.createElement('button');
  nuovaAuto.className = 'btn verde';
  nuovaAuto.textContent = '🚗 Nuova auto per questo cliente';
  nuovaAuto.addEventListener('click', () => ctx.vai('entrata', { clienteId: c.id }));

  const modificaBtn = document.createElement('button');
  modificaBtn.className = 'btn';
  modificaBtn.textContent = '✏️ Modifica dati e listino';
  modificaBtn.addEventListener('click', () => modifica(c, ctx));

  // la stessa scheda che si stampa dal PC, dati fiscali compresi: serve per
  // fatturare, quindi deve essere identica
  const reportBtn = document.createElement('button');
  reportBtn.className = 'btn chiaro';
  reportBtn.textContent = '📄 Scheda e PDF';
  reportBtn.addEventListener('click', () => {
    apriDocumento(documentoSchedaCliente(r, 'tutto lo storico'), {
      nomeFile: 'scheda-' + (c.nome || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      avvisa: ctx.avvisa,
    });
  });

  main.append(nuovaAuto, modificaBtn, reportBtn);

  if (!ctx.soloLettura) {
    const elimina = document.createElement('button');
    elimina.className = 'btn chiaro';
    elimina.textContent = '🗑 Elimina cliente';
    elimina.addEventListener('click', async () => {
      const ok = await conferma(
        `Eliminare la scheda di ${c.nome}? Lo storico delle sue soste resta, ma non sarà più collegato.`,
        { apriFoglio: ctx.apriFoglio, testoConferma: 'Elimina', pericoloso: true },
      );
      if (!ok) return;
      try {
        await ctx.esegui('eliminaCliente', c.id);
        apertoId = null;
        ctx.avvisa('Cliente eliminato', 'ok');
        ctx.vai('clienti');
      } catch (err) { ctx.avvisaErrore(err); }
    });
    main.appendChild(elimina);
  }

  // --- auto in deposito adesso ---
  if (r.inDeposito.length) {
    main.appendChild(intestazione('Auto in deposito adesso'));
    for (const a of r.inDeposito) {
      const card = document.createElement('div');
      card.className = 'card';
      const riga = document.createElement('div');
      riga.className = 'riga';
      const t = document.createElement('span');
      t.className = 'targa';
      t.textContent = a.targa;
      const p = document.createElement('span');
      p.className = 'tenue';
      p.textContent = a.posto ? `📍 ${a.posto}` : '';
      riga.append(t, p);
      card.appendChild(riga);
      main.appendChild(card);
    }
  }

  // --- soste ---
  if (r.movimenti.length) {
    main.appendChild(intestazione('Ultime soste'));
    for (const m of r.movimenti.slice(0, 30)) {
      const card = document.createElement('div');
      card.className = 'card';
      const alto = document.createElement('div');
      alto.className = 'riga';
      const t = document.createElement('span');
      t.className = 'targa';
      t.textContent = m.targa;
      const tot = document.createElement('strong');
      tot.className = 'verde';
      tot.textContent = euro(m.totaleCents);
      alto.append(t, tot);
      const basso = document.createElement('div');
      basso.className = 'riga';
      const q = document.createElement('span');
      q.className = 'tenue';
      q.textContent = soloData(m.uscitaISO);
      const pag = document.createElement('span');
      pag.className = m.incassato === false ? 'giallo' : 'tenue';
      pag.textContent = descriviMetodo(m.metodoPagamento)
        + (m.incassato === false ? ' · da incassare' : '');
      basso.append(q, pag);
      card.append(alto, basso);
      main.appendChild(card);
    }
  }
}

function intestazione(testo) {
  const h = document.createElement('h3');
  h.style.cssText = 'margin:20px 0 8px;font-size:17px;';
  h.textContent = testo;
  return h;
}

// ---------- modifica (foglio dal basso) ----------

function modifica(cliente, ctx) {
  const imp = ctx.stato.impostazioni ?? {};

  ctx.apriFoglio((foglio, chiudi) => {
    const h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 12px;font-size:20px;';
    h.textContent = cliente ? `Modifica ${cliente.nome}` : 'Nuovo cliente';
    foglio.appendChild(h);

    const etichetta = (t) => {
      const l = document.createElement('label');
      l.textContent = t;
      return l;
    };

    const inNome = document.createElement('input');
    inNome.placeholder = 'Nome e cognome o ragione sociale';
    inNome.value = cliente?.nome ?? '';
    const inTelefono = document.createElement('input');
    inTelefono.type = 'tel';
    inTelefono.value = cliente?.telefono ?? '';
    const inEmail = document.createElement('input');
    inEmail.type = 'email';
    inEmail.value = cliente?.email ?? '';
    const inNote = document.createElement('textarea');
    inNote.rows = 2;
    inNote.value = cliente?.note ?? '';

    foglio.append(
      etichetta('Nome *'), inNome,
      etichetta('Telefono'), inTelefono,
      etichetta('Email'), inEmail,
      etichetta('Note'), inNote,
    );

    // --- anagrafica estesa, un gruppo per volta ---
    const campiExtra = new Map();
    for (const gruppo of GRUPPI_ANAGRAFICA) {
      const det = document.createElement('details');
      det.className = 'sezione';
      det.open = gruppo.campi.some((x) => cliente?.[x.chiave]);
      const sum = document.createElement('summary');
      sum.textContent = gruppo.titolo;
      det.appendChild(sum);
      for (const campo of gruppo.campi) {
        const input = document.createElement('input');
        input.value = cliente?.[campo.chiave] ?? '';
        campiExtra.set(campo.chiave, input);
        det.append(etichetta(campo.etichetta), input);
      }
      foglio.appendChild(det);
    }

    // --- listino personalizzato ---
    const pref = { ...preferenzeDefault(), ...(cliente?.preferenze ?? {}) };
    const det = document.createElement('details');
    det.className = 'sezione';
    det.open = !!pref.attive;
    const sum = document.createElement('summary');
    sum.textContent = '💠 Listino personalizzato';
    det.appendChild(sum);

    // Niente interruttore: il listino e' acceso se contiene qualcosa (lo
    // deduce normalizzaPreferenze al salvataggio). Prima la spunta nascondeva
    // proprio i campi che bisognava compilare.
    const spiega = document.createElement('p');
    spiega.className = 'tenue';
    spiega.textContent = 'Quello che scrivi qui vale solo per questo cliente. '
      + 'Quello che lasci vuoto resta agganciato al listino generale.';

    const corpo = document.createElement('div');

    const selModo = document.createElement('select');
    for (const [v, t] of [['', 'Come da generali'], ['giornaliera', 'Giornaliera'], ['oraria', 'Oraria']]) {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      selModo.appendChild(o);
    }
    selModo.value = pref.modoTariffa ?? '';

    const selCat = document.createElement('select');
    const vuota = document.createElement('option');
    vuota.value = ''; vuota.textContent = 'Nessuna preferenza';
    selCat.appendChild(vuota);
    for (const cat of imp.categorie ?? []) {
      const o = document.createElement('option');
      o.value = cat.id; o.textContent = `${cat.icona ?? ''} ${cat.nome}`.trim();
      selCat.appendChild(o);
    }
    selCat.value = pref.categoriaId ?? '';

    const selMetodo = document.createElement('select');
    const niente = document.createElement('option');
    niente.value = ''; niente.textContent = 'Nessuno';
    selMetodo.appendChild(niente);
    for (const m of METODI) {
      const o = document.createElement('option');
      o.value = m.chiave; o.textContent = `${m.icona} ${m.nome}`;
      selMetodo.appendChild(o);
    }
    selMetodo.value = pref.metodoPagamento ?? '';

    const vuotoCon = (generale) => ({ vuoto: true, segnaposto: euro(generale) });
    const ceOraria = campoEuro(pref.tariffaOrariaCents, vuotoCon(imp.tariffaOrariaCents));
    const ceGiorn = campoEuro(pref.tariffaGiornalieraCents, vuotoCon(imp.tariffaGiornalieraCents));
    const ceFisso = campoEuro(pref.costoFissoCents, vuotoCon(imp.costoFissoCents));

    corpo.append(
      etichetta('Tipo di tariffa'), selModo,
      etichetta('Tipo di veicolo abituale'), selCat,
      etichetta('Tariffa oraria (per tutti i tipi)'), ceOraria.el,
      etichetta('Tariffa giornaliera (per tutti i tipi)'), ceGiorn.el,
      etichetta('Costo fisso di partenza'), ceFisso.el,
      etichetta('Pagamento abituale'), selMetodo,
    );

    // --- prezzi per singolo tipo di veicolo ---
    // Il caso vero: questo cliente porta auto e furgoni con accordi diversi.
    // Lasciando a zero vale il listino generale di quel tipo.
    const perCategoria = new Map();
    if ((imp.categorie ?? []).length) {
      corpo.appendChild(etichetta('Prezzi per tipo di veicolo'));
      for (const cat of imp.categorie) {
        const sua = pref.tariffePerCategoria?.[cat.id] ?? {};
        const card = document.createElement('div');
        card.className = 'card';

        const nome = document.createElement('div');
        nome.style.fontWeight = '700';
        nome.textContent = `${cat.icona ?? ''} ${cat.nome}`.trim();

        const generale = document.createElement('div');
        generale.className = 'tenue';
        generale.textContent = `Generale: ${euro(cat.costoFissoCents)} fisso · `
          + `${euro(cat.tariffaGiornalieraCents)}/giorno`;

        const ceF = campoEuro(sua.costoFissoCents, vuotoCon(cat.costoFissoCents));
        const ceO = campoEuro(sua.tariffaOrariaCents, vuotoCon(cat.tariffaOrariaCents));
        const ceG = campoEuro(sua.tariffaGiornalieraCents, vuotoCon(cat.tariffaGiornalieraCents));

        card.append(nome, generale,
          etichetta('Costo fisso per lui'), ceF.el,
          etichetta('Tariffa oraria per lui'), ceO.el,
          etichetta('Tariffa giornaliera per lui'), ceG.el);
        corpo.appendChild(card);
        perCategoria.set(cat.id, { ceF, ceO, ceG });
      }
      const nota = document.createElement('p');
      nota.className = 'tenue';
      nota.textContent = 'Lascia vuoto quello che non cambia: resta agganciato al listino generale. '
        + 'Scrivi 0 se questo cliente non paga.';
      corpo.appendChild(nota);
    }

    // maggiorazioni, ognuna col suo prezzo
    const attive = (imp.maggiorazioni ?? []).filter((m) => m.attiva && m.importoCents > 0);
    const spunte = new Map();
    if (attive.length) {
      corpo.appendChild(etichetta('Maggiorazioni sempre applicate'));
      for (const m of attive) {
        const sua = (pref.maggiorazioni ?? []).find((x) => x.chiave === m.id) ?? null;
        const riga = document.createElement('div');
        riga.className = 'card';

        const lab = document.createElement('label');
        lab.className = 'riga-interruttore';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = !!sua;
        const testo = document.createElement('span');
        testo.textContent = `${m.nome} — generale ${euro(m.importoCents)}`;
        lab.append(box, testo);

        const ce = campoEuro(sua?.importoCents, vuotoCon(m.importoCents));
        const dettagli = document.createElement('div');
        dettagli.appendChild(etichetta('Prezzo per lui (vuoto = come il generale)'));
        dettagli.appendChild(ce.el);

        const mostra = () => { dettagli.style.display = box.checked ? '' : 'none'; };
        box.addEventListener('change', mostra);
        mostra();

        riga.append(lab, dettagli);
        corpo.appendChild(riga);
        spunte.set(m.id, { box, ce });
      }
    }


    det.append(spiega, corpo);
    foglio.appendChild(det);

    // --- salva ---
    const salva = document.createElement('button');
    salva.className = 'btn verde';
    salva.textContent = '💾 Salva';
    salva.addEventListener('click', async () => {
      if (!inNome.value.trim()) return ctx.avvisa('Serve il nome', 'ko');
      salva.disabled = true;
      try {
        const dati = {
          id: cliente?.id,
          nome: inNome.value,
          telefono: inTelefono.value,
          email: inEmail.value,
          note: inNote.value,
          preferenze: {
            modoTariffa: selModo.value,
            categoriaId: selCat.value,
            tariffaOrariaCents: ceOraria.leggiCents() ?? null,
            tariffaGiornalieraCents: ceGiorn.leggiCents() ?? null,
            costoFissoCents: ceFisso.leggiCents() ?? null,
            metodoPagamento: selMetodo.value,
            tariffePerCategoria: Object.fromEntries([...perCategoria.entries()].map(
              ([id, { ceF, ceO, ceG }]) => [id, {
                costoFissoCents: ceF.leggiCents() ?? null,
                tariffaOrariaCents: ceO.leggiCents() ?? null,
                tariffaGiornalieraCents: ceG.leggiCents() ?? null,
              }],
            )),
            maggiorazioni: [...spunte.entries()]
              .filter(([, v]) => v.box.checked)
              .map(([chiave, { ce }]) => ({ chiave, importoCents: ce.leggiCents() ?? null, modo: null })),
          },
        };
        for (const chiave of CAMPI_ANAGRAFICA) dati[chiave] = campiExtra.get(chiave).value;

        const esito = await ctx.esegui('salvaCliente', dati);
        apertoId = esito?.cliente?.id ?? apertoId;
        chiudi();
        ctx.avvisa('Cliente salvato', 'ok');
      } catch (err) {
        salva.disabled = false;
        ctx.avvisaErrore(err);
      }
    });

    const annulla = document.createElement('button');
    annulla.className = 'btn chiaro';
    annulla.textContent = 'Annulla';
    annulla.addEventListener('click', chiudi);

    foglio.append(salva, annulla);
  });
}
