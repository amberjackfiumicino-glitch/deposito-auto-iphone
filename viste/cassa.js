// Scheda "Cassa": quanto è entrato oggi e quanto c'è ancora da incassare.
// Un veicolo fa cassa solo quando esce: i conti vengono dallo storico.
import { reportGiorno, reportMese, daIncassare } from '../shared/cassa.js';
import { documentoCassa } from '../shared/documenti.js';
import { apriDocumento } from '../componenti/documento.js';
import { euro, dataOra, soloData } from '../shared/formato.js';

export function render(main, ctx) {
  const adesso = Date.now();
  const oggi = reportGiorno(ctx.stato, adesso);
  const attesa = daIncassare(ctx.stato, adesso);

  const data = document.createElement('p');
  data.className = 'tenue';
  data.style.marginTop = '0';
  data.textContent = new Date(adesso).toLocaleDateString('it-IT',
    { weekday: 'long', day: 'numeric', month: 'long' });
  main.appendChild(data);

  // --- incasso del giorno ---
  const totale = document.createElement('div');
  totale.className = 'card';
  totale.style.textAlign = 'center';
  const et = document.createElement('div');
  et.className = 'tenue';
  et.textContent = 'Totale di oggi';
  const vt = document.createElement('div');
  vt.className = 'grosso verde';
  vt.style.fontSize = '38px';
  vt.textContent = euro(oggi.totaleCents);
  totale.append(et, vt);
  if (oggi.daIncassareCents > 0) {
    // il bonifico conta nel giorno dell'uscita, ma in cassa non c'è ancora
    const spacca = document.createElement('div');
    spacca.className = 'tenue';
    spacca.textContent = `${euro(oggi.incassatoCents)} in cassa · ${euro(oggi.daIncassareCents)} da incassare`;
    totale.appendChild(spacca);
  }
  main.appendChild(totale);

  // --- gli stessi report che si stampano dal PC ---
  const stampe = document.createElement('div');
  stampe.className = 'scelte';
  stampe.style.marginTop = '12px';
  for (const [etichetta, costruisci, nome] of [
    ['📄 Chiusura di oggi', () => reportGiorno(ctx.stato, adesso), 'cassa-oggi'],
    ['📄 Incassi del mese', () => reportMese(ctx.stato, adesso), 'incassi-mese'],
  ]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = etichetta;
    b.addEventListener('click', () => {
      apriDocumento(documentoCassa(costruisci(), ctx.stato.impostazioni), {
        nomeFile: nome, avvisa: ctx.avvisa,
      });
    });
    stampe.appendChild(b);
  }
  main.appendChild(stampe);

  // --- per metodo ---
  const metodi = document.createElement('div');
  metodi.className = 'card';
  for (const slot of Object.values(oggi.perMetodo)) {
    const r = document.createElement('div');
    r.className = 'riga';
    r.style.padding = '6px 0';
    const e = document.createElement('span');
    e.textContent = `${slot.icona} ${slot.nome}`;
    const v = document.createElement('strong');
    v.textContent = `${euro(slot.totaleCents)}${slot.numero ? ` (${slot.numero})` : ''}`;
    r.append(e, v);
    metodi.appendChild(r);
  }
  main.appendChild(metodi);

  // --- movimenti del giorno ---
  const movimenti = document.createElement('div');
  movimenti.className = 'card';
  const rMov = document.createElement('div');
  rMov.className = 'riga';
  const eEntrate = document.createElement('div');
  eEntrate.innerHTML = '';
  eEntrate.append(
    Object.assign(document.createElement('div'), { className: 'grosso', textContent: String(oggi.numEntrate) }),
    Object.assign(document.createElement('div'), { className: 'tenue', textContent: 'entrate' }),
  );
  const eUscite = document.createElement('div');
  eUscite.style.textAlign = 'right';
  eUscite.append(
    Object.assign(document.createElement('div'), { className: 'grosso', textContent: String(oggi.numUscite) }),
    Object.assign(document.createElement('div'), { className: 'tenue', textContent: 'uscite' }),
  );
  const eDentro = document.createElement('div');
  eDentro.style.textAlign = 'center';
  eDentro.append(
    Object.assign(document.createElement('div'), { className: 'grosso', textContent: String(ctx.stato.autoInDeposito.length) }),
    Object.assign(document.createElement('div'), { className: 'tenue', textContent: 'dentro ora' }),
  );
  rMov.append(eEntrate, eDentro, eUscite);
  movimenti.appendChild(rMov);
  main.appendChild(movimenti);

  // --- uscite di oggi, una per riga ---
  if (oggi.uscite.length) {
    const titolo = document.createElement('label');
    titolo.textContent = 'Uscite di oggi';
    main.appendChild(titolo);
    for (const r of oggi.uscite) {
      const card = document.createElement('div');
      card.className = 'card';
      const alto = document.createElement('div');
      alto.className = 'riga';
      const targa = document.createElement('strong');
      targa.textContent = r.targa ?? r.descrizione ?? '—';
      const importo = document.createElement('span');
      importo.className = r.incassato === false ? 'giallo' : 'verde';
      importo.style.fontWeight = '800';
      importo.textContent = euro(r.totaleCents);
      alto.append(targa, importo);
      const basso = document.createElement('div');
      basso.className = 'tenue';
      basso.textContent = [
        r.uscitaISO ? dataOra(r.uscitaISO).split(' ').pop() : '',
        oggi.perMetodo[r.metodoPagamento]?.nome ?? r.metodoPagamento,
        r.incassato === false ? 'da incassare' : '',
      ].filter(Boolean).join(' · ');
      card.append(alto, basso);
      main.appendChild(card);
    }
  }

  // --- bonifici in attesa ---
  if (attesa.movimenti.length) {
    const titolo = document.createElement('label');
    titolo.textContent = `Da incassare — ${euro(attesa.totaleCents)}`;
    main.appendChild(titolo);

    for (const r of attesa.movimenti) {
      const scaduto = r.scadenzaISO && Date.parse(r.scadenzaISO) < adesso;
      const card = document.createElement('div');
      card.className = 'card';
      const alto = document.createElement('div');
      alto.className = 'riga';
      const chi = document.createElement('div');
      const targa = document.createElement('strong');
      targa.textContent = r.targa;
      const nome = document.createElement('div');
      nome.className = 'tenue';
      nome.textContent = r.proprietario || '—';
      chi.append(targa, nome);
      const soldi = document.createElement('div');
      soldi.style.textAlign = 'right';
      const importo = document.createElement('div');
      importo.className = 'grosso ' + (scaduto ? 'rosso' : 'giallo');
      importo.textContent = euro(r.totaleCents);
      const quando = document.createElement('div');
      quando.className = 'tenue';
      quando.textContent = r.scadenzaISO ? (scaduto ? 'scaduto il ' : 'entro il ') + soloData(r.scadenzaISO) : '';
      soldi.append(importo, quando);
      alto.append(chi, soldi);
      card.appendChild(alto);

      const btn = document.createElement('button');
      btn.className = 'btn verde';
      btn.textContent = '✅ Segna incassato';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await ctx.esegui('segnaIncassato', r.id);
          ctx.avvisa(`${r.targa}: incasso registrato`, 'ok');
        } catch (err) {
          btn.disabled = false;
          ctx.avvisaErrore(err);
        }
      });
      card.appendChild(btn);
      main.appendChild(card);
    }
  }
}
