# Cafetería: interfaz propia para revisión

El mismo proyecto «Cafetería · recreación» usa `presentation: cafeteria`. Sus 38 imágenes, sus identificadores de origen y el vídeo privado se mantienen como referencias. El reproductor nativo no las pinta ni las incluye en el HTML exportado. El catálogo usa nombres/precios transcritos de las fotos y dibujos vectoriales propios, no recortes ni fondos de las fotografías.

Seis categorías y 42 productos: puristas, autor, filtrados, comida, otras bebidas y Shop. Incluye disponibilidad fotografiada, familias, detalles, leche y suplementos, café, temperatura en bebidas calientes, miel y cantidades de 1 a 20. Los precios y suplementos de esta recreación son editables y deben revisarse antes de cualquier uso comercial.

El modelo de cesta usa céntimos enteros. Combina líneas con opciones iguales, separa las distintas y permite editar/quitar artículos y cantidades. Chai Iced Latte (4,70 €) + Urban Chocolate (3,80 €) suman 8,50 €. La opción avena añade 0,20 € por unidad. Los artículos no disponibles no se añaden.

Recorrido: categorías → producto → opciones/cantidad → cesta → consumir aquí/para llevar → nombre → resumen → pago simulado → ticket opcional de prueba → final → nuevo pedido. Las entradas se validan antes de continuar. No se cobra ni se envían pedidos o correos. Los datos de la sesión de compra quedan en memoria y se vacían al reiniciar/por inactividad (5 minutos). El catálogo y el proyecto sí se conservan en la biblioteca.

La vista ampliada, la incrustada y la exportación comparten la implementación. Los nombres/precios/disponibilidad se pueden editar en el catálogo del creador. El tema Matrix del creador permanece y el recorrido recrea la interfaz clara de las referencias.

Pruebas automáticas: catálogo y tipos, importes, edición y eliminación, variantes, cantidades, estados de checkout, validación de nombre/correo, reinicio, exportación sin fotografías y sin red, y neutralización de cierre de script. El guardado compara la revisión del único proyecto de destino; se comprueba que los otros seis registros sigan idénticos.

Solo Worker de vista previa. No publicado en ainimation.studio. Revisión visual completada el 21 de octubre de 2026 en Chrome de Carlos: interfaz nativa en la aplicación y exportación autocontenida; 2 Chai con avena + Urban = 13,60 €, edición a 1 Chai entero + Urban = 8,50 €, cambio de cantidad = 12,30 €, eliminación de Urban = 4,70 €, reposición = 8,50 €. Se verificó nombre vacío bloqueado, nombre Carlos, resumen, pago de prueba, ticket opcional y pantalla final. Capturas de producto, cesta, resumen y final guardadas para revisión.

## Publicación autorizada · 21-oct-2026

QA móvil en Chrome Responsive, viewport confirmado de 320×740 y 390×740. A 320 se recorrió Chai + Urban (8,50 €), consumir aquí, nombre Carlos, pago de prueba, sin ticket y reinicio. A 390 se repitió desde cero con 2 Urban (7,60 €), para llevar, nombre, pago de prueba y final. Las capturas conservan el ancho de DevTools. Controles y textos ajustados al ancho, sin desplazamiento horizontal observado; el contenido largo utiliza desplazamiento vertical.

Carlos autorizó publicar esta versión tras las pruebas y añadir https://ainimation.studio y https://www.ainimation.studio al cliente Google existente. No se añaden scopes ni permisos de otros servicios. La API conserva la base D1 y el bucket R2 existentes, la identidad por Google sub y la restricción a las cuentas de Carlos. Solo se amplía CORS a los dos orígenes del dominio propio. El frontend de GitHub Pages usa la API actual; no se trasladan ni duplican proyectos por publicar.
