# Biblioteca en nube — vista previa, no publicada

La biblioteca local y el borrador antiguo permanecen intactos al cargar. La sincronización es manual, exige sesión Google y conserva una copia local previa. La identidad se verifica mediante firma RS256, emisor, audiencia y caducidad de Google; se usa sub, nunca un correo facilitado por el navegador. Cada consulta está limitada al propietario autenticado. Las escrituras usan revisión condicional en D1. Los conflictos producen una copia independiente; no hay borrado.

Estado: implementación preparada y pruebas automatizadas, interfaz revisada en Chrome con los tres proyectos locales conservados. NO hay aún despliegue de la API, base D1 ni cliente OAuth configurados. No se ha comprobado sincronización real ordenador/móvil. El botón se mantiene desactivado y lo explica, sin simular conexión.

Para activar una vista previa: crear D1 exclusiva de preview y aplicar cloud-library/schema.sql; configurar un cliente Google Web con el origen exacto del previo y GOOGLE_CLIENT_ID del Worker; desplegar con cloud-library/wrangler.toml.example completado (sin reutilizar la base de audiencia); añadir meta interactive-cloud-endpoint a interactivos/index.html con el URL revisado de esa API. No configurar la producción antes de revisión. El token solo vive en memoria; al caducar debe iniciarse sesión de nuevo. No hay sincronización en segundo plano ni eliminación de cuenta todavía.

Prueba de aceptación pendiente: dos dispositivos reales con la misma cuenta y dos cuentas distintas; recuperar, editar, desconectar, recargar, conflictos, fallo de red y cuota. Proyectos existentes deben seguir recuperables y la copia anterior está en ainimation:cloud:backup:<endpoint>. Los tokens no deben aparecer en almacenamiento ni logs.

Imágenes: una por pantalla, PNG/JPEG/WebP de hasta 600 KB, incrustada en el proyecto; exportación HTML autocontenida. Hasta 20 pantallas y límite de importación 24 MB. localStorage puede agotar cuota antes: se informa el fallo y se ofrece exportar; no se debe recargar sin guardar archivo. Esta primera fase no sustituye una biblioteca de medios R2 para imágenes de gran tamaño.

Material del domingo: Jobs corrigió su negativa previa: el interactivo sí existió, pero sus archivos aún no están localizados. No se ha sustituido por otro material ni se afirma haber probado esas imágenes.

Verificación: node --test tests/interactive*.test.mjs (18 pruebas).


## Actualización: infraestructura de vista previa conectada

Worker y assets: https://ainimation-interactive-library-preview.csilvasantin.workers.dev/interactivos/
API: /api. D1 exclusiva ainimation-interactives-preview. El acceso está limitado en servidor a las dos cuentas verificadas de Carlos; la clave de propietario sigue siendo el sub firmado de Google. Se han comprobado remotamente: config 200, lectura sin token 401, token inválido 401 y origen no autorizado 403. Producción permanece sin cambios. 19 pruebas automatizadas correctas, incluida verificación criptográfica real de tokens de prueba y rechazo de caducados/audiencia ajena/cuenta ajena.

Bloqueo actual: la consola de Google no incluye el origen HTTPS del previo ni localhost:46220/127.0.0.1:46220. Origen HTTPS preparado en formulario sin guardar; se solicitó confirmación al usuario antes de ampliar los orígenes autorizados. No se ha probado aún inicio de sesión real ni sincronización con la cuenta de Carlos. La prueba de teléfono físico también está pendiente.

Para reconstruir solo los assets permitidos: node cloud-library/build-preview.mjs. Desplegar usando cloud-library/wrangler.preview.toml, nunca la configuración MCP de producción. No copiar carpetas completas del repositorio al hosting.


## Verificación real tras autorización de Carlos

20-oct-2026: Google confirmó «Se guardó el cliente OAuth». Los tres orígenes aprobados aparecen al volver a abrir el cliente: HTTPS del Worker, http://localhost:46220 y http://127.0.0.1:46220. No se cambiaron los orígenes anteriores ni scopes.

Login real con csilvasantin@gmail.com aceptado por el servidor en HTTPS y, inicialmente, en 127.0.0.1. Se sincronizaron tres proyectos locales y se recuperaron desde el otro origen, con almacenamiento local independiente. Se importó una copia del respaldo Cafetería · Carlos como entrada nueva y se sincronizó: comparación completa del JSON almacenado en D1 con el respaldo = idéntico. La prueba contiene seis entradas, incluidas plantillas y una copia de prueba adicional; ninguna se borró ni sobrescribió. Producción permanece intacta.

HTTPS: recarga conserva las seis entradas y el activo Cafetería · Carlos. Se repitió el login real tras recargar y se sincronizó correctamente. En Chrome emulado a 390 px: salir devolvió acceso/idioma; login Google volvió a verificar la cuenta y sustituyó esos controles por Avanzado/Experto; sincronización correcta. Se capturó también a 320 px. No se dispone de control de un teléfono físico: esa validación sigue pendiente.

Incidencia localizada: 127.0.0.1 devolvió origin_mismatch intermitente después de una recarga, aunque los orígenes están persistidos en Google. No se ha dado por resuelta ni se ha ampliado ningún permiso adicional. HTTPS sí superó el reintento de escritorio y el recorrido móvil emulado.

La sincronización es manual mediante el botón; el token solo vive en memoria, por lo que recargar requiere verificar de nuevo la cuenta para sincronizar. Los proyectos locales permanecen recuperables. El estado de nube avisa cuando hay cambios locales pendientes de sincronizar.
