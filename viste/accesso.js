// Schermata di accesso: email e password dell'account del deposito.
//
// Le stesse credenziali del backup cloud sul PC. Si digitano UNA volta: da lì
// in poi la sessione si rinnova da sola (vedi nuvola.js), e riaprire l'app
// deve portare dritti dentro senza chiedere niente.
import { accedi } from '../nuvola.js';

export function render(main, ctx, messaggio = '') {
  const box = document.createElement('div');
  box.className = 'accesso';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = '🚗';
  const h1 = document.createElement('h1');
  h1.textContent = 'Deposito Auto';
  const p = document.createElement('p');
  p.className = 'tenue';
  p.textContent = messaggio
    || 'Entra con l\'email e la password del deposito — le stesse della copia di sicurezza sul computer.';

  const inEmail = document.createElement('input');
  inEmail.type = 'email';
  inEmail.inputMode = 'email';
  inEmail.autocapitalize = 'off';
  inEmail.autocomplete = 'username';
  inEmail.spellcheck = false;
  inEmail.placeholder = 'email';

  const inPassword = document.createElement('input');
  inPassword.type = 'password';
  inPassword.autocomplete = 'current-password';
  inPassword.placeholder = 'password';

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'ENTRA';

  const esito = document.createElement('p');
  esito.className = 'tenue';

  const entra = async () => {
    btn.disabled = true;
    esito.textContent = 'Un attimo…';
    try {
      await accedi(inEmail.value, inPassword.value);
      esito.textContent = '';
      ctx.onCollegato();
    } catch (err) {
      inPassword.value = '';
      esito.textContent = '⚠️ ' + (err?.message ?? 'Accesso non riuscito');
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', entra);
  for (const campo of [inEmail, inPassword]) {
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') entra(); });
  }

  const nota = document.createElement('p');
  nota.className = 'tenue';
  nota.style.marginTop = '24px';
  nota.textContent = 'Non hai ancora un account? Si crea dal computer, in '
    + 'Impostazioni → Copia di sicurezza cloud.';

  box.append(logo, h1, p, inEmail, inPassword, btn, esito, nota);
  main.appendChild(box);
  inEmail.focus();
}
