// Piani d'uso dell'app (predisposizione commerciale, nessun pagamento ancora).
// Modulo puro. L'enforcement è "soft": i plugin fuori piano non si possono
// accendere (lucchetto in Impostazioni → Funzioni).

export const PIANI = {
  base: {
    chiave: 'base',
    nome: 'BASE',
    colore: '#64748b',
    prezzo: 'Gratis',
    slogan: 'Tutto l\'essenziale per partire',
    incluse: [], // solo il core: entrate/uscite, ricevute, calendario, storico, cloud
  },
  pro: {
    chiave: 'pro',
    nome: 'PRO',
    colore: '#1d4ed8',
    prezzo: 'Da definire',
    slogan: 'Il deposito organizzato e veloce',
    incluse: ['rubrica', 'ricercaGlobale', 'posti', 'ticket', 'cassa', 'whatsapp', 'statistiche'],
  },
  premium: {
    chiave: 'premium',
    nome: 'PREMIUM',
    colore: '#7e22ce',
    prezzo: 'Da definire',
    slogan: 'Automazione totale con AI',
    incluse: ['rubrica', 'ricercaGlobale', 'posti', 'ticket', 'cassa', 'whatsapp',
      'statistiche', 'fotoAI', 'fotoStato', 'abbonamenti', 'mobile'],
  },
};

/** Il piano dato include questa funzione? */
export function pianoConsente(piano, chiave) {
  const def = PIANI[piano] ?? PIANI.base;
  return def.incluse.includes(chiave);
}

/** Piano minimo che include la funzione (per il messaggio del lucchetto). */
export function pianoMinimoPer(chiave) {
  for (const p of ['pro', 'premium']) {
    if (PIANI[p].incluse.includes(chiave)) return PIANI[p];
  }
  return PIANI.premium;
}

/**
 * L'export Excel dello storico è una capacità PRO (non è un plugin).
 * Un piano mancante vale PREMIUM, non BASE: un dato che si è perso per strada
 * (per esempio dopo un ripristino dal cloud) non deve togliere una funzione
 * all'utente.
 */
export function esportaConsentito(piano) {
  if (!piano) return true;
  return piano === 'pro' || piano === 'premium';
}
