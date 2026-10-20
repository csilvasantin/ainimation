# Cafetería: recreación táctil para revisión

La vista previa usa las 38 fotos recuperadas y contrasta la navegación de bebida fría con el vídeo de 34 segundos. Conserva los 38 sourceAssetId y sus imágenes, el vídeo privado y el mismo proyecto de la biblioteca. No añade fotos al repositorio ni modifica otros proyectos.

`cafeteria-recreation.mjs` convierte las escenas del lote en un grafo de 159 zonas, expresadas como porcentajes de cada foto. Las familias, Chai Iced Latte y Urban Chocolate enlazan personalización, bolsa, consumo aquí/para llevar, nombre de ejemplo, resumen y las referencias de pago/ticket. Las fotos intermedias conservan estados y gestos de referencia; no representan un carrito que calcule cantidades/precios ni formularios que capturen nombre o correo. Solo se enlazan los detalles de bebida disponibles en las referencias. El pago, lector y envío de ticket son simulados, sin llamadas externas.

El reproductor y la exportación comparten las zonas. Hay alternativa de acciones con botones de 44px, foco por teclado, inicio, reinicio por inactividad y mostrar/ocultar contornos. El editor permite cambiar nombres, destinos y coordenadas, y abrir una prueba ampliada. El vídeo sigue privado fuera de la exportación HTML.

Verificación: 36 pruebas de interactivos, incluidos límites/destinos, conservación del original, acceso a las 38 escenas y la ruta de principio a fin. En Chrome de Carlos se completaron Urban Chocolate → temperatura → bolsa → consumir aquí → nombre → resumen → pago simulado → ticket → nuevo pedido, y Chai → opciones → bolsa → para llevar. El guardado de nube compara revisión antes de actualizar solo el registro de Cafetería · recreación, y comprueba los otros seis registros completos sin diferencias. Copias y fotografías quedan en almacenamiento privado local.

Disponible únicamente en el Worker de vista previa. No publicado en ainimation.studio.
