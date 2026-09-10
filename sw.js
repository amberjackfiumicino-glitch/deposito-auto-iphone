/**
 * Il service worker della sola versione web.
 *
 * Serve a coprire l'unica differenza vera con l'APK: l'app Android ha i suoi
 * file nel telefono, quindi senza rete si apre lo stesso e mostra l'ultimo
 * elenco in sola lettura (invariante 11a). Una pagina web, senza questo, non
 * si aprirebbe proprio.
 *
 * Strategia: **prima la rete, la copia solo se la rete non risponde.** Il
 * contrario (prima la copia) sarebbe più veloce ma lascerebbe addosso una
 * versione vecchia dell'app senza che nessuno se ne accorga, ed è il difetto
 * classico di queste cose. Qui, con la linea, si ha sempre l'ultima versione.
 *
 * Il database NON passa di qui: le chiamate a Supabase sono di un altro
 * dominio e vengono lasciate stare. Nessun dato del deposito finisce nella
 * cache del browser.
 */
const CACHE = 'deposito-guscio-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome !== CACHE) await caches.delete(nome);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const richiesta = e.request;
  // solo il guscio dell'app, e solo le letture
  if (richiesta.method !== 'GET') return;
  if (new URL(richiesta.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const dallaRete = await fetch(richiesta);
      if (dallaRete && dallaRete.ok) {
        const cache = await caches.open(CACHE);
        cache.put(richiesta, dallaRete.clone());
      }
      return dallaRete;
    } catch (err) {
      const salvata = await caches.match(richiesta);
      if (salvata) return salvata;
      // una navigazione senza rete e senza copia: almeno l'indice
      if (richiesta.mode === 'navigate') {
        const indice = await caches.match('./index.html');
        if (indice) return indice;
      }
      throw err;
    }
  })());
});
