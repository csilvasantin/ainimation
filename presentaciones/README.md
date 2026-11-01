# Presentaciones AdmiraNeXT × AINimation — primera conexión

`/presentaciones/` reproduce un paquete v1 de texto visible del generador: portada,
objetivo, bloques activos y cierre. La demo inicial es ficticia. Incluye mapa de
escenas, detalle, teclado (flechas, Home, End, M y espacio), pausa y movimiento
reducido. El paquete puede abrirse y descargarse sin guardar una película.

El laboratorio del generador vive en `/pruebas/ainimation-presentaciones/` de
admiranext.com. Transfiere una copia mediante postMessage: se verifican origen
exacto, ventana y canal aleatorio por apertura. No lleva contraseñas, brief,
notas del presentador, archivos adjuntos ni credenciales. La revisión de origen
es informativa: no hay sincronización de vuelta ni actualizaciones automáticas.

**Afinar en Director** prepara una película nativa con sprites editables,
keyframes, marcas y reglas XPL. Los textos largos se dividen en páginas sin
recortarlos. Guarda película, marcas y etiquetas anteriores bajo una clave de
recuperación única, accesible también tras recargar el reproductor. Recuperar
la anterior conserva además una copia de la película que se está sustituyendo.
Guardar una película sigue usando Archivo en Director.

La vista cinematográfica y Director son dos representaciones del mismo guion;
las órbitas decorativas y el mapa de la vista no se convierten en sprites.
No incorpora decks de imágenes, medios adjuntos, embeds ni el mando de audiencia.
No carga recursos remotos contenidos en el paquete y no ejecuta sus textos.

Despliegue coordinado: publicar primero el receptor de AINimation y después el
laboratorio del generador. Sin receptor, el laboratorio ofrece descarga y avisa
de falta de conexión. La nueva conexión no está publicada por crear esta rama.

Verificación: `node --test tests/presentation-bridge.test.mjs tests/interactive-director.test.mjs`.
El contrato v1 está replicado en el laboratorio del generador; cualquier cambio
de contrato requiere compatibilidad y pruebas en ambos repositorios.
