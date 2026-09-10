// Scheda "Storico" del telefono: le soste concluse, con ricerca e periodo.
// Sul PC la stessa vista ha anche stampa, PDF ed Excel: qui no, servono il
// computer. Quello che si può fare da qui è consultare e correggere l'incasso.
import { euro, dataOra, soloData, dataLocale } from '../shared/formato.js';
import { descriviMetodo } from '../shared/pagamenti.js';
import { conferma } from '../componenti/conferma.js';
import { documentoStorico, documentoRicevuta } from '../shared/documenti.js';
import { apriDocumento } from '../componenti/documento.js';

let testo = '';
let dal = '';
let al = '';

export function render(main, ctx) {
  const filtri = document.createElement('div');
  filtri.className = 'card';

  const inTesto = document.createElement('input');
  inTesto.type = 'search';
  inTesto.placeholder = 'Targa, cliente, ricevuta…';
  inTesto.value = testo;

  const etDal = document.createElement('label');
  etDal.textContent = 'Dal';
  const inDal = document.createElement('input');
  inDal.type = 'date';
  inDal.value = dal;

  const etAl = document.createElement('label');
  etAl.textContent = 'Al';
  const inAl = document.createElement('input');
  inAl.type = 'date';
  inAl.value = al;

  const pulisci = document.createElement('button');
  pulisci.className = 'btn chiaro';
  pulisci.textContent = 'Pulisci filtri';

  // lo stesso report che esce dal PC: colonne, totali e ordine li decide
  // `shared/documenti.js`, che usano tutti e due
  const report = document.createElement('button');
  report.className = 'btn chiaro';
  report.textContent = '📄 Report e PDF';
  report.addEventListener('click', () => {
    const trovati = filtra();
    apriDocumento(documentoStorico(trovati, { testo, dal, al }), {
      nomeFile: 'storico-' + dataLocale(),
      avvisa: ctx.avvisa,
    });
  });

  filtri.append(inTesto, etDal, inDal, etAl, inAl, pulisci, report);
  main.appendChild(filtri);

  const totali = document.createElement('div');
  totali.className = 'card';
  main.appendChild(totali);

  const area = document.createElement('div');
  main.appendChild(area);

  function filtra() {
    const q = testo.trim().toLowerCase();
    const daMs = dal ? Date.parse(dal + 'T00:00:00') : -Infinity;
    const aMs = al ? Date.parse(al + 'T23:59:59') : Infinity;
    return (ctx.stato.storico ?? [])
      .filter((r) => {
        const t = Date.parse(r.uscitaISO);
        if (t < daMs || t > aMs) return false;
        if (!q) return true;
        return [r.targa, r.proprietario, r.marca, r.modello, r.numeroRicevuta, r.telefono]
          .filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => b.uscitaISO.localeCompare(a.uscitaISO));
  }

  function disegna() {
    testo = inTesto.value; dal = inDal.value; al = inAl.value;
    const trovati = filtra();

    // --- totali del periodo ---
    totali.innerHTML = '';
    let fatturato = 0;
    let attesa = 0;
    for (const r of trovati) {
      fatturato += r.totaleCents;
      if (r.incassato === false) attesa += r.totaleCents;
    }
    for (const [et, val, classe] of [
      [`${trovati.length} sost${trovati.length === 1 ? 'a' : 'e'}`, euro(fatturato), ''],
      ['⏳ Da incassare', euro(attesa), attesa ? 'giallo' : 'tenue'],
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
      totali.appendChild(riga);
    }

    // --- elenco ---
    area.innerHTML = '';
    if (trovati.length === 0) {
      const vuoto = document.createElement('div');
      vuoto.className = 'vuoto';
      const faccia = document.createElement('span');
      faccia.className = 'faccia';
      faccia.textContent = '📖';
      const p = document.createElement('p');
      p.textContent = 'Nessuna sosta con questi filtri.';
      vuoto.append(faccia, p);
      area.appendChild(vuoto);
      return;
    }

    for (const r of trovati.slice(0, 100)) {
      const card = document.createElement('div');
      card.className = 'card tocca';

      const alto = document.createElement('div');
      alto.className = 'riga';
      const t = document.createElement('span');
      t.className = 'targa';
      t.textContent = r.targa;
      const tot = document.createElement('strong');
      tot.className = 'verde';
      tot.textContent = euro(r.totaleCents);
      alto.append(t, tot);

      const mezzo = document.createElement('div');
      mezzo.className = 'riga';
      const chi = document.createElement('span');
      chi.className = 'tenue';
      chi.textContent = r.proprietario || [r.marca, r.modello].filter(Boolean).join(' ') || '—';
      const quando = document.createElement('span');
      quando.className = 'tenue';
      quando.textContent = soloData(r.uscitaISO);
      mezzo.append(chi, quando);

      const basso = document.createElement('div');
      basso.className = 'riga';
      const pag = document.createElement('span');
      pag.className = r.incassato === false ? 'giallo' : 'tenue';
      pag.textContent = descriviMetodo(r.metodoPagamento)
        + (r.incassato === false ? ' · da incassare' : '');
      const ric = document.createElement('span');
      ric.className = 'tenue';
      ric.textContent = r.numeroRicevuta ?? '';
      basso.append(pag, ric);

      card.append(alto, mezzo, basso);
      card.addEventListener('click', () => dettaglio(r, ctx));
      area.appendChild(card);
    }

    if (trovati.length > 100) {
      const nota = document.createElement('p');
      nota.className = 'tenue';
      nota.style.textAlign = 'center';
      nota.textContent = `…e altre ${trovati.length - 100}. Restringi con la ricerca o le date.`;
      area.appendChild(nota);
    }
  }

  inTesto.addEventListener('input', disegna);
  inDal.addEventListener('change', disegna);
  inAl.addEventListener('change', disegna);
  pulisci.addEventListener('click', () => {
    inTesto.value = ''; inDal.value = ''; inAl.value = '';
    disegna();
  });
  disegna();
}

function dettaglio(r, ctx) {
  ctx.apriFoglio((foglio, chiudi) => {
    const t = document.createElement('div');
    t.className = 'targa';
    t.style.textAlign = 'center';
    t.textContent = r.targa;
    foglio.appendChild(t);

    const righe = [
      ['Cliente', r.proprietario || '—'],
      ['Veicolo', [r.marca, r.modello].filter(Boolean).join(' ') || r.categoriaNome || '—'],
      ['Entrata', r.ingressoISO ? dataOra(r.ingressoISO) : '—'],
      ['Uscita', dataOra(r.uscitaISO)],
      ['Unità fatturate', String(r.unitaFatturate ?? '—')],
      ['Tariffa', euro(r.tariffaCents ?? 0)],
      ['Costo fisso', euro(r.costoFissoCents ?? 0)],
    ];
    for (const m of r.maggiorazioni ?? []) righe.push([m.nome, euro(m.importoCents)]);
    righe.push(['Ricevuta', r.numeroRicevuta ?? '—']);
    righe.push(['Pagamento', descriviMetodo(r.metodoPagamento)]);
    if (r.scadenzaISO) righe.push(['Scadenza', soloData(r.scadenzaISO)]);

    const dettagli = document.createElement('div');
    dettagli.className = 'card';
    for (const [et, val] of righe) {
      const riga = document.createElement('div');
      riga.className = 'riga';
      const e = document.createElement('span');
      e.className = 'tenue';
      e.textContent = et;
      const v = document.createElement('span');
      v.textContent = val;
      riga.append(e, v);
      dettagli.appendChild(riga);
    }

    const totale = document.createElement('div');
    totale.className = 'riga';
    totale.style.cssText = 'border-top:1px solid var(--bordo);margin-top:8px;padding-top:10px;';
    const et = document.createElement('strong');
    et.textContent = 'TOTALE';
    const v = document.createElement('span');
    v.className = 'grosso verde';
    v.textContent = euro(r.totaleCents);
    totale.append(et, v);
    dettagli.appendChild(totale);
    foglio.appendChild(dettagli);

    // segnare (o togliere) l'incasso di un bonifico
    if (!ctx.soloLettura) {
      const b = document.createElement('button');
      b.className = 'btn ' + (r.incassato === false ? 'verde' : 'chiaro');
      b.textContent = r.incassato === false ? '✅ Segna incassato' : '↩️ Non è ancora incassato';
      b.addEventListener('click', async () => {
        const incassare = r.incassato === false;
        if (!incassare) {
          const ok = await conferma('Rimettere questo movimento fra quelli da incassare?',
            { apriFoglio: ctx.apriFoglio, testoConferma: 'Sì, non è incassato' });
          if (!ok) return;
        }
        b.disabled = true;
        try {
          await ctx.esegui('segnaIncassato', r.id, incassare);
          chiudi();
          ctx.avvisa(incassare ? 'Segnato incassato' : 'Rimesso in attesa', 'ok');
        } catch (err) { b.disabled = false; ctx.avvisaErrore(err); }
      });
      foglio.appendChild(b);
    }

    // la ricevuta si ristampa anche da qui: apre il pannello di Android, dove
    // c'è «Salva come PDF» (prima diceva che serviva il computer)
    const ricevuta = document.createElement('button');
    ricevuta.className = 'btn chiaro';
    ricevuta.textContent = '📄 Ricevuta e PDF';
    ricevuta.addEventListener('click', () => {
      chiudi();
      apriDocumento(documentoRicevuta(r, ctx.stato.impostazioni), {
        nomeFile: 'ricevuta-' + (r.numeroRicevuta || r.targa),
        avvisa: ctx.avvisa,
      });
    });
    foglio.appendChild(ricevuta);

    const ok = document.createElement('button');
    ok.className = 'btn chiaro';
    ok.textContent = 'Chiudi';
    ok.addEventListener('click', chiudi);
    foglio.appendChild(ok);
  });
}

/** Serve al guscio: aprire lo storico su un periodo preciso. */
export function apriSuOggi() {
  dal = dataLocale();
  al = dataLocale();
}
