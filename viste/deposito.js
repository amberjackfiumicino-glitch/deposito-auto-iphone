// Scheda "In deposito": le auto dentro, col costo che sale in tempo reale.
// Toccando una card si apre il foglio con l'uscita e l'incasso.
import { calcolaTotale, descriviDurata } from '../shared/pricing.js';
import { euro, dataOra, perInputDateTime, normalizzaTarga } from '../shared/formato.js';
import { METODI } from '../shared/pagamenti.js';
import { ordinaPerTarga } from '../shared/targhe.js';
import { documentoGiacenza } from '../shared/documenti.js';
import { apriDocumento } from '../componenti/documento.js';
import { funzioneAttiva } from '../shared/funzioni.js';
import { abbonamentoAttivo } from '../shared/abbonamenti.js';
import { campoEuro } from '../componenti/campoEuro.js';
import { conferma } from '../componenti/conferma.js';

let testoCercato = '';

/** Quanto deve, adesso, un'auto ancora dentro. */
export function contoAdesso(auto, adessoMs = Date.now()) {
  const ingressoMs = Date.parse(auto.ingressoISO);
  return calcolaTotale(auto, ingressoMs, Math.max(adessoMs, ingressoMs));
}

export function render(main, ctx) {
  const auto = ordinaPerTarga(ctx.stato.autoInDeposito);

  const cerca = document.createElement('input');
  cerca.type = 'search';
  cerca.placeholder = '🔍 Targa o cliente';
  cerca.autocapitalize = 'characters';
  // il guscio ridisegna ogni pochi secondi: senza questa memoria il testo
  // cercato spariva da solo appena si toglieva il dito dal campo
  cerca.value = testoCercato;
  cerca.addEventListener('input', () => { testoCercato = cerca.value; });
  main.appendChild(cerca);

  // lo stesso prospetto che si stampa dal PC: le auto dentro adesso, col
  // maturato a oggi
  const prospetto = document.createElement('button');
  prospetto.className = 'btn chiaro';
  prospetto.textContent = '📄 Prospetto e PDF';
  prospetto.addEventListener('click', () => {
    apriDocumento(documentoGiacenza(ctx.stato, ctx.stato.impostazioni), {
      nomeFile: 'auto-in-deposito', avvisa: ctx.avvisa,
    });
  });
  main.appendChild(prospetto);

  const elenco = document.createElement('div');
  elenco.style.marginTop = '12px';
  main.appendChild(elenco);

  const disegna = () => {
    const filtro = cerca.value.trim().toLowerCase();
    const visibili = filtro
      ? auto.filter((a) => (a.targa + ' ' + (a.proprietario ?? '') + ' ' + (a.marca ?? '') + ' ' + (a.modello ?? ''))
        .toLowerCase().includes(filtro))
      : auto;

    elenco.innerHTML = '';
    if (!visibili.length) {
      const vuoto = document.createElement('div');
      vuoto.className = 'vuoto';
      const faccia = document.createElement('span');
      faccia.className = 'faccia';
      faccia.textContent = auto.length ? '🔍' : '🅿️';
      const testo = document.createElement('div');
      testo.textContent = auto.length
        ? 'Nessuna auto con questo testo.'
        : 'Nessuna auto in deposito: registra la prima con ➕ Entrata.';
      vuoto.append(faccia, testo);
      elenco.appendChild(vuoto);
      return;
    }

    const riepilogo = document.createElement('p');
    riepilogo.className = 'tenue';
    riepilogo.textContent = `${visibili.length} ${visibili.length === 1 ? 'veicolo' : 'veicoli'} in deposito`;
    elenco.appendChild(riepilogo);

    for (const a of visibili) elenco.appendChild(cardAuto(a, ctx));
  };

  cerca.addEventListener('input', disegna);
  disegna();
}

function cardAuto(auto, ctx) {
  const adesso = Date.now();
  const conto = contoAdesso(auto, adesso);

  const card = document.createElement('div');
  card.className = 'card tocca';

  const alto = document.createElement('div');
  alto.className = 'riga';
  const targa = document.createElement('div');
  targa.className = 'targa';
  targa.textContent = auto.targa;
  const totale = document.createElement('div');
  totale.className = 'grosso verde';
  totale.textContent = euro(conto.totaleCents);
  alto.append(targa, totale);

  const mezzo = document.createElement('div');
  mezzo.className = 'riga';
  const chi = document.createElement('div');
  chi.className = 'tenue';
  chi.textContent = [auto.proprietario, [auto.marca, auto.modello].filter(Boolean).join(' ')]
    .filter(Boolean).join(' · ') || '—';
  const durata = document.createElement('div');
  durata.className = 'tenue';
  durata.textContent = '⏱ ' + descriviDurata(adesso - Date.parse(auto.ingressoISO));
  mezzo.append(chi, durata);

  card.append(alto, mezzo);

  // I due contrassegni che il PC mostra da sempre e qui mancavano: un abbonato
  // non va fatto pagare, e un'auto ferma da troppo va guardata.
  const pillole = [];
  if (funzioneAttiva(ctx.stato, 'abbonamenti')
    && abbonamentoAttivo(ctx.stato.abbonamenti, auto.targa, adesso)) {
    pillole.push(['⭐ Abbonato', 'verde']);
  }
  const giorni = Math.floor((adesso - Date.parse(auto.ingressoISO)) / 86_400_000);
  const soglia = ctx.stato.impostazioni?.giorniAvvisoGiacenza ?? 7;
  if (giorni >= soglia) pillole.push([`⏰ ferma da ${giorni} giorni`, 'giallo']);
  if (pillole.length) {
    const riga = document.createElement('div');
    riga.className = 'pillole';
    for (const [testo, tono] of pillole) {
      const p = document.createElement('span');
      p.className = 'pillola ' + tono;
      p.textContent = testo;
      riga.appendChild(p);
    }
    card.appendChild(riga);
  }

  const etichette = [];
  if (auto.posto) etichette.push('📍 ' + auto.posto);
  if (auto.statoVeicoloNome) etichette.push(auto.statoVeicoloNome);
  if (auto.categoriaNome) etichette.push(auto.categoriaNome);
  if (etichette.length) {
    const sotto = document.createElement('div');
    sotto.className = 'tenue';
    sotto.style.marginTop = '6px';
    sotto.textContent = etichette.join(' · ');
    card.appendChild(sotto);
  }

  card.addEventListener('click', () => apriDettaglio(auto, ctx));
  return card;
}

function apriDettaglio(auto, ctx) {
  ctx.apriFoglio((foglio, chiudi) => {
    const conto = contoAdesso(auto);

    const targa = document.createElement('div');
    targa.className = 'targa';
    targa.style.textAlign = 'center';
    targa.textContent = auto.targa;

    const chi = document.createElement('p');
    chi.className = 'tenue';
    chi.style.textAlign = 'center';
    chi.style.marginTop = '4px';
    chi.textContent = [auto.proprietario, [auto.marca, auto.modello].filter(Boolean).join(' ')]
      .filter(Boolean).join(' — ') || 'Cliente non indicato';

    foglio.append(targa, chi);

    const dettagli = document.createElement('div');
    dettagli.className = 'card';
    const voce = (etichetta, valore, classe = '') => {
      const r = document.createElement('div');
      r.className = 'riga';
      r.style.padding = '5px 0';
      const e = document.createElement('span');
      e.className = 'tenue';
      e.textContent = etichetta;
      const v = document.createElement('strong');
      v.className = classe;
      v.textContent = valore;
      r.append(e, v);
      return r;
    };
    dettagli.append(
      voce('Entrata', dataOra(auto.ingressoISO)),
      voce('Ferma da', descriviDurata(Date.now() - Date.parse(auto.ingressoISO))),
      voce(auto.modoTariffa === 'oraria' ? 'Ore fatturate' : 'Giorni fatturati', String(conto.unita)),
      voce('Tariffa', euro(conto.tariffaCents) + (auto.modoTariffa === 'oraria' ? ' / ora' : ' / giorno')),
      voce('Costo fisso', euro(conto.costoFissoCents)),
    );
    for (const m of conto.dettaglioMaggiorazioni) {
      dettagli.appendChild(voce(m.nome, euro(m.totaleCents)));
    }
    if (auto.posto) dettagli.appendChild(voce('Posto', auto.posto));
    if (auto.statoVeicoloNome) dettagli.appendChild(voce('Stato del mezzo', auto.statoVeicoloNome));
    if (auto.note) dettagli.appendChild(voce('Note', auto.note));

    const totale = document.createElement('div');
    totale.className = 'riga';
    totale.style.borderTop = '1px solid var(--bordo)';
    totale.style.marginTop = '8px';
    totale.style.paddingTop = '10px';
    const et = document.createElement('strong');
    et.textContent = 'DA PAGARE';
    const vt = document.createElement('span');
    vt.className = 'grosso verde';
    vt.textContent = euro(conto.totaleCents);
    totale.append(et, vt);
    dettagli.appendChild(totale);
    foglio.appendChild(dettagli);

    if (ctx.soloLettura) {
      const avviso = document.createElement('p');
      avviso.className = 'tenue';
      avviso.style.textAlign = 'center';
      avviso.textContent = 'Computer del deposito non raggiungibile: qui si può solo guardare.';
      foglio.appendChild(avviso);

      const chiudiSolo = document.createElement('button');
      chiudiSolo.className = 'btn chiaro';
      chiudiSolo.textContent = 'Chiudi';
      chiudiSolo.addEventListener('click', chiudi);
      foglio.appendChild(chiudiSolo);
      return;
    }

    const titolo = document.createElement('label');
    titolo.textContent = 'Chiudi la sosta e incassa con';
    foglio.appendChild(titolo);

    const scelte = document.createElement('div');
    scelte.className = 'scelte';
    for (const m of METODI) {
      const b = document.createElement('button');
      b.textContent = `${m.icona} ${m.nome}`;
      b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          const risposta = await ctx.esegui('chiudiAuto', auto.id, { metodoPagamento: m.chiave });
          chiudi();
          ctx.avvisa(`${auto.targa} uscita — ${euro(risposta.totaleCents)} ${m.nome.toLowerCase()}`, 'ok');
        } catch (err) {
          b.disabled = false;
          ctx.avvisaErrore(err);
        }
      });
      scelte.appendChild(b);
    }
    foglio.appendChild(scelte);

    // --- le cose che prima si potevano fare solo dal computer ---
    const altro = document.createElement('div');
    altro.className = 'scelte';
    altro.style.marginTop = '14px';

    const correggi = document.createElement('button');
    correggi.type = 'button';
    correggi.textContent = '✏️ Correggi';
    correggi.addEventListener('click', () => { chiudi(); modificaAuto(auto, ctx); });
    altro.appendChild(correggi);

    if (funzioneAttiva(ctx.stato, 'whatsapp') && auto.telefono) {
      const avvisa = document.createElement('button');
      avvisa.type = 'button';
      avvisa.textContent = '💬 Avvisa';
      avvisa.addEventListener('click', () => {
        // sul telefono WhatsApp si apre davvero: è il posto naturale per farlo
        const numero = String(auto.telefono).replace(/\D/g, '');
        const testo = `Buongiorno, la sua ${auto.targa} è pronta presso `
          + `${ctx.stato.impostazioni?.nomeAttivita || 'il deposito'}. Importo: ${euro(conto.totaleCents)}.`;
        globalThis.open(`https://wa.me/${numero.startsWith('39') ? numero : '39' + numero}`
          + `?text=${encodeURIComponent(testo)}`, '_blank');
      });
      altro.appendChild(avvisa);
    }

    if (funzioneAttiva(ctx.stato, 'ticket') && auto.numeroIngresso) {
      const ticket = document.createElement('button');
      ticket.type = 'button';
      ticket.textContent = '🎫 Ticket';
      ticket.addEventListener('click', () => {
        chiudi();
        apriDocumento(documentoTicket(auto, ctx.stato.impostazioni), {
          nomeFile: `ticket-${auto.numeroIngresso}`, avvisa: ctx.avvisa,
        });
      });
      altro.appendChild(ticket);
    }

    const annullaEntrata = document.createElement('button');
    annullaEntrata.type = 'button';
    annullaEntrata.textContent = '❌ Annulla entrata';
    annullaEntrata.addEventListener('click', async () => {
      const ok = await conferma(
        `Annullare l’entrata di ${auto.targa}? Sparisce dal deposito senza finire `
        + 'nello storico e senza emettere ricevuta. Si usa per una registrazione sbagliata.',
        { apriFoglio: ctx.apriFoglio, testoConferma: 'Annulla l’entrata', pericoloso: true },
      );
      if (!ok) return;
      try {
        await ctx.esegui('annullaEntrata', auto.id);
        chiudi();
        ctx.avvisa(`Entrata di ${auto.targa} annullata`, 'ok');
      } catch (err) { ctx.avvisaErrore(err); }
    });
    altro.appendChild(annullaEntrata);

    foglio.appendChild(altro);

    const annulla = document.createElement('button');
    annulla.className = 'btn chiaro';
    annulla.textContent = 'Chiudi';
    annulla.addEventListener('click', chiudi);
    foglio.appendChild(annulla);
  });
}

/**
 * Correggere un'auto già dentro: targa sbagliata, tariffa da aggiustare, posto
 * cambiato. Sul PC si è sempre potuto; dal telefono no, ed è proprio dal
 * piazzale che si sbaglia a digitare.
 */
function modificaAuto(auto, ctx) {
  const imp = ctx.stato.impostazioni;
  ctx.apriFoglio((foglio, chiudi) => {
    const h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 12px;font-size:19px;';
    h.textContent = `Correggi ${auto.targa}`;
    foglio.appendChild(h);

    const et = (t) => {
      const l = document.createElement('label');
      l.textContent = t;
      return l;
    };
    const campo = (valore, tipo = 'text') => {
      const i = document.createElement('input');
      i.type = tipo;
      i.value = valore ?? '';
      return i;
    };

    const inTarga = campo(auto.targa);
    inTarga.className = 'targa-input';
    inTarga.autocapitalize = 'characters';
    const inCliente = campo(auto.proprietario);
    const inTelefono = campo(auto.telefono, 'tel');
    const inMarca = campo(auto.marca);
    const inModello = campo(auto.modello);
    const inPosto = campo(auto.posto);
    inPosto.autocapitalize = 'characters';
    const inNote = document.createElement('textarea');
    inNote.rows = 2;
    inNote.value = auto.note ?? '';
    const inIngresso = campo(perInputDateTime(new Date(auto.ingressoISO)), 'datetime-local');

    // tipo di veicolo e conteggio: cambiarli qui NON ricalcola i prezzi da solo,
    // perché quelli fotografati all'ingresso sono ciò che fa fede (invariante 6)
    const selCat = document.createElement('select');
    for (const c of imp.categorie ?? []) {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${c.icona ?? ''} ${c.nome}`.trim();
      selCat.appendChild(o);
    }
    selCat.value = auto.categoriaId ?? '';

    const selModo = document.createElement('select');
    for (const [v, t] of [['giornaliera', 'A giornata'], ['oraria', 'A ore']]) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t;
      selModo.appendChild(o);
    }
    selModo.value = auto.modoTariffa;

    const selStato = document.createElement('select');
    const vuoto = document.createElement('option');
    vuoto.value = '';
    vuoto.textContent = 'Non indicato';
    selStato.appendChild(vuoto);
    for (const s of imp.statiVeicolo ?? []) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.nome;
      selStato.appendChild(o);
    }
    selStato.value = auto.statoVeicoloId ?? '';

    const ceFisso = campoEuro(auto.costoFissoCents);
    const ceTariffa = campoEuro(auto.tariffaCents);

    foglio.append(
      et('Targa'), inTarga,
      et('Cliente'), inCliente,
      et('Telefono'), inTelefono,
      et('Marca'), inMarca,
      et('Modello'), inModello,
      et('Tipo di veicolo'), selCat,
      et('Come si conta'), selModo,
      et('Costo fisso'), ceFisso.el,
      et('Tariffa'), ceTariffa.el,
      et('Stato del mezzo'), selStato,
      et('Posto'), inPosto,
      et('Data e ora di ingresso'), inIngresso,
      et('Note'), inNote,
    );

    const salva = document.createElement('button');
    salva.className = 'btn verde';
    salva.textContent = '💾 Salva le correzioni';
    salva.addEventListener('click', async () => {
      const targa = normalizzaTarga(inTarga.value);
      if (!targa) return ctx.avvisa('Serve la targa', 'ko');
      salva.disabled = true;
      try {
        await ctx.esegui('modificaAuto', auto.id, {
          targa,
          proprietario: inCliente.value.trim(),
          telefono: inTelefono.value.trim(),
          marca: inMarca.value.trim(),
          modello: inModello.value.trim(),
          note: inNote.value.trim(),
          posto: inPosto.value.trim(),
          ingressoISO: new Date(inIngresso.value).toISOString(),
          modoTariffa: selModo.value,
          costoFissoCents: ceFisso.leggiCents(),
          tariffaCents: ceTariffa.leggiCents(),
          categoriaId: selCat.value,
          statoVeicoloId: selStato.value,
        });
        chiudi();
        ctx.avvisa(`${targa} corretta`, 'ok');
      } catch (err) { salva.disabled = false; ctx.avvisaErrore(err); }
    });

    const lascia = document.createElement('button');
    lascia.className = 'btn chiaro';
    lascia.textContent = 'Lascia com’era';
    lascia.addEventListener('click', chiudi);

    foglio.append(salva, lascia);
  });
}

/** Il tagliando d'ingresso, da consegnare a chi lascia l'auto. */
function documentoTicket(auto, impostazioni = {}) {
  return {
    titolo: `TICKET ${auto.numeroIngresso ?? ''}`.trim(),
    sottotitolo: [impostazioni.nomeAttivita, impostazioni.indirizzo,
      impostazioni.telefono ? `Tel. ${impostazioni.telefono}` : '']
      .filter(Boolean).join(' — '),
    riepilogo: [
      ['Targa', auto.targa],
      ['Entrata', dataOra(auto.ingressoISO)],
      [auto.modoTariffa === 'oraria' ? 'Tariffa oraria' : 'Tariffa giornaliera', euro(auto.tariffaCents)],
      ['Costo fisso', euro(auto.costoFissoCents)],
    ],
    sezioni: [{
      titolo: 'Veicolo',
      colonne: ['Voce', 'Dato'],
      righe: [
        ['Cliente', auto.proprietario || '—'],
        ['Veicolo', [auto.categoriaNome, auto.marca, auto.modello].filter(Boolean).join(' ') || '—'],
        ['Stato del mezzo', auto.statoVeicoloNome || '—'],
        ['Posto', auto.posto || '—'],
        ['Note', auto.note || '—'],
      ],
    }],
    piede: impostazioni.piedeRicevuta ?? '',
  };
}
