// Il numero di versione, e come si confrontano due versioni.
//
// PERCHÉ ESISTE UN MODULO APPOSTA: Android decide se un aggiornamento si può
// installare guardando il `versionCode`, un numero intero che deve SEMPRE
// crescere. Quel numero lo calcola `android/app/build.gradle` da package.json:
//
//     major * 10000 + minor * 100 + patch      → "1.15.0" = 11500
//
// La stessa formula serve al telefono, per capire se quello che c'è pubblicato
// è più nuovo di quello che ha installato. Due copie della stessa formula in
// due linguaggi diversi si scostano al primo ritocco, quindi quella di qui è
// coperta da test (`tests/versione.test.js`) e chi tocca il gradle deve
// toccare anche questo file.
//
// Modulo PURO: nessun import, nessun DOM. Come `pricing.js`.

/** Il numero che cresce sempre, come lo vuole Android. 0 se illeggibile. */
export function codiceVersione(versione) {
  const pezzi = String(versione ?? '').trim().split('.');
  if (pezzi.length !== 3) return 0;
  const [major, minor, patch] = pezzi.map((p) => Number.parseInt(p, 10));
  if (![major, minor, patch].every((n) => Number.isInteger(n) && n >= 0)) return 0;
  return major * 10000 + minor * 100 + patch;
}

/**
 * Una versione con minor o patch oltre 99 romperebbe il confronto: "1.9.0"
 * (10900) risulterebbe più recente di "1.8.100" (10900 anche lui). Meglio
 * accorgersene pubblicando che scoprirlo quando un aggiornamento non parte.
 */
export function versioneAmbigua(versione) {
  const pezzi = String(versione ?? '').trim().split('.');
  if (pezzi.length !== 3) return true;
  const [, minor, patch] = pezzi.map((p) => Number.parseInt(p, 10));
  return !Number.isInteger(minor) || !Number.isInteger(patch) || minor > 99 || patch > 99;
}

/** `candidata` è più recente di `installata`? Le versioni illeggibili non lo sono mai. */
export function piuNuova(candidata, installata) {
  const nuova = codiceVersione(candidata);
  if (nuova === 0) return false;
  return nuova > codiceVersione(installata);
}
