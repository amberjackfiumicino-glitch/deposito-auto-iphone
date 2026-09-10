// Stato in cui si trova il veicolo (incidentato, marciante, bloccato…).
// È un'informazione, NON incide sul prezzo: i supplementi restano le
// maggiorazioni. Come per la categoria, lo stato viene FOTOGRAFATO sull'auto
// all'ingresso (id + nome), così modificarlo dopo non tocca lo storico.
// Modulo puro: nessun import, nessun DOM.

export function statiDefault() {
  return [
    { id: 'incidentata-marciante', nome: 'Incidentata marciante' },
    { id: 'incidentata-non-marciante', nome: 'Incidentata non marciante' },
    { id: 'non-incidentata-bloccata', nome: 'Non incidentata bloccata' },
    { id: 'non-incidentata-non-parte', nome: 'Non incidentata, non parte, non bloccata' },
  ];
}

/** Stato per id; null se non indicato o non più esistente. */
export function trovaStato(impostazioni, id) {
  if (!id) return null;
  const elenco = impostazioni?.statiVeicolo ?? [];
  return elenco.find((s) => s.id === id) ?? null;
}
