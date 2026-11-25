# Xperiencias en Admira Director · v1 / Xperiences in Admira Director · v1

DeepAgent Neo, 25-nov-2026. Encargo de Carlos: «la unión de los 2 mundos, ainimation.studio y
admira.live/win95: esa experiencia (una especie de sistema operativo) se tiene que poder
mejorar/ajustar/editar desde el Admira Director».

## ES

### Qué es

Una **Xperiencia** es una página viva que vive en otra casa (la primera: **Vuelta al 95**, el
Windows 95 de `https://www.admira.live/windows95`) y que publica un **esquema de ajuste**: qué
partes de su configuración se pueden tocar y con qué límites. Admira Director tiene desde hoy una
ventana **Xperiencia** (Window → Xperiencia, acoplada a la derecha) que abre esa página en una
ventana propia, recibe el esquema y el ajuste vigente, pinta el formulario y devuelve los cambios.

### Cómo se usa

1. En `/studio.html`, ventana **Xperiencia** → elige «Vuelta al 95» → **Abrir Xperiencia**. Se abre
   `admira.live/windows95` en una ventana aparte (si no has entrado en admira.live, entra ahí con
   tu Google; el Director no ve credenciales).
2. El formulario aparece solo: General (visita, segundos de demo, fondo, pantalla de carga, vídeo de
   2026), Nombres de los programas, Windows Media Player (hashtags del Stock, rotación), Winamp
   (pistas: artista, título, estilo sintetizado, BPM, MP3 opcional) e ICQGram (en línea, respuestas
   rápidas, contactos de la demo).
3. **Aplicar (reinicia el 95)**: el 95 se reinicia con el borrador en esa ventana; nada se guarda.
4. **Guardar en admira.live**: la página guarda el ajuste en `/api/win95/ajuste` con la sesión de
   la persona. Desde ese momento el 95 arranca con ese ajuste en cualquier navegador que entre.
5. **Deshacer** vuelve a lo recibido; **Valores de fábrica** borra lo guardado (pide confirmación).

Sólo viaja lo que difiere de fábrica: lo que no tocas sigue mandando el HTML de la Xperiencia.

### Contrato (postMessage, prefijo `admira:xperiencia:`)

| Quién → quién | Tipo | Carga |
|---|---|---|
| Director → página | `hola` / `estado?` | `{id}` — pide el estado |
| página → Director | `hola` | al cargar, tras fundir el ajuste |
| página → Director | `estado` | `{esquema, fabrica, guardado, ajuste, at, by, borrador, titulo, url}` |
| Director → página | `aplicar` | `{ajuste}` → borrador en `sessionStorage` y `location.reload()` |
| Director → página | `guardar` | `{ajuste}` → `PUT /api/win95/ajuste` con la cookie de la página |
| Director → página | `restaurar` | `DELETE /api/win95/ajuste` |
| Director → página | `descartar` | quita el borrador y reinicia |
| página → Director | `aplicando` / `guardado` | `{ok, at, by, errores[], restaurado?}` o `{ok:false, error}` |

Seguridad: el Director sólo escucha a la ventana que abrió y desde el origen de la Xperiencia
(`https://www.admira.live`); la página sólo escucha a `window.opener` y a los orígenes
`https://www.ainimation.studio` / `https://ainimation.studio` (la URL de apertura lleva
`?director=1&origen=…` para saber a quién contestar). Se usa ventana y no iframe porque la cookie
de la puerta de admira.live es `SameSite=Lax`. Guardar exige sesión de Google del mismo origen
(anti-CSRF); la cookie de agente sólo lee. El esquema y el saneado viven en
`32.-ConsejoAdmiraNextGame/win95-ajuste-lib.mjs`; lo inválido se descarta con motivo y el Director
lo cuenta.

### Añadir otra Xperiencia

En `assets/xperiencia-ajuste.mjs`, `XPERIENCIAS` lleva `{id, nombre{es,en}, url, origen}`. La
página nueva debe contestar al contrato de arriba y publicar su esquema con los tipos
`text · number · bool · select · image · tags · list` (ver el esquema del 95 como ejemplo).

## EN

A **Xperience** is a live page hosted elsewhere (first one: **Back to 95**, the Windows 95 at
`https://www.admira.live/windows95`) that publishes a **settings schema**. Admira Director now has an
**Xperience** window (Window → Xperience, docked right) that opens that page in its own window,
receives schema and current settings, renders the form and sends changes back.

Use: pick «Back to 95» → **Open Xperience** (sign in to admira.live there if asked; Director never
sees credentials) → edit General, program names, Windows Media Player hashtags, Winamp tracks and
ICQGram → **Apply (reboots the 95)** previews the draft in that window; **Save to admira.live**
persists it through `/api/win95/ajuste` with the person's session, so every browser boots the 95
with it; **Undo** and **Factory values** as named. Only values that differ from factory travel.

Contract and security as in the ES table: postMessage with prefix `admira:xperiencia:`
(`hola`, `estado?`, `estado`, `aplicar`, `guardar`, `restaurar`, `descartar`, `aplicando`,
`guardado`); the Director trusts only the window it opened at the Xperience origin; the page trusts
only `window.opener` from `www.ainimation.studio`. A window, not an iframe, because admira.live's
gate cookie is `SameSite=Lax`. Saving requires a same-origin Google session; agent cookies are
read-only. Schema and sanitising live in `win95-ajuste-lib.mjs` (admira.live repo).

To add another Xperience, append it to `XPERIENCIAS` in `assets/xperiencia-ajuste.mjs` and make the
page answer the contract with a schema using the field types `text · number · bool · select · image ·
tags · list`.
