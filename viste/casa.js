// La schermata di apertura: la giornata a colpo d'occhio.
//
// Prima l'app si apriva sull'elenco delle auto dentro, che è il "cosa c'è"
// ma non il "come va". Qui invece si risponde alle tre domande che uno si fa
// entrando in ufficio — quante ne ho, quanto ho incassato, cosa devo guardare —
// e da lì si parte con un tocco.
//
// Tutti i numeri vengono dai moduli condivisi, gli stessi del PC: nessun conto
// rifatto a mano qui dentro.
import { euro, soloData } from '../shared/formato.js';
import { numeriGiornata, avvisiGiornata, descriviAvviso, ICONE_AVVISO } from '../shared/riepilogo.js';

const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function saluto(ora) {
  if (ora < 5) return 'Buonanotte';
  if (ora < 13) return 'Buongiorno';
  if (ora < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export function render(main, ctx) {
  const adesso = Date.now();
  const oggi = new Date(adesso);
  const stato = ctx.stato;
  const n = numeriGiornata(stato, adesso);

  // --- saluto e data ---
  const testa = document.createElement('div');
  testa.className = 'casa-testa';
  const ciao = document.createElement('h2');
  ciao.textContent = saluto(oggi.getHours());
  const quando = document.createElement('p');
  quando.className = 'tenue';
  quando.textContent = `${oggi.getDate()} ${NOMI_MESI[oggi.getMonth()]} ${oggi.getFullYear()}`;
  testa.append(ciao, quando);
  main.appendChild(testa);

  // --- i tre numeri della giornata ---
  const numeri = document.createElement('div');
  numeri.className = 'casa-numeri';
  const voci = [
    ['🅿️', String(n.dentro), n.dentro === 1 ? 'veicolo dentro' : 'veicoli dentro', 'deposito', ''],
    ['💶', euro(n.incassatoOggiCents), 'incassato oggi', 'cassa', 'verde'],
  ];
  // il terzo riquadro cambia mestiere: se ci sono soldi da riscuotere quelli
  // vengono prima, altrimenti si mostra quanto sta maturando il piazzale
  if (n.daIncassareCents > 0) {
    voci.push(['⏳', euro(n.daIncassareCents), 'da incassare', 'cassa', 'giallo']);
  } else if (n.maturatoCents > 0) {
    voci.push(['📈', euro(n.maturatoCents), 'maturato in piazzale', 'deposito', '']);
  }
  for (const [ico, valore, etichetta, dove, tono] of voci) {
    const box = document.createElement('button');
    box.type = 'button';
    box.className = 'casa-numero';
    const i = document.createElement('span');
    i.className = 'ico';
    i.textContent = ico;
    // tre riquadri su 375 px sono stretti: un importo lungo va scritto più
    // piccolo, o il simbolo dell'euro finisce fuori dal bordo
    if (valore.length <= 3) box.classList.add('stretto');
    const v = document.createElement('span');
    v.className = 'valore ' + tono;
    if (valore.length >= 10) v.classList.add('minuto');
    else if (valore.length >= 8) v.classList.add('lungo');
    v.textContent = valore;
    const e = document.createElement('span');
    e.className = 'etichetta';
    e.textContent = etichetta;
    box.append(i, v, e);
    box.addEventListener('click', () => ctx.vai(dove));
    numeri.appendChild(box);
  }
  main.appendChild(numeri);

  // --- cerca: da qui si parte per trovare una targa ---
  const cerca = document.createElement('input');
  cerca.type = 'search';
  cerca.placeholder = '🔍 Cerca una targa o un cliente…';
  cerca.autocapitalize = 'characters';
  cerca.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && cerca.value.trim()) ctx.vai('cerca', { testo: cerca.value.trim() });
  });
  main.appendChild(cerca);

  // --- le due cose che si fanno cento volte al giorno ---
  const azioni = document.createElement('div');
  azioni.className = 'casa-azioni';
  for (const [ico, nome, dove, classe] of [
    ['➕', 'Registra un’entrata', 'entrata', 'verde'],
    ['🧾', 'Chiusura di cassa', 'cassa', ''],
  ]) {
    const b = document.createElement('button');
    b.className = 'btn ' + classe;
    b.textContent = `${ico}  ${nome}`;
    b.addEventListener('click', () => ctx.vai(dove));
    azioni.appendChild(b);
  }
  main.appendChild(azioni);

  // --- da guardare: solo se c'è davvero qualcosa ---
  const avvisi = avvisiGiornata(stato, adesso);
  if (avvisi.length) {
    const et = document.createElement('label');
    et.textContent = 'Da guardare';
    main.appendChild(et);
    for (const a of avvisi) {
      const card = document.createElement('div');
      card.className = 'card tocca casa-avviso ' + a.tono;
      const riga = document.createElement('div');
      riga.className = 'riga';
      const testo = document.createElement('span');
      testo.textContent = `${ICONE_AVVISO[a.chiave] ?? ''} ${descriviAvviso(a, euro)}`;
      const freccia = document.createElement('span');
      freccia.className = 'tenue';
      freccia.textContent = '›';
      riga.append(testo, freccia);
      card.appendChild(riga);
      card.addEventListener('click', () => ctx.vai(a.dove, a.parametri ?? null));
      main.appendChild(card);
    }
  }

  // --- le ultime uscite, per sapere dove si era rimasti ---
  const ultime = [...(stato.storico ?? [])]
    .sort((a, b) => b.uscitaISO.localeCompare(a.uscitaISO))
    .slice(0, 3);
  if (ultime.length) {
    const et = document.createElement('label');
    et.textContent = 'Ultime uscite';
    main.appendChild(et);
    const elenco = document.createElement('div');
    elenco.className = 'card';
    for (const r of ultime) {
      const riga = document.createElement('div');
      riga.className = 'riga';
      riga.style.padding = '6px 0';
      const sx = document.createElement('span');
      sx.textContent = r.targa;
      sx.style.fontWeight = '700';
      const dx = document.createElement('span');
      dx.className = 'tenue';
      dx.textContent = `${soloData(r.uscitaISO)} · ${euro(r.totaleCents)}`;
      riga.append(sx, dx);
      elenco.appendChild(riga);
    }
    const tutto = document.createElement('button');
    tutto.className = 'btn chiaro casa-storico';
    tutto.textContent = 'Vedi tutto lo storico';
    tutto.addEventListener('click', () => ctx.vai('storico'));
    main.append(elenco, tutto);
  }
}
