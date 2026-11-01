# Inspector común — ensayo local

Abrir `/presentaciones/editor/` desde un servidor local del checkout. La rama
incluye únicamente dos documentos ficticios, creados por `fixtures.mjs`: un
site y una presentación. No importa ni modifica sites reales y no guarda en
el generador. No se ha fusionado ni publicado esta interfaz.

El mismo inspector selecciona Portada, Llamada a la acción o Segundo bloque
desde la lista o desde la vista. Edita los campos declarados por el núcleo
`project.mjs`, incluyendo texto, color y posición horizontal. La vista previa
se construye con DOM y textContent; los textos no se ejecutan como HTML.

Comparar muestra original y borrador. Deshacer, Rehacer y Recuperar original
funcionan sobre un historial independiente por proyecto (hasta 100 estados).
Cambiar entre las muestras conserva sus borradores durante la pestaña;
recargar los reinicia. No se usa almacenamiento persistente ni hay autosave
remoto. Una recuperación del original también puede deshacerse.

Descargar ajustes genera un changeset vinculado al origen y revisión. Se ha
probado su descarga en navegador y su aplicación exacta al fixture original,
conservando navegación y los componentes no editados. Descargar no equivale
a guardar ni publicar en el origen. Los botones de acción del preview sirven
para seleccionar componentes; no simulan una inscripción ni un envío.

Escritorio/Móvil cambia sólo el ancho del preview, sin tocar la ventana.
En pantallas estrechas la comparación se apila para conservar legibilidad.

Verificación:

```
node --test tests/refinement-session.test.mjs tests/refinement-project.test.mjs tests/presentation-bridge.test.mjs tests/interactive-director.test.mjs
```

El siguiente incremento necesita un conector autorizado a un origen real,
con carga de revisión, guardado confirmado y comprobación de conflictos.
