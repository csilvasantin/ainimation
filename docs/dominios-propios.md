# Sacar el navegador de `*.workers.dev` (C1)

## El problema

Los ISP españoles **bloquean `*.workers.dev` en el navegador**. El worker responde
perfectamente por `curl`, pero una visita desde España ve la función caída:

| Dónde | Llamada | Qué se rompe |
|---|---|---|
| `studio-live.html` | `ainimation-studio.csilvasantin.workers.dev` | **el Studio Live entero** (encolar, seguir el render, galería, vídeo) |
| `assets/app.js` | `pixer-eleven.csilvasantin.workers.dev` | importar del Stock y publicar al Stock |

## Lo que ya está hecho (en el código)

Las dos páginas prueban **primero un dominio propio** y se caen al de siempre si
aquel todavía no responde. No hay día D: hoy funciona igual que antes, y el día que
se cree la ruta empieza a usarse sola, sin tocar código ni desplegar nada.

- `studio-live.html` → `https://api.ainimation.studio`, y si no, `…workers.dev`.
  La base elegida se cachea en `sessionStorage` para no sondear en cada llamada.
  Un dominio que existe pero **no** tiene ruta de Worker contesta una página de
  error HTML: por eso no basta con que responda, tiene que responder **JSON**.
- `assets/app.js` → `https://api.pixeria.com` delante de `…workers.dev`, en las
  listas `admiraStockEndpoints` y `admiraStockExportEndpoints`, que ya se recorrían
  en orden hasta que una contesta.

## Lo que FALTA (y no puedo hacer yo)

El token de la Cúpula **puede DNS pero no rutas de Workers** (`/workers/routes`
devuelve `Authentication error`). Y crear solo el DNS sería peor que no hacer nada:
el subdominio resolvería a Cloudflare y devolvería una página de error.

Hacen falta **dos cosas por cada servicio**, con credenciales que sí puedan Workers
(el panel de Cloudflare, o `wrangler` desde el Mac Mini):

### 1 · AInimation Studio → `api.ainimation.studio`

Zona `ainimation.studio` (Cloudflare, cuenta `csilvasantin@gmail.com`).

```bash
# a) registro DNS proxied (el contenido da igual: lo sirve el Worker)
wrangler dns record create ainimation.studio --type AAAA --name api --content 100:: --proxy
# b) ruta del Worker
wrangler deploy --route "api.ainimation.studio/*"   # desde el repo del worker ainimation-studio
```

o, en `wrangler.toml` del worker:

```toml
routes = [{ pattern = "api.ainimation.studio/*", zone_name = "ainimation.studio" }]
```

> **Por qué un subdominio y no `www.ainimation.studio/api/*`:** el worker devuelve
> también rutas de vídeo cuyo prefijo no controlamos (`s.video`), así que una sola
> ruta comodín sobre un subdominio lo cubre todo. Con paths habría que ir añadiendo
> una ruta por prefijo y algún día se olvidaría uno.

### 2 · Stock de Pixeria → `api.pixeria.com`

Zona `pixeria.com` (Cloudflare, misma cuenta).

```toml
routes = [{ pattern = "api.pixeria.com/*", zone_name = "pixeria.com" }]
```

más su registro DNS proxied `api`, igual que arriba.

## Cómo comprobar que ha quedado bien

```bash
curl -sS -m 10 -o /dev/null -w "%{http_code} %{content_type}\n" https://api.ainimation.studio/api/gallery
```

Tiene que dar `200 application/json`. Si da `200 text/html`, el DNS está pero la
**ruta del Worker no**: el código lo detecta y se sigue cayendo al respaldo (bien),
pero el bloqueo en España sigue sin arreglarse.

Desde el navegador, en `studio-live.html`:

```js
await workerReady   // → la base que se está usando de verdad
```

## Estado

**El bloqueo en España NO está arreglado todavía.** Lo que está hecho es que se
arregle solo, sin otro cambio de código, en cuanto existan las dos rutas.
