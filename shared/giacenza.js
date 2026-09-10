// Prospetto della giacenza: le auto attualmente in deposito, in ordine di
// targa, con il costo maturato fino a ora. Modulo puro (usa solo pricing).
import { calcolaTotale } from './pricing.js';
import { ordinaPerTarga } from './targhe.js';

export const COLONNE_GIACENZA = ['Targa', 'Categoria', 'Stato veicolo', 'Cliente',
  'Telefono', 'Veicolo', 'Posto', 'Entrata', 'Giorni in giacenza',
  'Tariffa', 'Extra', 'Note', 'Costo maturato a oggi'];

/**
 * Righe pronte per Excel e PDF, già ordinate per targa.
 * @param {object} stato
 * @param {number} adessoMs
 * @param {{dataOra:Function, euro:Function}} fmt
 * @returns {{righe:Array<Array<string>>, totaleCents:number, quante:number}}
 */
export function prospettoGiacenza(stato, adessoMs, fmt) {
  const auto = ordinaPerTarga(stato.autoInDeposito ?? []);
  let totaleCents = 0;
  const righe = auto.map((a) => {
    const ingressoMs = Date.parse(a.ingressoISO);
    const conto = calcolaTotale(a, ingressoMs, Math.max(adessoMs, ingressoMs));
    totaleCents += conto.totaleCents;
    return [
      a.targa,
      a.categoriaNome ?? '',
      a.statoVeicoloNome || '—',
      a.proprietario ?? '',
      a.telefono ?? '',
      [a.marca, a.modello].filter(Boolean).join(' '),
      a.posto || '—',
      fmt.dataOra(a.ingressoISO),
      String(Math.floor((adessoMs - ingressoMs) / 86_400_000)),
      a.modoTariffa === 'oraria' ? `${fmt.euro(a.tariffaCents)}/ora` : `${fmt.euro(a.tariffaCents)}/giorno`,
      (a.maggiorazioni ?? []).map((m) => m.nome).join(', ') || '—',
      a.note ?? '',
      fmt.euro(conto.totaleCents),
    ];
  });
  return { righe, totaleCents, quante: auto.length };
}
