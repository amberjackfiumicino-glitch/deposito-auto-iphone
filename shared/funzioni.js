// Catalogo delle funzioni opzionali ("plugin") e helper di attivazione.
// Unica fonte di verità: la sezione Funzioni delle Impostazioni itera questo
// elenco, e ogni pezzo di UI condizionale usa funzioneAttiva().
// Modulo puro: nessun import.

export const FUNZIONI = [
  {
    chiave: 'fotoAI',
    nome: '📷 Foto AI (Ollama)',
    colore: '#7e22ce',
    descrizione: 'Trascina una foto dell\'auto in Nuova Entrata: targa, marca e modello si compilano da soli usando i modelli AI locali del PC (gratis, offline).',
  },
  {
    chiave: 'rubrica',
    nome: '👤 Rubrica clienti automatica',
    colore: '#15803d',
    descrizione: 'Targa già passata dal deposito → proprietario, telefono, veicolo e tariffa si precompilano dall\'ultima visita.',
  },
  {
    chiave: 'ricercaGlobale',
    nome: '🔍 Ricerca istantanea',
    colore: '#0369a1',
    descrizione: 'Barra di ricerca sempre visibile: digita targa, nome o numero ticket e trova subito l\'auto, dentro o nello storico.',
  },
  {
    chiave: 'fotoStato',
    nome: '📸 Foto stato veicolo',
    colore: '#b45309',
    descrizione: 'Allega foto di carrozzeria e graffi all\'ingresso: restano legate all\'auto come prova in caso di contestazioni.',
  },
  {
    chiave: 'whatsapp',
    nome: '💬 Avviso WhatsApp',
    colore: '#16a34a',
    descrizione: 'Un click sulla card apre WhatsApp col messaggio già pronto per il cliente ("auto pronta, totale…").',
  },
  {
    chiave: 'posti',
    nome: '🗺️ Posto assegnato e mappa',
    colore: '#1d4ed8',
    descrizione: 'Assegni un posto (es. B12) all\'ingresso: lo vedi su card, ricevuta e nella vista mappa raggruppata per fila.',
  },
  {
    chiave: 'ticket',
    nome: '🎫 Ticket ingresso con QR',
    colore: '#9333ea',
    descrizione: 'Alla registrazione stampi un tagliando numerato con QR; alla riconsegna digiti (o scansioni) il numero e parte il checkout.',
  },
  {
    chiave: 'cassa',
    nome: '🧾 Chiusura di cassa',
    colore: '#0f766e',
    descrizione: 'Report giornaliero stampabile: incassi contanti/carta, entrate e uscite del giorno.',
  },
  {
    chiave: 'statistiche',
    nome: '📊 Statistiche',
    colore: '#c2410c',
    descrizione: 'Andamento incassi, occupazione, durata media della sosta e migliori clienti, con grafici.',
  },
  {
    chiave: 'mobile',
    nome: '📱 App per il telefono',
    colore: '#0f766e',
    descrizione: 'Il telefono lavora sugli stessi dati del computer, ovunque ci sia connessione: vedi le auto dentro, registri entrate e incassi le uscite anche a PC spento. Servono un account (Copia di sicurezza cloud) e la app installata sul telefono.',
  },
  {
    chiave: 'abbonamenti',
    nome: '⭐ Abbonamenti mensili',
    colore: '#a16207',
    descrizione: 'Tariffa fissa mensile per i clienti abituali: scadenze sotto controllo, ingressi senza addebito.',
  },
];

export function funzioneAttiva(stato, chiave) {
  return !!stato?.impostazioni?.funzioni?.[chiave];
}

/**
 * Tutto acceso.
 *
 * Fino alla v1.13 nasceva tutto spento, e il piano aveva il potere di spegnere:
 * un passaggio a BASE (che non include nulla) azzerava ogni funzione, e il
 * ritorno a PREMIUM non ne riaccendeva nessuna. È così che è sparita la Cassa
 * dal deposito vero, senza che nessuno l'avesse chiesto.
 * Adesso il piano racconta cosa comprende, ma non tocca più i dati: l'unico
 * che spegne una funzione è chi usa l'interruttore in Impostazioni.
 */
export function funzioniDefault() {
  const f = {};
  for (const { chiave } of FUNZIONI) f[chiave] = true;
  return f;
}
