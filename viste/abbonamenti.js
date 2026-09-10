// Scheda "Abbonamenti" del telefono: attivare, rinnovare, vedere le scadenze,
// e ristampare la ricevuta dell'ultimo incasso, come sul computer.
import { euro, soloData, normalizzaTarga } from '../shared/formato.js';
import { statoAbbonamento, ricevutaAbbonamento } from '../shared/abbonamenti.js';
import { documentoRicevuta } from '../shared/documenti.js';
import { METODI } from '../shared/pagamenti.js';
import { campoEuro } from '../componenti/campoEuro.js';
import { conferma } from '../componenti/conferma.js';
import { apriDocumento } from '../componenti/documento.js';

export function render(main, ctx) {
  const abbonamenti = [...(ctx.stato.abbonamenti ?? [])]
    .sort((a, b) => (a.fineISO ?? '').localeCompare(b.fineISO ?? ''));

  if (!ctx.soloLettura) {
    const nuovo = document.createElement('button');
    nuovo.className = 'btn verde';
    nuovo.textContent = '⭐ Nuovo abbonamento';
    nuovo.addEventListener('click', () => formNuovo(ctx));
    main.appendChild(nuovo);
  }

  if (abbonamenti.length === 0) {
    const vuoto = document.createElement('div');
    vuoto.className = 'vuoto';
    const faccia = document.createElement('span');
    faccia.className = 'faccia';
    faccia.textContent = '⭐';
    const p = document.createElement('p');
    p.textContent = 'Nessun abbonamento attivo.';
    vuoto.append(faccia, p);
    main.appendChild(vuoto);
    return;
  }

  const adesso = Date.now();
  for (const a of abbonamenti) {
    const card = document.createElement('div');
    card.className = 'card tocca';

    const alto = document.createElement('div');
    alto.className = 'riga';
    const targa = document.createElement('span');
    targa.className = 'targa';
    targa.textContent = a.targa;
    const importo = document.createElement('strong');
    importo.textContent = `${euro(a.importoCents)}/mese`;
    alto.append(targa, importo);

    const chi = document.createElement('div');
    chi.className = 'tenue';
    chi.textContent = a.proprietario || '—';

    const stato = document.createElement('div');
    stato.className = 'pillole';
    const p = document.createElement('span');
    const come = statoAbbonamento(a, adesso);
    if (come === 'scaduto') {
      p.className = 'pillola giallo';
      p.textContent = `scaduto il ${soloData(a.fineISO)}`;
    } else if (come === 'in_scadenza') {
      p.className = 'pillola giallo';
      p.textContent = `in scadenza: ${soloData(a.fineISO)}`;
    } else {
      p.className = 'pillola verde';
      p.textContent = `attivo fino al ${soloData(a.fineISO)}`;
    }
    stato.appendChild(p);

    card.append(alto, chi, stato);
    card.addEventListener('click', () => dettaglio(a, ctx));
    main.appendChild(card);
  }
}

function dettaglio(a, ctx) {
  ctx.apriFoglio((foglio, chiudi) => {
    const t = document.createElement('div');
    t.className = 'targa';
    t.style.textAlign = 'center';
    t.textContent = a.targa;
    foglio.appendChild(t);

    const dettagli = document.createElement('div');
    dettagli.className = 'card';
    for (const [et, val] of [
      ['Cliente', a.proprietario || '—'],
      ['Telefono', a.telefono || '—'],
      ['Importo mensile', euro(a.importoCents)],
      ['Inizio', soloData(a.inizioISO)],
      ['Scadenza', soloData(a.fineISO)],
      ['Pagamenti', String((a.pagamenti ?? []).length)],
    ]) {
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
    foglio.appendChild(dettagli);

    // la ricevuta dell'ultimo incasso: si guarda e si stampa anche senza il PC
    // (Android apre il suo pannello, dove c'è «Salva come PDF»)
    const pagamenti = a.pagamenti ?? [];
    if (pagamenti.length) {
      const ultimo = pagamenti[pagamenti.length - 1];
      const ricevuta = document.createElement('button');
      ricevuta.className = 'btn chiaro';
      ricevuta.textContent = '📄 Ricevuta ultimo pagamento';
      ricevuta.addEventListener('click', () => {
        chiudi();
        apriDocumento(
          documentoRicevuta(ricevutaAbbonamento(a, ultimo), ctx.stato.impostazioni),
          { nomeFile: 'ricevuta-' + (ultimo.numeroRicevuta || a.targa), avvisa: ctx.avvisa },
        );
      });
      foglio.appendChild(ricevuta);
    }

    if (ctx.soloLettura) {
      const avviso = document.createElement('p');
      avviso.className = 'tenue';
      avviso.style.textAlign = 'center';
      avviso.textContent = 'Senza connessione qui si può solo guardare.';
      foglio.appendChild(avviso);
      return;
    }

    const et = document.createElement('label');
    et.textContent = 'Rinnova di un mese e incassa con';
    foglio.appendChild(et);

    const scelte = document.createElement('div');
    scelte.className = 'scelte';
    for (const m of METODI.filter((x) => x.chiave !== 'bonifico60')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${m.icona} ${m.nome}`;
      b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          await ctx.esegui('rinnovaAbbonamento', a.id, m.chiave);
          chiudi();
          ctx.avvisa(`${a.targa} rinnovato`, 'ok');
        } catch (err) { b.disabled = false; ctx.avvisaErrore(err); }
      });
      scelte.appendChild(b);
    }
    foglio.appendChild(scelte);

    const elimina = document.createElement('button');
    elimina.className = 'btn chiaro';
    elimina.textContent = '🗑 Elimina abbonamento';
    elimina.addEventListener('click', async () => {
      const ok = await conferma(
        `Eliminare l'abbonamento di ${a.targa}? Spariranno anche i pagamenti già registrati, quindi dalla cassa.`,
        { apriFoglio: ctx.apriFoglio, testoConferma: 'Elimina', pericoloso: true },
      );
      if (!ok) return;
      try {
        await ctx.esegui('eliminaAbbonamento', a.id);
        chiudi();
        ctx.avvisa('Abbonamento eliminato', 'ok');
      } catch (err) { ctx.avvisaErrore(err); }
    });
    foglio.appendChild(elimina);
  });
}

function formNuovo(ctx) {
  ctx.apriFoglio((foglio, chiudi) => {
    const h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 12px;font-size:20px;';
    h.textContent = 'Nuovo abbonamento';
    foglio.appendChild(h);

    const etichetta = (t) => {
      const l = document.createElement('label');
      l.textContent = t;
      return l;
    };

    const inTarga = document.createElement('input');
    inTarga.className = 'targa-input';
    inTarga.placeholder = 'AB123CD';
    inTarga.autocapitalize = 'characters';

    const ce = campoEuro(0);
    const inProprietario = document.createElement('input');
    inProprietario.placeholder = 'Nome del cliente';
    const inTelefono = document.createElement('input');
    inTelefono.type = 'tel';
    inTelefono.placeholder = 'Telefono (facoltativo)';

    foglio.append(
      etichetta('Targa'), inTarga,
      etichetta('Importo mensile'), ce.el,
      etichetta('Cliente'), inProprietario,
      etichetta('Telefono'), inTelefono,
    );

    const et = document.createElement('label');
    et.textContent = 'Attiva e incassa con';
    foglio.appendChild(et);

    const scelte = document.createElement('div');
    scelte.className = 'scelte';
    for (const m of METODI.filter((x) => x.chiave !== 'bonifico60')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${m.icona} ${m.nome}`;
      b.addEventListener('click', async () => {
        const targa = normalizzaTarga(inTarga.value);
        if (!targa) return ctx.avvisa('Serve la targa', 'ko');
        if (ce.leggiCents() <= 0) return ctx.avvisa('Indica l\'importo mensile', 'ko');
        b.disabled = true;
        try {
          await ctx.esegui('nuovoAbbonamento', {
            targa,
            importoCents: ce.leggiCents(),
            proprietario: inProprietario.value.trim(),
            telefono: inTelefono.value.trim(),
          }, m.chiave);
          chiudi();
          ctx.avvisa(`${targa} abbonata`, 'ok');
        } catch (err) { b.disabled = false; ctx.avvisaErrore(err); }
      });
      scelte.appendChild(b);
    }
    foglio.appendChild(scelte);

    const annulla = document.createElement('button');
    annulla.className = 'btn chiaro';
    annulla.textContent = 'Annulla';
    annulla.addEventListener('click', chiudi);
    foglio.appendChild(annulla);
  });
}
