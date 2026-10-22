# Acceso con Google / Google sign-in

ES: Entra en el Creador y abre **Cuenta / Idioma → Iniciar sesión con Google**. Completa la confirmación de Google. Sólo **Cuenta verificada** habilita la sincronización y los envíos. **Continuar con Google aquí** ofrece la confirmación de Google dentro del diálogo; si Google no la muestra, conserva tus proyectos y utiliza el botón de Google del mismo diálogo. Cerrar y reabrir Cuenta conserva el botón de acceso. Desconectar cuenta no borra la biblioteca local.

EN: In Creator, open **Account / Language → Sign in with Google** and complete Google's confirmation. Only **Account verified** enables sync and deliveries. **Continue with Google here** offers Google's confirmation inside the dialog; if Google cannot display it, your projects are preserved and the dialog's Google button remains available. Closing and reopening Account preserves its sign-in button. Signing out does not delete the local library.

## Contrato / Contract

- Google Identity Services se inicializa una vez por página. Biblioteca y diálogo usan botones distintos en contenedores fijos; no se traslada un iframe de Google ya activo. / GIS initializes once per page. Library and dialog have separate fixed button containers; an active Google iframe is never reparented.
- La página y el script de Google declaran `strict-origin-when-cross-origin`. El SDK usa su flujo oficial `ux_mode: popup`, con el mismo cliente configurado. / Page and Google script declare `strict-origin-when-cross-origin`; the SDK uses its official popup flow and the existing client.
- El callback comprueba la credencial contra la API de producción antes de habilitar controles. Firma RS256, emisor, audiencia, caducidad, cuenta autorizada y aislamiento por propietario siguen en servidor. / The callback checks the credential with the production API before enabling controls. Server-side signature, issuer, audience, expiry, allowed-account and owner checks remain in place.
- Desconectar invalida comprobaciones pendientes. Un aviso tardío de One Tap no puede sustituir el estado de una cuenta verificada. / Sign-out invalidates pending checks. A late One Tap notification cannot overwrite verified status.
- La credencial vive sólo en memoria. No se guarda en almacenamiento ni logs. `data-google-sign-in-method` y `data-google-sign-in-button` registran sólo el tipo de interacción del SDK y el botón, nunca la credencial. / Credentials stay in memory, never storage or logs; diagnostic DOM attributes record only SDK interaction type and button name.

La estabilidad de los contenedores está comprobada en el navegador interno y las pruebas de autenticación cubren rechazo del servidor, cierre de sesión durante una comprobación y notificaciones tardías. La confirmación de un nuevo acceso en producción debe registrarse por separado; no equivale a reutilizar una sesión anterior. / Container stability is checked in the internal browser; authentication tests cover server rejection, sign-out during verification and delayed notifications. A fresh production sign-in must be recorded separately from reusing an existing session.

Referencias / References: [Google JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference), [Google setup and browser policies](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
