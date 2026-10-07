# Contrato «registro v1» · cola → registro de avatares (7-oct-2026)

GrokBot · MacMini, a petición de Carlos (7-oct, 23:22): todo pedido del quiosco y toda conversación con los
avatares queda en **digitalavatar.ai/metricas** (registro, sesión AdmiraNeXT), para revisar ahí, entre otras
cosas, los pedidos que genera `/demo pedido` (Morfeo) a distintas horas. Propuesto a Morfeo en el encargo #5367.

## Campos opcionales (retrocompatibles)

`POST /cola/pedido` (mcp-ainimation) y `POST brain.digitalavatar.ai/metahuman/ask` aceptan:

| campo | valores | para qué |
|---|---|---|
| `conv` | `[a-z0-9_.-]{6,40}` | id de la conversación con el avatar; enlaza el pedido con su hilo |
| `origen` | `real` · `demo` · `qa` | DEMO y QA salen marcados aparte en el panel (`starbucks-qa` es siempre QA) |
| `demo_run` | `[a-z0-9_.-]{1,40}` | id de la tanda de `/demo pedido` (para filtrar una tanda) |
| `canal` | `kiosko` · `ipad` · `gemelo` · `web` · `movil` · `tv` | de dónde viene |
| `avatar` | `admirito` · `luna` · `neo` | solo en la cola (en el cerebro ya va) |
| `t` | ms epoch | hora SIMULADA, solo con `origen:"demo"` y hasta 7 días atrás: el registro coloca el pedido (y sus fases, desplazadas) a esa hora; la cola sigue en tiempo real |

Las caras de digitalavatar.ai aceptan `?conv=&canal=&origen=&demo_run=` en la URL y los reenvían al cerebro; en
modo pedido (`?mode=order`) sin `?conv=` cada carga del iframe es una conversación nueva.

## Qué hace la cola

En cada alta, pago, avance y llamada, el Durable Object `ColaTienda` empuja la foto del pedido a
`omnipublicity-api` (`POST /registro/pedido`, service binding `OMNI`, cabecera `x-registro-clave` con el secreto
`REGISTRO_KEY`): número, nombre, líneas, total, vía de pago, los campos de arriba y la hora de cada fase
(recibido, en preparación, preparado, recogido; las automáticas, previstas). Sin `REGISTRO_KEY` u `OMNI` no se
envía nada y la cola funciona igual. Reiniciar la cola no borra lo registrado.

## Enlace pedido ↔ conversación

1. `conv` explícito → enlace «conv».
2. Si no: el último turno de la misma tienda con ese nombre de cliente (del borrador `order-draft`) en los 20 min
   anteriores → «nombre (aprox.)».
3. Si no: el último turno con borrador de esa tienda en los 10 min anteriores aún sin pedido → «aproximado».

## Para /demo pedido

- Lo ideal: pasar por el quiosco real o por las API con `origen:"demo"`, un `demo_run` por tanda y un `conv`
  por cliente simulado (el mismo en el iframe del avatar `?conv=` y en `POST /cola/pedido`).
- Para «gente a distintas horas» sin esperar: `t` con la hora simulada (solo `origen:"demo"`).
- Tienda: la de la demo (`starbucks-paseo-de-gracia`) con `origen:"demo"`; las pruebas técnicas, en `starbucks-qa`.
