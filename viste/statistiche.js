// Scheda "Statistiche" del telefono. Sola lettura, e i conti li fa lo stesso
// modulo puro del PC (`shared/statistiche.js`): due schermi diversi non possono
// mostrare numeri diversi.
import { euro } from '../shared/formato.js';
import { riepilogoStatistiche, incassiPerGiorno, incassiPerMese } from '../shared/statistiche.js';
import { descriviDurata } from '../shared/pricing.js';

export function render(main, ctx) {
  const r = riepilogoStatistiche(ctx.stato, Date.now());

  // --- i numeri che contano ---
  const box = document.createElement('div');
  box.className = 'card';
  for (const [et, val, classe] of [
    ['Incassato da sempre', euro(r.totaleCents), 'verde'],
    ['Incassi', String(r.numIncassi), ''],
    ['Scontrino medio', euro(r.scontrinoMedioCents), ''],
    ['Sosta media', r.durataMediaMs ? descriviDurata(r.durataMediaMs) : '—', ''],
  ]) {
    box.appendChild(riga(et, val, classe));
  }
  main.appendChild(box);

  // --- come pagano ---
  const quota = (parte) => (r.totaleCents ? Math.round((parte / r.totaleCents) * 100) : 0);
  main.appendChild(titolo('Come pagano'));
  const pagamenti = document.createElement('div');
  pagamenti.className = 'card';
  pagamenti.appendChild(riga('💵 Contanti', `${euro(r.contantiCents)} · ${quota(r.contantiCents)}%`, ''));
  pagamenti.appendChild(riga('💳 Resto (carta e bonifici)', `${euro(r.cartaCents)} · ${quota(r.cartaCents)}%`, ''));
  main.appendChild(pagamenti);

  // --- ultimi 30 giorni ---
  const giorni = incassiPerGiorno(ctx.stato, Date.now(), 30);
  main.appendChild(titolo('Ultimi 30 giorni'));
  main.appendChild(grafico(giorni.map((g) => g.totaleCents)));
  main.appendChild(nota(`Totale: ${euro(giorni.reduce((s, g) => s + g.totaleCents, 0))}`));

  // --- ultimi 12 mesi ---
  const mesi = incassiPerMese(ctx.stato, Date.now(), 12);
  main.appendChild(titolo('Ultimi 12 mesi'));
  main.appendChild(grafico(mesi.map((m) => m.totaleCents)));
  main.appendChild(nota(`Totale: ${euro(mesi.reduce((s, m) => s + m.totaleCents, 0))}`));

  // --- migliori clienti ---
  if (r.topClienti?.length) {
    main.appendChild(titolo('Migliori clienti'));
    const elenco = document.createElement('div');
    elenco.className = 'card';
    for (const c of r.topClienti) elenco.appendChild(riga(c.nome, euro(c.cents), 'verde'));
    main.appendChild(elenco);
  }
}

function riga(etichetta, valore, classe) {
  const r = document.createElement('div');
  r.className = 'riga';
  const e = document.createElement('span');
  e.className = 'tenue';
  e.textContent = etichetta;
  const v = document.createElement('strong');
  if (classe) v.className = classe;
  v.textContent = valore;
  r.append(e, v);
  return r;
}

function titolo(testo) {
  const h = document.createElement('h3');
  h.style.cssText = 'margin:20px 0 8px;font-size:17px;';
  h.textContent = testo;
  return h;
}

function nota(testo) {
  const p = document.createElement('p');
  p.className = 'tenue';
  p.style.margin = '0 0 6px';
  p.textContent = testo;
  return p;
}

/** Barre proporzionali: niente canvas, così scala con lo schermo. */
function grafico(valori) {
  const max = Math.max(1, ...valori);
  const barre = document.createElement('div');
  barre.className = 'barre';
  for (const v of valori) {
    const b = document.createElement('div');
    b.style.height = `${Math.round((v / max) * 100)}%`;
    b.title = euro(v);
    barre.appendChild(b);
  }
  return barre;
}
