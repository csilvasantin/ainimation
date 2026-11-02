# Presentaciones

Hub de Presentaciones en https://www.ainimation.studio/presentaciones/ con cuatro opciones en orden alfabético:

| Opción | Estado | Ruta |
|---|---|---|
| A. Afinar (editor fino) | Disponible | `presentaciones/editor/` |
| B. Bucle de kiosco | Próximamente | `presentaciones/reproductor/` |
| C. Con interactivos dentro | Próximamente | |
| D. MCP y API para agentes | Próximamente | |

- `index.html` + `hub.css`: el hub (ES/EN).
- `editor/`: el editor fino. Antes se servía también en `/presentaciones/`; ahora el hub enlaza a él de forma visible.
- `reproductor/`, `player.*`, `contract.mjs`, `director.mjs`: reproductor y puente con Director.

Test: `node --test tests/presentaciones-hub.test.mjs`.

---

# AINimation · Presentaciones y sites

`/presentaciones/` abre el inspector común. Las muestras ficticias permiten
ajustar textos, colores y posición, comparar y deshacer. El conector de
AdmiraNeXT carga los textos de una presentación real y guarda mediante el
editor original del generador, con versiones, sincronización de idiomas y
confirmación por relectura. Sus credenciales permanecen en el origen.

El conector real de esta entrega guarda textos; el preview de contenido es
orientativo. No sustituye el diseño original, los decks, medios o comportamientos.
Una URL sola no da acceso a editar una fuente. Ver `editor/README.md` para
el contrato compartido y sus límites.

El reproductor de la primera demo permanece en `/presentaciones/reproductor/`.
Permite mapa de escenas, detalle, teclado y apertura de una copia en Director.
Esa copia de Director es independiente del guardado del inspector en el generador.
Los paquetes del reproductor no contienen notas privadas ni credenciales.
