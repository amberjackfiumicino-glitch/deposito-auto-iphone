// Calcoli per la vista Statistiche. Modulo puro e testabile.
// Include anche i pagamenti abbonamento (stessi criteri della cassa).

const GIORNO_MS = 86_400_000;

/** Tutti gli incassi come {dataISO, importoCents, metodo} (storico + abbonamenti). */
export function tuttiIncassi(stato) {
  const incassi = stato.storico.map((r) => ({
    dataISO: r.uscitaISO,
    importoCents: r.totaleCents,
    metodo: r.metodoPagamento,
    proprietario: r.proprietario,
    targa: r.targa,
  }));
  for (const abb of stato.abbonamenti ?? []) {
    for (const p of abb.pagamenti ?? []) {
      incassi.push({
        dataISO: p.dataISO,
        importoCents: p.importoCents,
        metodo: p.metodoPagamento,
        proprietario: abb.proprietario,
        targa: abb.targa,
      });
    }
  }
  return incassi;
}

function chiaveGiornoLocale(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ultimi N giorni: [{chiave, etichetta, totaleCents}] dal più vecchio. */
export function incassiPerGiorno(stato, adessoMs, giorni = 30) {
  const incassi = tuttiIncassi(stato);
  const mappa = new Map();
  for (const i of incassi) {
    const chiave = chiaveGiornoLocale(Date.parse(i.dataISO));
    mappa.set(chiave, (mappa.get(chiave) ?? 0) + i.importoCents);
  }
  const esito = [];
  for (let g = giorni - 1; g >= 0; g--) {
    const ms = adessoMs - g * GIORNO_MS;
    const chiave = chiaveGiornoLocale(ms);
    esito.push({
      chiave,
      etichetta: new Date(ms).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      totaleCents: mappa.get(chiave) ?? 0,
    });
  }
  return esito;
}

/** Ultimi N mesi: [{etichetta, totaleCents}] dal più vecchio. */
export function incassiPerMese(stato, adessoMs, mesi = 12) {
  const incassi = tuttiIncassi(stato);
  const mappa = new Map();
  for (const i of incassi) {
    const d = new Date(i.dataISO);
    const chiave = `${d.getFullYear()}-${d.getMonth()}`;
    mappa.set(chiave, (mappa.get(chiave) ?? 0) + i.importoCents);
  }
  const adesso = new Date(adessoMs);
  const esito = [];
  for (let m = mesi - 1; m >= 0; m--) {
    const d = new Date(adesso.getFullYear(), adesso.getMonth() - m, 1);
    esito.push({
      etichetta: d.toLocaleDateString('it-IT', { month: 'short' }),
      totaleCents: mappa.get(`${d.getFullYear()}-${d.getMonth()}`) ?? 0,
    });
  }
  return esito;
}

/** Riepilogo generale. */
export function riepilogoStatistiche(stato, adessoMs) {
  const incassi = tuttiIncassi(stato);
  let totale = 0, contanti = 0;
  for (const i of incassi) {
    totale += i.importoCents;
    if (i.metodo === 'contanti') contanti += i.importoCents;
  }

  // durata media della sosta (solo depositi veri)
  let durataTot = 0;
  for (const r of stato.storico) {
    durataTot += Date.parse(r.uscitaISO) - Date.parse(r.ingressoISO);
  }
  const durataMediaMs = stato.storico.length ? Math.round(durataTot / stato.storico.length) : 0;

  // top clienti per spesa
  const perCliente = new Map();
  for (const i of incassi) {
    const nome = i.proprietario?.trim() || i.targa;
    perCliente.set(nome, (perCliente.get(nome) ?? 0) + i.importoCents);
  }
  const topClienti = [...perCliente.entries()]
    .map(([nome, cents]) => ({ nome, cents }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);

  const scontrinoMedio = incassi.length ? Math.round(totale / incassi.length) : 0;

  return {
    totaleCents: totale,
    contantiCents: contanti,
    cartaCents: totale - contanti,
    numIncassi: incassi.length,
    scontrinoMedioCents: scontrinoMedio,
    durataMediaMs,
    topClienti,
  };
}
