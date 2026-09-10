// Categorie di veicolo, ognuna con le proprie tariffe (auto e furgone costano
// diverso). Modulo puro: nessun import, nessun DOM.
// INVARIANTE: come per le tariffe, la categoria viene FOTOGRAFATA sull'auto
// all'ingresso (id + nome), così rinominarla o cancellarla non tocca lo storico.

/** Categorie iniziali, con tariffe derivate da quelle generali. */
export function categorieDefault(imp = {}) {
  const oraria = imp.tariffaOrariaCents ?? 200;
  const giornaliera = imp.tariffaGiornalieraCents ?? 1500;
  const fisso = imp.costoFissoCents ?? 500;
  return [
    { id: 'auto', nome: 'Auto', icona: '🚗', tariffaOrariaCents: oraria, tariffaGiornalieraCents: giornaliera, costoFissoCents: fisso },
    { id: 'furgone', nome: 'Furgone', icona: '🚐', tariffaOrariaCents: Math.round(oraria * 1.5), tariffaGiornalieraCents: Math.round(giornaliera * 1.5), costoFissoCents: fisso },
    { id: 'moto', nome: 'Moto', icona: '🏍️', tariffaOrariaCents: Math.round(oraria * 0.6), tariffaGiornalieraCents: Math.round(giornaliera * 0.6), costoFissoCents: fisso },
    { id: 'camper', nome: 'Camper', icona: '🚙', tariffaOrariaCents: oraria * 2, tariffaGiornalieraCents: giornaliera * 2, costoFissoCents: fisso },
  ];
}

/** Categoria per id; se non c'è (rinominata o cancellata) torna la prima. */
export function trovaCategoria(impostazioni, id) {
  const elenco = impostazioni?.categorie?.length ? impostazioni.categorie : categorieDefault(impostazioni);
  return elenco.find((c) => c.id === id) ?? elenco[0];
}

/** Tariffa della categoria secondo il modo scelto. */
export function tariffaDaCategoria(categoria, modoTariffa) {
  return modoTariffa === 'oraria'
    ? (categoria?.tariffaOrariaCents ?? 0)
    : (categoria?.tariffaGiornalieraCents ?? 0);
}

/** Id univoco a partire dal nome (per le categorie aggiunte a mano). */
export function idDaNome(nome, esistenti = []) {
  const base = String(nome ?? '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'categoria';
  let id = base;
  let n = 2;
  while (esistenti.some((c) => c.id === id)) id = `${base}-${n++}`;
  return id;
}
