const CACHE_NAME = "athlete-os-cache-v58";
// v9.3.0 : mise en cache fichier par fichier plutôt que cache.addAll(), qui
// rejette en bloc dès qu'une seule URL renvoie 404 — une ressource absente
// suffisait alors à faire échouer l'installation et à priver l'app de son
// mode hors ligne.
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./guidebloc1.html",
  "./manifest.webmanifest",
  "./version.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Mise en cache fichier par fichier : une ressource absente ou en
        // erreur ne doit plus emporter toute l'installation avec elle.
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((error) => {
              console.warn("[sw] ressource non mise en cache :", url, error);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first : les mises à jour de l'app arrivent dès que le réseau répond,
// le cache ne sert que de secours hors ligne.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
