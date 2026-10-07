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

## Contrato con el anfitrión (gemelo, admira.tv, pantalla.html)

```js
window.parent.postMessage({ source:"ainimation-xperiencia", piece:"kiosko-pedido",
  event:"ready"|"payment"|"order"|"reset", status, order }, "*")
```
`order = { id, number:"A012", simulated:true, store, brand, currency, lines:[{id,name,qty,unitPrice,options[]}], total, status:"paid-simulated"|"pay-at-counter", createdAt, paidAt }`

## Carta (`menu.schema.json`)

Ver `menu.schema.json` y [docs/menu-schema.md](../../docs/menu-schema.md). Ilustraciones de `img/` propias
(SVG genéricos), sin imágenes oficiales de la marca.
