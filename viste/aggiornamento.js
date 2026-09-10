// Scheda "Aggiornamento": che versione c'è, che versione ci sarebbe, e il
// pulsante per passare da una all'altra senza trasferire file dal computer.
import { soloData } from '../shared/formato.js';
import {
  controlla, disponibile, versioneInstallata, versioneDiQuestaPagina, dentroApp,
  puoInstallare, chiediPermesso, installa,
} from '../aggiornamento.js';

export function render(main, ctx) {
  const mia = versioneInstallata();

  const testa = document.createElement('div');
  testa.className = 'card';
  const riga = (etichetta, valore, classe = '') => {
    const r = document.createElement('div');
    r.className = 'riga';
    const e = document.createElement('span');
    e.className = 'tenue';
    e.textContent = etichetta;
    const v = document.createElement('strong');
    v.className = classe;
    v.textContent = valore;
    r.append(e, v);
    return r;
  };
  // sull'APK la sa Android; sulla versione web la porta la pagina stessa
  testa.appendChild(riga('Versione installata',
    mia?.versione ?? versioneDiQuestaPagina() ?? 'non lo so'));
  main.appendChild(testa);

  // Fuori dall'app Android non c'è niente da scaricare: qui la pagina arriva
  // dal web (iPhone, o prova nel browser) e la versione nuova la si prende
  // semplicemente ricaricando. È il vantaggio di non avere un pacchetto.
  if (!dentroApp()) {
    const nota = document.createElement('div');
    nota.className = 'vuoto';
    const faccia = document.createElement('span');
    faccia.className = 'faccia';
    faccia.textContent = '🔄';
    const p = document.createElement('p');
    p.textContent = 'Questa versione arriva dal web e si aggiorna da sola: '
      + 'basta chiuderla e riaprirla. Non c’è niente da scaricare né da installare.';
    nota.append(faccia, p);
    main.appendChild(nota);

    const ricarica = document.createElement('button');
    ricarica.className = 'btn';
    ricarica.textContent = '🔄 Ricarica adesso';
    ricarica.addEventListener('click', () => globalThis.location?.reload());
    main.appendChild(ricarica);
    return;
  }

  const area = document.createElement('div');
  main.appendChild(area);

  const aspetta = document.createElement('p');
  aspetta.className = 'tenue';
  aspetta.textContent = 'Controllo se c’è una versione nuova…';
  area.appendChild(aspetta);

  controlla({ forza: true }).then(() => disegna()).catch(() => disegna());

  function disegna() {
    area.innerHTML = '';
    const voluto = disponibile();

    if (!voluto) {
      const vuoto = document.createElement('div');
      vuoto.className = 'vuoto';
      const faccia = document.createElement('span');
      faccia.className = 'faccia';
      faccia.textContent = '✅';
      const p = document.createElement('p');
      p.textContent = 'Sei alla versione più recente.';
      vuoto.append(faccia, p);
      area.appendChild(vuoto);

      const ancora = document.createElement('button');
      ancora.className = 'btn chiaro';
      ancora.textContent = '🔄 Controlla di nuovo';
      ancora.addEventListener('click', () => {
        ancora.disabled = true;
        controlla({ forza: true }).finally(() => disegna());
      });
      area.appendChild(ancora);
      return;
    }

    // --- c'è una versione nuova ---
    const card = document.createElement('div');
    card.className = 'card';
    const titolo = document.createElement('div');
    titolo.className = 'grosso verde';
    titolo.textContent = `Versione ${voluto.versione}`;
    card.appendChild(titolo);

    const quando = document.createElement('div');
    quando.className = 'tenue';
    quando.textContent = `Pubblicata il ${soloData(voluto.quando)} · `
      + `${(voluto.dimensione / 1048576).toFixed(0)} MB da scaricare`;
    card.appendChild(quando);

    if (voluto.note) {
      const note = document.createElement('p');
      note.style.marginBottom = '0';
      note.textContent = voluto.note;
      card.appendChild(note);
    }
    area.appendChild(card);

    // Il permesso di installare si dà una volta sola, in una schermata di
    // sistema: se manca, l'installazione non partirebbe e basta.
    if (!puoInstallare()) {
      const avviso = document.createElement('p');
      avviso.className = 'nota-riga giallo';
      avviso.textContent = 'Per aggiornarsi da sola, l’app ha bisogno del tuo permesso '
        + 'di installare (Android lo chiama «installa app sconosciute»). Si dà una volta sola.';
      const vai = document.createElement('button');
      vai.className = 'btn';
      vai.textContent = '⚙️ Dai il permesso';
      vai.addEventListener('click', () => chiediPermesso());
      const riprova = document.createElement('button');
      riprova.className = 'btn chiaro';
      riprova.textContent = 'Fatto, riprova';
      riprova.addEventListener('click', () => disegna());
      area.append(avviso, vai, riprova);
      return;
    }

    const barra = document.createElement('div');
    barra.className = 'barra-avanzamento';
    const dentro = document.createElement('div');
    barra.appendChild(dentro);
    barra.style.display = 'none';

    const stato = document.createElement('p');
    stato.className = 'tenue';
    stato.style.display = 'none';

    const btn = document.createElement('button');
    btn.className = 'btn verde';
    btn.textContent = '⬇️ Scarica e installa';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Scarico…';
      barra.style.display = '';
      stato.style.display = '';
      stato.textContent = 'Tieni l’app aperta finché non finisce.';

      installa(voluto, (fatti, totale) => {
        const percento = totale > 0 ? Math.round((fatti / totale) * 100) : 0;
        dentro.style.width = `${percento}%`;
        btn.textContent = `Scarico… ${percento}%`;
      }).then(() => {
        btn.textContent = '✅ Scaricata';
        stato.textContent = 'Adesso Android chiede la conferma per installarla. '
          + 'I tuoi dati restano dove sono.';
      }).catch((err) => {
        btn.disabled = false;
        btn.textContent = '⬇️ Riprova';
        barra.style.display = 'none';
        ctx.avvisaErrore(err);
        stato.textContent = '';
      });
    });

    area.append(btn, barra, stato);
  }
}
