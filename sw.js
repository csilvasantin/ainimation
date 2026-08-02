// Service worker de AInimation Studio.
//
// Por qué es tan corto: el sitio ya sella cada asset con `?v=<sha>` en cada
// push, así que una URL sellada NUNCA cambia de contenido y se puede guardar sin
// miedo. Lo peligroso es al revés: cachear el HTML dejaría al usuario con una
// versión vieja que pide assets que ya no existen, y en una app cuyos proyectos
// viven en localStorage eso significa abrir el Studio con código antiguo sobre
// datos nuevos. De ahí las dos reglas:
//
//   · HTML  → siempre red primero. Si no hay red, lo último que se vio.
//   · assets sellados con ?v= → caché primero. Son inmutables por definición.
//   · todo lo demás (incluido el Stock y cualquier API) → ni se toca.
//
// No hay precache: nada se guarda hasta que el usuario lo ha pedido al menos
// una vez, así que instalar no dispara descargas por su cuenta.

// v2: la v1 se quedó con un HTML viejo dentro por servir sin revalidar. Al
// cambiar el nombre, el activate de abajo borra el caché anterior entero.
const CACHE = "ainimation-v2";

self.addEventListener("install", () => {
  // Sin lista de precarga: se activa de inmediato y ya irá guardando lo que se use.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Fuera cachés de versiones anteriores del propio worker.
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

const esHTML = (request) => request.mode === "navigate" ||
  (request.headers.get("accept") || "").includes("text/html");

// Sólo los assets sellados son inmutables; el resto puede cambiar bajo la misma URL.
const esAssetSellado = (url) => url.pathname.startsWith("/assets/") && url.searchParams.has("v");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Nada de otros dominios: el Stock, las fuentes o cualquier API se dejan pasar
  // tal cual. Cachear respuestas ajenas es la forma fácil de servir datos viejos.
  if (url.origin !== self.location.origin) return;

  if (esHTML(request)) {
    event.respondWith((async () => {
      try {
        // `cache: "no-cache"` obliga a revalidar contra el servidor. Sin esto,
        // fetch() respeta el caché HTTP del navegador y "red primero" acaba
        // siendo "caché primero": se servía el HTML anterior, que pide assets
        // sellados con la versión vieja, y el sitio se quedaba congelado en la
        // publicación anterior aunque hubiera una nueva. No descarga de más:
        // manda el If-None-Match y el servidor contesta 304 si no ha cambiado.
        const respuesta = await fetch(request, { cache: "no-cache" });
        const cache = await caches.open(CACHE);
        cache.put(request, respuesta.clone());
        return respuesta;
      } catch {
        // Sin red: lo último que se vio, y si tampoco hay, la página de 404.
        return (await caches.match(request)) || (await caches.match("/404.html")) ||
          new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  if (esAssetSellado(url)) {
    event.respondWith((async () => {
      const guardado = await caches.match(request);
      if (guardado) return guardado;
      const respuesta = await fetch(request);
      if (respuesta.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, respuesta.clone());
      }
      return respuesta;
    })());
  }
});
