// Accende il service worker (solo nella versione web: nell'APK non c'è).
// Se il browser non lo supporta, o lo rifiuta, l'app funziona lo stesso: è
// una comodità in più, non un pezzo indispensabile.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* pazienza */ });
  });
}
