# Neón lluvioso — brief del primer bucle (fase 2)

Fecha: 6-nov-2026. Capa: Presentaciones en ainimation.studio.
La marca fija el acento. El tema pone la atmósfera y, desde esta fase, el fondo en bucle.

| | |
|---|---|
| Id | `neon-lluvioso` |
| Nombre visible | Neón lluvioso |
| Acento de marca (muestra) | `#22d3ee` sobre texto `#041016`. No vive en el tema: cada presentación conserva el suyo. |
| Atmósfera | Noche urbana, lluvia continua, asfalto que refleja neón cian y magenta, vapor bajo y grano fino. Sin personajes y sin rótulos legibles. |

## Bucle

- Tipo publicado: animación CSS `lluvia` (clase `.mb-cine-fondo`), en bucle e infinita.
- Mudo. No hay pista de audio en el fondo. El ambiente del tema sigue en el botón «Sonido del tema» y solo suena tras un clic.
- Crédito visible, siempre: `ainimation.studio` (clase `.mb-cine-credito`). No se sustituye por otro texto.
- Hueco reservado para un vídeo generado después, misma ruta y mismo crédito: `/presentaciones/temas/neon-lluvioso/bucle.webm`. Hasta que ese archivo exista, la animación CSS es el fondo que se pinta.

## Qué tiene que consumir Presentaciones

Espejo previsto: el mismo módulo en admira-next-web (`pruebas/ainimation-presentaciones/refinement/`). Esta entrega no lo copia allí.

1. Campo ya existente: `ideas.tema` → `document.components.style.tema` = `neon-lluvioso`.
2. Después de `aplicarCine(raiz, id)`, llamar `montarBucle(escena, id)` sobre el nodo de la escena. Eso crea `.mb-cine-fondo` y el crédito.
3. CSS: `presentaciones/editor/cine.css`. Ganchos:
   - `[data-mb-tema="neon-lluvioso"]`
   - variables `--mb-cine-bucle: lluvia` y `--mb-cine-credito: "ainimation.studio"`
   - clases `.mb-cine-fondo` (`data-mb-cine-anim="lluvia"`) y `.mb-cine-credito`
4. El acento de la marca sigue en su campo (`accent` / `--mb-acento`). Este tema no lo pisa.
5. No publicar este id por `/modo`. El comando de producción no cambia en esta entrega.

Contrato máquina: [`neon-lluvioso.json`](neon-lluvioso.json).

## Rollback

Un solo commit sobre `main`. Si llegara a publicarse: `git revert <sha>` (sin `-m`). No hay tag: esta rama no se despliega ni se fusiona desde aquí.
