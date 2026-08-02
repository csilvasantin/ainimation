// Registro del service worker. Va aparte y con guardas porque un fallo aquí no
// puede llevarse por delante la página: si el navegador no lo soporta, si el
// sitio se abre por file:// o si el registro falla, la app tiene que seguir
// funcionando exactamente igual.
// isSecureContext en vez de comprobar https a mano: así también vale en
// localhost, que es contexto seguro y es donde se prueba.
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silencio a propósito: sin service worker el sitio funciona igual, sólo
      // que sin poder instalarse ni abrirse sin conexión.
    });
  });
}
