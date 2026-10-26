# Editor de cápsulas «¿Sabías que?»

El botón AI de Stock conserva el editor inline actual. Cuando la API confirma una fuente `capsula/1`, su barra ofrece «Editar textos, media y tiempos», que abre `studio.html?mode=capsula&admiraStockId=<id>`. Si hay cambios locales de texto, el enlace conserva el borrador y solicita generar esa revisión o recuperar el original antes de cambiar de editor. El identificador es el ID del asset, no su número visible: #1815 es `1792700022035-lho8uh` y #1816 es `1792700036486-d767l3`.

El documento `capsula/1` vive en `stock/<id>/capsula.json`, separado del MP4 publicado. Textos permite Normal, Énfasis y Cifra; la plantilla controla las fuentes y los tamaños. Media admite Stock y subida, crédito, intervalo y recorte normalizado. Tiempos modifica fronteras compartidas de gancho/giro/remate, sin huecos ni solapamientos.

Guardar solicita una sesión Pixeria con `/auth/bridge`: el token efímero solo permanece en memoria. El puente restringe origen, ventana y nonce. Las escrituras usan ETag/If-Match y conservan una edición local nueva cuando termina un guardado anterior.

Cada preview envía `previewOnly:true` y `phase:1|2|3`; recibe un `renderId` independiente. El editor consulta ese trabajo y muestra vídeos y capturas del renderizador v5.7, conservando las revisiones anteriores. La composición del navegador es una guía. Solicitar un preview nunca publica ni oculta versiones del Stock. El historial recupera también los metadatos archivados, incluida v1.

## Activación coordinada

1. Desplegar los endpoints del Worker `pixer-worker`, el puente Pixeria y los accesos Stock de Pixeria/Admira Studio.
2. Actualizar el consumidor `tools/capsulas-sabiasque` en GrokBotBox con el adaptador de documentos y los estilos v5.7.
3. Generar fuentes con `seed_capsula.py --media-url <URL HTTPS del vídeo fuente>`, conservando el guion original. Subir las fuentes de #1815/#1816 y la media fuente sin sobrescribir sus MP4 ni metadatos publicados.
4. Publicar los assets de AInimation y comprobar el flujo de sesión, guardado y preview.
5. La publicación de una cápsula nueva queda para la decisión de Carlos.

La validación del encargo #7103 se realizó sobre copias locales de Stock y un Worker local: importar ambos formatos, editar y guardar, añadir una imagen con el selector Stock y ajustar los tiempos. La revisión editorial v2 parte de la versión técnica v8; su trabajo de render corresponde a la siguiente versión técnica v9. Los archivos públicos de v1 a v8 se conservan.

## Pruebas

`node --test test/capsula-editor.browser.test.mjs` ejecuta Chromium headless con Playwright para comprobar sesión, escrituras concurrentes, previews por fase y rangos de estilos. `PLAYWRIGHT_MODULE` permite indicar el módulo de Playwright del entorno de ejecución.

Para revisar con un Worker local, el arnés puede inyectar `window.ainCapsulaLocal={api,token}` antes de cargar la página. Este ajuste solo se lee cuando la página está servida por loopback. Nunca incluir claves de producción en la configuración del navegador.


## Integración con main · 26 octubre 2026

Se conserva el editor inline, las importaciones por lotes y las versiones de proyectos incorporadas después de la primera propuesta. La edición completa sale del modo de enfoque del Director y aísla sus atajos de teclado. No cambia el acceso de cápsulas antiguas sin fuente: la opción completa solo aparece si el GET devuelve un documento editable.

Los guardados simultáneos comparten la misma petición. Un doble clic no encola dos previews; editar durante el encolado conserva el borrador nuevo y registra la revisión anterior sin presentarla como resultado de los últimos cambios. La recuperación local comprueba identidad y recalcula la duración.

Validación: seis escenarios headless del editor completo con CSS reales; editor inline ES/EN; recorrido de las cápsulas #1815/#1816 con el Worker real y un bucket en memoria (texto, imagen, tiempos, sesión firmada, guardado, preview, recarga y conservación de metadatos), escritorio 1440px y móvil 390px. Estos ensayos no escriben en producción.

La activación requiere desplegar AInimation, el Worker y el puente de sesión Pixeria, instalar el consumidor actualizado y cargar fuentes verificadas. El `main` actual de Studio ya aporta el editor inline; no se debe reintroducir la antigua rama de Stock que lo sustituía por el importador.
