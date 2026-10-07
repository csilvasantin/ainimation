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
