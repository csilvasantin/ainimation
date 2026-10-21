# Creador de interactivos publicado · 21 de octubre de 2026

Publicado en https://www.ainimation.studio/interactivos/. El dominio sin www redirige por HTTPS. GitHub Pages y el sellado terminaron correctamente; los seis módulos/CSS principales publicados coincidieron por SHA-256 con los archivos revisados.

QA de Chrome Responsive a 320×740 y 390×740, tanto en el recorrido autocontenido como en el visor de la aplicación publicada. A 320: Chai + Urban, 8,50 €, consumir aquí, nombre Carlos, resumen, pago simulado, sin correo, final y reinicio. A 390: dos Urban, 7,60 €, para llevar, resumen y final. Controles dentro del ancho; el contenido largo se desplaza verticalmente.

Incidencia corregida durante el cierre: se generaba el documento del iframe ampliado estando todavía oculto su diálogo. En producción el documento tenía nodos pero medidas de layout nulas. Se abre primero el diálogo y se asigna srcdoc en requestAnimationFrame. Se comprobó visualmente la recuperación del visor y se repitieron ambos recorridos en el dominio público. 42 pruebas de interactivos correctas.

Google confirmó el guardado de los dos orígenes aprobados por Carlos, sin nuevos scopes. Inicio de sesión real en ainimation.studio aceptado, seguido de sincronización correcta. La biblioteca pasó de los 7 registros de nube a 9 al incorporar los 2 proyectos ya guardados en el navegador de producción. Comparación de todas las columnas: los siete registros previos idénticos. Recargar Chrome recuperó los nueve proyectos; Cafetería · recreación mantiene las 38 imágenes, el vídeo y el catálogo nativo de 42 productos. No se migró de D1/R2 ni se publicaron los medios privados como assets estáticos.

El pago, los pedidos y el correo del recorrido siguen simulados. La biblioteca se sincroniza manualmente; el token Google vive en memoria y una recarga requiere volver a entrar para sincronizar. Los proyectos locales permanecen al recargar.

Capturas finales: ainimation-publicada-320-resumen.png, ainimation-publicada-390-resumen.png y ainimation-publicada-movil-320-390-final.png, guardadas en los artefactos locales de esta revisión. Chrome quedó en tamaño normal con el recorrido publicado abierto; se cerraron las pestañas auxiliares de prueba y configuración.
