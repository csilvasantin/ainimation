# «Quiosco de pedido» — autopedido vertical para tótems Retail OS

Xperiencia vertical **1080×1920** para el tótem de un Xpacio (xpaceos.com / admira.store): el
cliente elige bebida, tamaño, leche y extras en pantalla, revisa el carrito y paga con un **QR**
—o elige *pagar en barra*— y recibe su **número de pedido**. Primer caso: Starbucks · Paseo de
Gracia 103. Genérica para cualquier establecimiento: solo cambia la carta (`menu.<marca>.json`).

> **DEMO SIMULADA.** No hay TPV real ni dinero real. El QR abre `pago-simulado.html`, que
> nunca pide datos de tarjeta: solo marca el pedido como «pagado (simulado)». Precios ficticios.

## Abrirla

`https://www.ainimation.studio/xperiencias/kiosko-pedido/?store=starbucks-paseo-de-gracia&marca=starbucks`

| Parámetro | Qué hace |
|---|---|
| `marca=<id>` | Marca blanca: tokens `--mb-*`, logo y tipografía de `admiranext.com/marcablanca/clientes/<id>.json` |
| `menu=<url>` | Carta a usar (por defecto `menu.<marca>.json`, y si no existe `menu.starbucks.json`) |
| `store=<id>` | Id del local; viaja en cada pedido |
| `lang=es\|en` | Idioma inicial (el botón ES/EN lo cambia en vivo) |
| `avatar=good\|better\|best\|off` | Avatar que toma el pedido hablando (por defecto `good`, Admirito la nube). `off` = quiosco clásico |
| `#clave=<clave>` o `ck=<clave>` | Aprovisiona la clave del quiosco para la cola (se guarda en el dispositivo y se borra de la URL) |

## Flujo y reglas (XPL, `rules.json`)

ATRACCIÓN (bucle) → CATEGORÍAS → PRODUCTO (opciones) → CARRITO (+ sugerencias) → PAGO (QR / barra) → NÚMERO → ATRACCIÓN.

- **La calle no cierra sesión:** 12 s sin tocar (`idle.resetSeconds`) → aviso y vuelta a la atracción
  con el carrito vacío. En PAGO el margen es 60 s (se paga con el móvil, sin tocar el tótem).
- En NÚMERO, a los 12 s vuelve sola.

## Pago simulado

El QR codifica `pago-simulado.html?pedido=<id>&total=<n>&moneda=EUR`. Al confirmar, la página avisa por
`BroadcastChannel("kiosko-pedido")`, `localStorage` y `postMessage` a su padre. Tocar el QR en el
tótem lo abre **dentro** del quiosco (demo con un solo dispositivo).
**Límite conocido:** sin backend, un móvil *distinto* que escanee el QR no puede avisar al tótem;
para eso hará falta un relé (Worker en api.admira.store) o el checkout alojado del proveedor real.
`orderFlow.payment.checkoutUrl` admite cualquier checkout HTTPS alojado (contrato del módulo Payment del Studio).

## Pedir hablando con el avatar (7-oct-2026)

Arriba del tótem (columna izquierda en 16:9 y cuadrado) vive la cara de **digitalavatar.ai** en modo pedido
(`nube.html?embed=1&kiosk=1&mode=order&store=…&brand=…`). El cliente **habla** (🎙, reconocimiento de voz del
navegador; tocar la nube también abre el micro) o **escribe** en la caja del quiosco, o toca una sugerencia; el
quiosco se lo pregunta a la cara con `{type:'da-ask', question, lang}`. «✕ Quitar» la retira y «🗣 Pedir hablando»
(en la cabecera) la vuelve a poner; cada cliente nuevo empieza con la cara por defecto y una conversación nueva.

1. La cara responde `{type:'da-answer', answer, action}`; solo se acepta de **nuestro iframe** y de un origen de
   `pedido-avatar.js` (`https://digitalavatar.ai`, `www.`, el proxy `neo-digitalavatar…workers.dev`; localhost en pruebas).
2. `action = {type:'order-draft', version:1, store, lines:[{id, qty, options}], customerName, ready, missing, summary}`
   es el **pedido acumulado**: se valida contra la carta (ids, opciones, `qty` 1–10, como mucho 10 líneas, nombre con la
   regla de `#custName`), **sustituye** el carrito con un destello en lo que cambia y rellena el nombre. **Los precios
   los calcula el quiosco.** Un grupo que falta (`missing`) se ve como «Leche ?».
3. **El toque manda:** si el cliente está tocando (o configurando un producto), el borrador espera («Admirito tiene
   cambios · Ver»); si cambia el carrito o el nombre con el dedo, el borrador pendiente se descarta y la cara recibe
   `{type:'da-context', order:<borrador actual>}`. Al volver a la atracción o al completar el pedido: `order:null`.
4. Con `ready:true` aparece **«¿Lo confirmo?»** con las líneas, el total y un botón grande **«Confirmar pedido»**.
   **La comanda solo se crea al tocar Confirmar** (o por voz si el cerebro manda `confirmed:true` / `order-confirm`
   con el resumen ya a la vista). Después, el flujo de siempre: QR o pagar en barra → número.

**API pública** (también para el tótem del gemelo): `window.kiosko.fill(draft)` (sustituye el carrito),
`window.kiosko.add({id, qty, options})` (añade una línea), `window.kiosko.avatar.on|off|ask(texto)`, y por
`postMessage` desde el anfitrión: `{source:'admira-avatar', type:'kiosk-fill', draft}` o `{…, type:'kiosk-add', line}`
(solo desde la ventana padre y un origen de la lista). Devuelven `{ok, applied|pending, total, issues, rejected}`.

**Comanda con líneas:** `POST /cola/pedido` lleva `lines:[{id, name, qty, options:{tamano:'grande', leche:'avena',
extras:['shot']}, optionsText:'Grande · Avena · Normal · +Shot extra de espresso'}]` (ids de la carta; textos de la barra
en castellano). La clave del quiosco viaja como `x-cola-clave` solo en `pedido` y `pagar`; la cola devuelve `pago`
(token por pedido), que va en el QR como `&t=` y `pago-simulado.html` lo manda como `x-cola-pago`.

## Demo de pedido: `/demo pedido` (7-oct-2026)

Para presentaciones: se escribe **`/demo pedido`** (o `/demo order`) en la caja del avatar y se pulsa Intro; la segunda
vez la para. Una **clienta simulada** (Lucía / Lucy) pide a Admirito de punta a punta en el idioma activo (ES/EN):

1. Admirito saluda y pregunta. La clienta pide un *caffè latte grande con leche de avena*, añade un *croissant* y da
   su nombre (guion en `demo-pedido.js`, ids reales de la carta). Cada frase suya viaja a la cara como `da-ask`; **las
   respuestas de Admirito son las del cerebro real** en modo pedido y el carrito se llena en vivo con el `order-draft`.
2. Si el cerebro pregunta algo que el guion no cubre (`missing:['leche']`), la clienta lo rellena con lo que quería
   (o el valor por defecto de la carta). Como mucho 6 frases al cerebro; si no se completa o el cerebro falla o calla
   30 s, la demo se para con un aviso.
3. Con `ready:true` sale «¿Lo confirmo?»: la clienta dice «Sí, confírmalo», la demo **toca** «Confirmar pedido» y
   «Pagar en barra» (con un círculo de toque visible) y Admirito cierra con el nombre y el número. La comanda real va a
   la cola de la tienda con el nombre `Lucía - demo` (el relé no tiene campo de vía al crear) y `order.demo = true`.
4. **Bocadillos** con quién habla (Admirito / Clienta · Lucía) y el subtítulo; la frase de la clienta aparece en la caja
   como si la dictara al micro.
5. **Para:** `/demo pedido` otra vez, o **tocar la pantalla** (menos la caja del avatar, donde se escribe el comando) o
   la cara. Corta el audio, limpia el carrito y vuelve a la atracción con una cara nueva.

**Voces.** Durante la demo la cara se queda sin voz propia (`{type:'da-audio', on:false}`: el cerebro tampoco la genera)
y el quiosco pone las dos por un único `AudioContext`, **una sola a la vez**, niveladas por RMS y con compresor, con
pausas de 300–600 ms. Proxy `https://mcp-ainimation.admira.store/voz` (ElevenLabs, caché de 30 días por frase):

| Quién | ES | EN |
|---|---|---|
| Admirito (su voz de siempre: la que el cerebro da a su identidad) | David Martin `Nh2zY9kknu6z4pZy6FhD` | Liam `TX3LPaxmHKxFdv7VOQHJ` |
| Clienta | Daniela `ajOR9IDAaubDK5qtLUqQ` | Sarah `EXAVITQu4vr4xnSDxMaL` |

Las frases fijas (saludo, guion, confirmación, pago) se precargan al arrancar y la siguiente de la clienta mientras habla
Admirito. Si `/voz` no responde, voz del navegador (chica / chico). El Intro que lanza el comando es el gesto que
desbloquea el audio. `window.kiosko.demo.toggle() | stop() | state` para el gemelo y las pruebas.

## Contrato con el anfitrión (gemelo, admira.tv, pantalla.html)

```js
window.parent.postMessage({ source:"ainimation-xperiencia", piece:"kiosko-pedido",
  event:"ready"|"payment"|"order"|"reset", status, order }, <origen del anfitrión>)
```
Solo se envía a un anfitrión permitido (`*.admira.store`, `*.xpaceos.com`, `*.ainimation.studio`, `*.admira.tv`, localhost),
nunca a `"*"`; el origen se toma de `location.ancestorOrigins` (o del Referer).
`order = { id, number:"A012", simulated:true, store, brand, currency, lines:[{id,name,qty,unitPrice,options[]}], total, status:"paid-simulated"|"pay-at-counter", createdAt, paidAt }`

## Carta (`menu.schema.json`)

Ver `menu.schema.json` y [docs/menu-schema.md](../../docs/menu-schema.md). Ilustraciones de `img/` propias
(SVG genéricos), sin imágenes oficiales de la marca.
