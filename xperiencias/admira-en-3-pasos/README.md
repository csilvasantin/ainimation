# «Admira en 3 pasos» — un minuto que se cuenta solo y se puede saltar

Xperiencia generada con **AInimation Studio** (`Archivo ▸ Publicar Xperiencia`).
Segunda plantilla del catálogo, y la que estrena la **duración declarada**: la pieza
dice cuánto le pertenece la pantalla y el canal la obedece.

## Qué es

Un explicador de 3 cartelas que **avanza solo** — si nadie toca, la pantalla cuenta
la historia entera — y que **se puede saltar**: la barra de abajo (1 · 2 · 3) está
viva todo el rato, también encima de las cartelas, así que quien pasa entra por
donde quiere.

Es el patrón contrario al de [«Toca y Elige»](../toca-y-elige/), y por eso está:
allí la pantalla espera a que la toquen, aquí no espera a nadie.

| Tramo | Fotogramas | Qué se ve |
|---|---|---|
| Portada | 1–97 | «ADMIRA EN 3 PASOS» |
| Paso 1 · SE CREA | 110–260 | cómo se monta la pieza |
| Paso 2 · SE EMITE | 300–450 | cómo entra en el bucle |
| Paso 3 · SE TOCA | 490–640 | quién decide qué se ve |

La vuelta entera son ~21 s; con 60 s de pantalla da unas tres vueltas, que es lo que
hace falta para que alguien que llega a mitad la vea completa.

## Las reglas (XPL)

| CUANDO | ENTONCES |
|---|---|
| clic en `ir-1` / `ir-2` / `ir-3` | saltar a ese paso y reproducirlo entero |
| se llega a `FIN-PORTADA` | encadenar el paso 1 |
| se llega a `FIN1` / `FIN2` | encadenar el paso siguiente |
| se llega a `FIN3` | volver a la portada |
| 20 s sin tocar **y** fotograma ≥ 110 | volver a la portada |

Las cuatro reglas de encadenado son las que hacen que **no haga falta tocar**. La
última sigue siendo la regla de señalética: si alguien salta al paso 3 y se va, la
pantalla no se queda ahí colgada.

## La duración

`plan.json` lleva `durationSeconds: 60`. El exportador **lo pregunta al publicar**
(un minuto por defecto) y el reproductor lo **anuncia** a quien la emita:

```js
window.parent.postMessage({ source:"ainimation-xperiencia", event:"duration", seconds:60 }, "*")
```

`canal.html` (admira.tv r55) escucha ese mensaje **solo del iframe que está en
antena**, lo acota a 5–600 s y rearma su reloj. Así la duración deja de teclearse
dos veces: la decide quien monta la pieza, que es quien sabe cuánto hay que mirarla.
Si el operador quiere mandar por encima, el item del stock puede llevar `durLock:true`.

## Emitirla

```json
{ "id": "xp-admira-3-pasos", "type": "interactive", "title": "Admira en 3 pasos",
  "url": "https://www.ainimation.studio/xperiencias/admira-en-3-pasos/",
  "tags": ["horizontal"] }
```

Sin `dur`: ya no hace falta, lo dice la pieza.

## Tocarla aquí

```bash
python3 -m http.server 9134
```

→ <http://127.0.0.1:9134/xperiencias/admira-en-3-pasos/>

**En ventana visible.** El reproductor vive en un `requestAnimationFrame` y el
navegador lo congela en pestañas ocultas: en un panel de vista previa la pieza
parece rota estando perfecta.
