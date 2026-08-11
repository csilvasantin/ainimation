# «Toca y Elige» — interactivo listo para admira.tv

Xperiencia generada con **AInimation Studio** (`Archivo ▸ Publicar Xperiencia`). No
está escrita a mano: `index.html`, `plan.json` y `rules.json` son la salida literal
de `assets/publish-xperiencia.js` sobre la pieza montada en el Studio.

Es la **plantilla de partida para señalética interactiva**: tres puertas táctiles y
la regla que casi nadie recuerda hasta que la pantalla se queda colgada.

## La pieza

30 s a 24 fps (720 fotogramas), 16:9, sin media remota → viaja entera y funciona en
un kiosko sin más internet que el que la sirvió.

| Tramo | Fotogramas | Qué se ve |
|---|---|---|
| Atracción | 1–158 | «TOCA UNA OPCIÓN» + las tres zonas, en bucle |
| Ofertas | 180–320 | panel verde |
| Novedades | 340–480 | panel azul |
| Cómo llegar | 500–640 | panel ámbar |

## Las reglas (XPL)

| CUANDO | ENTONCES |
|---|---|
| clic en `zona-ofertas` | saltar a `OFERTAS` y reproducir hasta `FIN-OFERTAS` |
| clic en `zona-novedades` | saltar a `NOVEDADES` y reproducir hasta `FIN-NOVEDADES` |
| clic en `zona-llegar` | saltar a `LLEGAR` y reproducir hasta `FIN-LLEGAR` |
| se llega a `FIN-ATRACCION` | volver a `INICIO` (la atracción se repite sola) |
| 12 s sin tocar **y** fotograma ≥ 170 | volver a `INICIO` |

La última es la regla de señalética y es la que diferencia un interactivo de calle
de una web: **la calle no cierra sesión**. Sin ella, la pantalla se queda congelada
en la elección del último transeúnte hasta que pase otro. La segunda condición
(fotograma ≥ 170) existe para que la regla no dispare durante la propia atracción,
donde por definición nadie está tocando.

El rótulo del pie lo dice en voz alta a propósito: en una pantalla de calle, contar
que va a volver sola es parte de la pieza.

## Emitirla en admira.tv

El canal la reproduce como un item más del bucle, con `type: "interactive"`:

```json
{ "id": "xp-toca-y-elige", "type": "interactive", "title": "Admira · Toca y Elige",
  "url": "https://www.ainimation.studio/xperiencias/toca-y-elige/",
  "tags": ["horizontal"] }
```

`canal.html` la abre en un iframe, la deja tocar y al acabar su tiempo sigue el
bucle. No se precachea —es una página, no un asset— y cada pase estrena el iframe,
así que siempre empieza en su atracción.

**La duración la dice la pieza**, no el item: `plan.json` lleva `durationSeconds: 60`
(el exportador lo pregunta al publicar) y el reproductor lo anuncia por
`postMessage` a quien la emita. Ya no hace falta `dur` en el alta. Ver
[«Admira en 3 pasos»](../admira-en-3-pasos/) para el detalle del contrato.

## Tocarla aquí

```bash
python3 -m http.server 9134
```

y abrir <http://127.0.0.1:9134/xperiencias/toca-y-elige/>.

**Ojo al verificarla:** el reproductor vive en un `requestAnimationFrame`, que el
navegador CONGELA en pestañas ocultas (`document.hidden`). En un panel de vista
previa o en una pestaña de fondo la pieza parece rota y está perfecta: hay que
mirarla en una ventana visible. En los players del canal esto se blinda con
`--disable-background-timer-throttling` y compañía.

El reproductor expone `window.XPERIENCIA` (`goToFrame`, `frame()`, `world`, `plan`,
`rules`) para pilotarla desde la consola o desde el nodo de sala.
