// Scheda "Calendario" del telefono: entrate e uscite giorno per giorno.
// Sola consultazione, come sul PC.
import { euro, dataOra } from '../shared/formato.js';

const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

let anno = new Date().getFullYear();
let mese = new Date().getMonth();

export function render(main, ctx) {
  // --- barra del mese ---
  const barra = document.createElement('div');
  barra.className = 'riga';
  barra.style.marginBottom = '12px';

  const indietro = document.createElement('button');
  indietro.className = 'btn chiaro';
  indietro.style.width = 'auto';
  indietro.textContent = '◀';
  indietro.addEventListener('click', () => {
    mese -= 1;
    if (mese < 0) { mese = 11; anno -= 1; }
    ctx.vai('calendario');
  });

  const titolo = document.createElement('strong');
  titolo.style.fontSize = '18px';
  titolo.textContent = `${NOMI_MESI[mese]} ${anno}`;

  const avanti = document.createElement('button');
  avanti.className = 'btn chiaro';
  avanti.style.width = 'auto';
  avanti.textContent = '▶';
  avanti.addEventListener('click', () => {
    mese += 1;
    if (mese > 11) { mese = 0; anno += 1; }
    ctx.vai('calendario');
  });

  barra.append(indietro, titolo, avanti);
  main.appendChild(barra);

  const oggiBtn = document.createElement('button');
  oggiBtn.className = 'btn chiaro';
  oggiBtn.textContent = 'Oggi';
  oggiBtn.addEventListener('click', () => {
    anno = new Date().getFullYear();
    mese = new Date().getMonth();
    ctx.vai('calendario');
  });
  main.appendChild(oggiBtn);

  // --- conteggi del mese ---
  const perGiorno = new Map();
  const conta = (iso, campo) => {
    const d = new Date(iso);
    if (d.getFullYear() !== anno || d.getMonth() !== mese) return;
    const g = d.getDate();
    if (!perGiorno.has(g)) perGiorno.set(g, { entrate: 0, uscite: 0, incassoCents: 0 });
    perGiorno.get(g)[campo] += 1;
  };
  for (const a of [...(ctx.stato.autoInDeposito ?? []), ...(ctx.stato.storico ?? [])]) {
    if (a.ingressoISO) conta(a.ingressoISO, 'entrate');
  }
  for (const r of ctx.stato.storico ?? []) {
    if (!r.uscitaISO) continue;
    conta(r.uscitaISO, 'uscite');
    const d = new Date(r.uscitaISO);
    if (d.getFullYear() === anno && d.getMonth() === mese) {
      perGiorno.get(d.getDate()).incassoCents += r.totaleCents;
    }
  }

  // --- griglia ---
  const griglia = document.createElement('div');
  griglia.className = 'calendario';

  for (const g of GIORNI) {
    const t = document.createElement('div');
    t.className = 'calendario-testa';
    t.textContent = g;
    griglia.appendChild(t);
  }

  const primo = new Date(anno, mese, 1);
  const scarto = (primo.getDay() + 6) % 7;      // lunedì = 0
  const quanti = new Date(anno, mese + 1, 0).getDate();
  const oggi = new Date();

  for (let i = 0; i < scarto; i++) griglia.appendChild(document.createElement('div'));

  for (let g = 1; g <= quanti; g++) {
    const dati = perGiorno.get(g);
    const cella = document.createElement('button');
    cella.className = 'calendario-giorno';
    if (oggi.getFullYear() === anno && oggi.getMonth() === mese && oggi.getDate() === g) {
      cella.classList.add('oggi');
    }
    const numero = document.createElement('span');
    numero.className = 'numero';
    numero.textContent = String(g);
    cella.appendChild(numero);
    if (dati) {
      const punti = document.createElement('span');
      punti.className = 'punti';
      punti.textContent = `${dati.entrate ? '▲' + dati.entrate : ''} ${dati.uscite ? '▼' + dati.uscite : ''}`.trim();
      cella.appendChild(punti);
      cella.addEventListener('click', () => apriGiorno(g, ctx));
    } else {
      cella.disabled = true;
    }
    griglia.appendChild(cella);
  }

  main.appendChild(griglia);
}

function apriGiorno(giorno, ctx) {
  const inizio = new Date(anno, mese, giorno).getTime();
  const fine = inizio + 86_400_000;
  const dentro = (iso) => {
    const t = Date.parse(iso);
    return t >= inizio && t < fine;
  };

  const entrate = [...(ctx.stato.autoInDeposito ?? []), ...(ctx.stato.storico ?? [])]
    .filter((a) => a.ingressoISO && dentro(a.ingressoISO));
  const uscite = (ctx.stato.storico ?? []).filter((r) => r.uscitaISO && dentro(r.uscitaISO));
  const incasso = uscite.reduce((s, r) => s + r.totaleCents, 0);

  ctx.apriFoglio((foglio) => {
    const h = document.createElement('h2');
    h.style.cssText = 'margin:0 0 4px;font-size:20px;';
    h.textContent = `${giorno} ${NOMI_MESI[mese]} ${anno}`;
    foglio.appendChild(h);

    const tot = document.createElement('div');
    tot.className = 'riga';
    const et = document.createElement('span');
    et.className = 'tenue';
    et.textContent = 'Incasso del giorno';
    const v = document.createElement('strong');
    v.className = 'grosso verde';
    v.textContent = euro(incasso);
    tot.append(et, v);
    foglio.appendChild(tot);

    const sezione = (titolo, elenco, campoData) => {
      if (elenco.length === 0) return;
      const t = document.createElement('h3');
      t.style.cssText = 'margin:16px 0 8px;font-size:16px;';
      t.textContent = `${titolo} (${elenco.length})`;
      foglio.appendChild(t);
      for (const r of elenco) {
        const card = document.createElement('div');
        card.className = 'card';
        const riga = document.createElement('div');
        riga.className = 'riga';
        const targa = document.createElement('span');
        targa.className = 'targa';
        targa.textContent = r.targa;
        const ora = document.createElement('span');
        ora.className = 'tenue';
        ora.textContent = dataOra(r[campoData]).slice(-5);
        riga.append(targa, ora);
        card.appendChild(riga);
        if (r.proprietario) {
          const chi = document.createElement('div');
          chi.className = 'tenue';
          chi.textContent = r.proprietario;
          card.appendChild(chi);
        }
        foglio.appendChild(card);
      }
    };

    sezione('▲ Entrate', entrate, 'ingressoISO');
    sezione('▼ Uscite', uscite, 'uscitaISO');
  });
}
