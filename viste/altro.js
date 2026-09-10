// Scheda "Altro": il menu di tutto ciò che non sta nelle quattro schede di
// tutti i giorni. Con nove schermate una barra in fondo non basta più, ma il
// lavoro quotidiano non deve cambiare di un tocco: quindi le quattro restano
// dove sono e il resto entra da qui.
import { funzioneAttiva } from '../shared/funzioni.js';

const VOCI = [
  { chiave: 'cerca', ico: '🔍', nome: 'Cerca', sotto: 'Targa, cliente o numero di ricevuta' },
  { chiave: 'clienti', ico: '👥', nome: 'Clienti', sotto: 'Rubrica, anagrafica e listini', plugin: 'rubrica' },
  { chiave: 'storico', ico: '📖', nome: 'Storico', sotto: 'Le soste concluse' },
  { chiave: 'calendario', ico: '📅', nome: 'Calendario', sotto: 'Entrate e uscite giorno per giorno' },
  { chiave: 'statistiche', ico: '📊', nome: 'Statistiche', sotto: 'Incassi e andamento', plugin: 'statistiche' },
  { chiave: 'abbonamenti', ico: '⭐', nome: 'Abbonamenti', sotto: 'Mensili e rinnovi', plugin: 'abbonamenti' },
  { chiave: 'impostazioni', ico: '⚙️', nome: 'Impostazioni', sotto: 'Tariffe, tipi di veicolo, maggiorazioni' },
  { chiave: 'aggiornamento', ico: '⬇️', nome: 'Aggiornamento', sotto: 'Scarica l’ultima versione dell’app' },
];

export function render(main, ctx) {
  const menu = document.createElement('div');
  menu.className = 'menu-altro';

  for (const v of VOCI) {
    if (v.plugin && !funzioneAttiva(ctx.stato, v.plugin)) continue;

    const b = document.createElement('button');
    b.type = 'button';
    const ico = document.createElement('span');
    ico.className = 'ico';
    ico.textContent = v.ico;
    const testi = document.createElement('span');
    const nome = document.createElement('span');
    nome.textContent = v.nome;
    const sotto = document.createElement('small');
    sotto.className = 'tenue';
    sotto.style.display = 'block';
    sotto.style.fontWeight = '400';
    sotto.textContent = v.sotto;
    testi.append(nome, sotto);
    b.append(ico, testi);
    b.addEventListener('click', () => ctx.vai(v.chiave));
    menu.appendChild(b);
  }

  main.appendChild(menu);

  const nota = document.createElement('p');
  nota.className = 'tenue';
  nota.style.cssText = 'margin-top:20px;text-align:center;line-height:1.5;';
  nota.textContent = 'Stampa, PDF, export Excel, foto e copia di sicurezza '
    + 'si fanno dal computer.';
  main.appendChild(nota);
}
