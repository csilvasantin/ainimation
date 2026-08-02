# Xperiencia de ejemplo — «Templo de la Soledad»

Esto **no está escrito a mano**: lo generó AInimation Studio con
**Archivo ▸ Publicar Xperiencia**. Es la salida literal de `assets/publish-xperiencia.js`,
guardada aquí como referencia de la forma que produce el exportador.

```
xperiencia-templo/
├── index.html   ← autocontenido: runtime XPL + reproductor + la pieza incrustados
├── plan.json    ← la pieza (items del Stage, keyframes, marcas del Score)
└── rules.json   ← las reglas XPL, legibles y editables aparte
```

Se despliega dejando la carpeta en `xpaceos/xperiencias/<slug>/` o en cualquier Pages.
`index.html` **no pide nada a `ainimation.studio`**: un kiosko sin más internet que su
media remota lo reproduce igual.

## La pieza

Dos estaciones táctiles y un rótulo, con dos reglas:

| CUANDO | ENTONCES |
|---|---|
| clic en `kryptonita` | saltar a la marca `HOLO` (fotograma 180) |
| clic en `escudo` | saltar a la marca `OUT` (fotograma 240) |

Las reglas desactivadas en el Studio no se exportan: lo que llega a la sala es lo que
está encendido.

## Probarla

```bash
python3 -m http.server 9134
```

y abrir <http://127.0.0.1:9134/examples/xperiencia-templo/>.

El reproductor expone `window.XPERIENCIA` (`goToFrame`, `frame()`, `world`, `plan`,
`rules`) para inspeccionarla desde la consola o pilotarla desde el nodo de sala.

## Lo que el reproductor hace y lo que no

**Sí:** items del Stage (rectángulos, óvalos, líneas, texto) con sus keyframes
interpolados, cast con `src` remoto (imagen y vídeo), transporte por fotogramas con
bucle, y las acciones `goToMarker`, `playSegment`, `showCast`, `hideCast`, `setText`,
`playSound` y `openUrl` sobre los hechos `click`, `hover`, `frame`, `markerReached`,
`idleSeconds` y el reloj.

**No:** nada de autoría (importar, dibujar, editar). Eso es el Studio, y en una sala no
pinta nada.

**Ojo:** la media local (`data:`/`blob:`) no viaja — pertenece al navegador que la
importó. Al exportar se dice cuál se queda fuera; para que viaje, impórtala desde el
Stock. Y saltar a la marca **final** aterriza en ella y acto seguido el bucle reinicia
la pieza: es el comportamiento de atracción de un kiosko, no un fallo.
