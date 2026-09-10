// Scheda "Cerca": una targa, un cliente o un numero di ricevuta, fra le auto
// dentro e quelle già uscite.
import { euro, dataOra } from '../shared/formato.js';
import { descriviDurata } from '../shared/pricing.js';
import { descriviMetodo } from '../shared/pagamenti.js';
import { contoAdesso } from './deposito.js';

function testoDi(r) {
  return [r.targa, r.proprietario, r.telefono, r.marca, r.modello, r.numeroRicevuta, r.numeroIngresso, r.posto]
    .filter(Boolean).join(' ').toLowerCase();
}

let testoCercato = '';

export function render(main, ctx) {
  const cerca = document.createElement('input');
  cerca.type = 'search';
  cerca.placeholder = '🔍 Targa, cliente o ricevuta';
  cerca.autocapitalize = 'characters';
  cerca.autocomplete = 'off';
  // sopravvive ai ridisegni del guscio (ogni 5 secondi) e ai cambi di scheda
  // arrivando dalla Home il testo è già stato scritto lì: si porta dietro
  if (ctx.parametri?.testo) testoCercato = ctx.parametri.testo;
  cerca.value = testoCercato;
  cerca.addEventListener('input', () => { testoCercato = cerca.value; });
  main.appendChild(cerca);

  const esiti = document.createElement('div');
  esiti.style.marginTop = '12px';
  main.appendChild(esiti);

  const disegna = () => {
    const q = cerca.value.trim().toLowerCase();
    esiti.innerHTML = '';
    if (q.length < 2) {
      const vuoto = document.createElement('div');
      vuoto.className = 'vuoto';
      const faccia = document.createElement('span');
      faccia.className = 'faccia';
      faccia.textContent = '🔍';
      const testo = document.createElement('div');
      testo.textContent = 'Scrivi almeno due lettere o numeri.';
      vuoto.append(faccia, testo);
      esiti.appendChild(vuoto);
      return;
    }

    const dentro = ctx.stato.autoInDeposito.filter((a) => testoDi(a).includes(q));
    const usciti = ctx.stato.storico.filter((r) => testoDi(r).includes(q))
      .sort((a, b) => b.uscitaISO.localeCompare(a.uscitaISO))
      .slice(0, 30);

    if (!dentro.length && !usciti.length) {
      const vuoto = document.createElement('div');
      vuoto.className = 'vuoto';
      const faccia = document.createElement('span');
      faccia.className = 'faccia';
      faccia.textContent = '🤷';
      const testo = document.createElement('div');
      testo.textContent = 'Nessun risultato.';
      vuoto.append(faccia, testo);
      esiti.appendChild(vuoto);
      return;
    }

    if (dentro.length) {
      esiti.appendChild(titolo('In deposito ora'));
      for (const a of dentro) {
        const conto = contoAdesso(a);
        esiti.appendChild(card(a.targa, [
          [a.proprietario, [a.marca, a.modello].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
          '⏱ ' + descriviDurata(Date.now() - Date.parse(a.ingressoISO)) + ' · entrata ' + dataOra(a.ingressoISO),
        ], euro(conto.totaleCents), 'verde'));
      }
    }

    if (usciti.length) {
      esiti.appendChild(titolo('Già uscite'));
      for (const r of usciti) {
        esiti.appendChild(card(r.targa, [
          [r.proprietario, r.numeroRicevuta ? 'ric. ' + r.numeroRicevuta : ''].filter(Boolean).join(' · '),
          'uscita ' + dataOra(r.uscitaISO) + ' · ' + descriviMetodo(r.metodoPagamento)
            + (r.incassato === false ? ' · da incassare' : ''),
        ], euro(r.totaleCents), r.incassato === false ? 'giallo' : 'tenue'));
      }
    }
  };

  cerca.addEventListener('input', disegna);
  disegna();
  cerca.focus();
}

function titolo(testo) {
  const l = document.createElement('label');
  l.textContent = testo;
  return l;
}

function card(targa, righe, importo, classe) {
  const c = document.createElement('div');
  c.className = 'card';
  const alto = document.createElement('div');
  alto.className = 'riga';
  const t = document.createElement('div');
  t.className = 'targa';
  t.style.fontSize = '22px';
  t.textContent = targa;
  const v = document.createElement('div');
  v.className = 'grosso ' + classe;
  v.textContent = importo;
  alto.append(t, v);
  c.appendChild(alto);
  for (const riga of righe.filter(Boolean)) {
    const p = document.createElement('div');
    p.className = 'tenue';
    p.textContent = riga;
    c.appendChild(p);
  }
  return c;
}
