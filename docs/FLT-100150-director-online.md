# FLT-100150 · Cortes 1+2 · AInimation Studio → Director online (9-sep-2026)

Brief de Carlos vía Jobs (encargo #2904). Una sola superficie `/studio` con el gesto
Cast en Stage → fila en Score (canal × frame) → ▶ Play mueve el Stage según el Score.

## Corte 1 — Unificar
- **Modo Director (fijo)** por defecto: paleta de herramientas · Cast (izq) · Stage (centro) ·
  inspector (der, plegable con Window → «Inspector a la derecha») · Score abajo a todo el ancho.
  Window → «Modo Director (fijo)» vuelve a las ventanas flotantes de siempre; la preferencia
  se guarda en el navegador (`ainimation-layout`, `ainimation-inspector`).
- **Produce detrás de ▶ Play**: Control → «🎬 Producir vídeo (Produce)» manda la película del
  Score a la sala de producción (`ainimation.admira.store/api/produce`, el mismo worker que
  usaba studio-live) y cuenta el estado en la barra del Score; si en 90 s sigue en cola, lo dice
  con el id (hoy no hay renderizador escuchando: la API acepta, nadie renderiza).
- Payment sigue colapsado (Jobs, FLT-100146); el board del AI Director no se toca.

## Corte 2 — Score real
- Eje X = fotogramas con playhead; eje Y = canales numerados 1…N (número delante de cada fila).
- Rejilla de fotogramas real: una línea por fotograma y una marcada cada cinco, calculada del
  zoom del Score (`--timeline-display-frames`).
- Sprite = instancia del Cast con propiedades en el tiempo (keyframes interpolados);
  arrastrar un miembro del Cast al Score lo coloca en ese fotograma; colocarlo en el Stage crea
  su fila. ▶ Play y el scrub mueven el Stage (verdad Stage = Score). Persistencia JSON de la
  película (Archivo → Guardar/Exportar).

## Fuera (Cortes 3–4)
Lingo-lite completo y Projector = OpenMontage idéntico.
