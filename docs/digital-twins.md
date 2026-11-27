# Digital twins / Gemelos de objetos

Migración desde admira.store, 21-nov-2026. Origen: csilvasantin/admira-store @ 0be8afe6.

ES: `/digital-twins/` reúne Galleon 100 SD, Apple Watch Ultra, iPhone Pro Max, SY11-ab (tinta electrónica), Samsung Galaxy Fold, el trío, Stream Deck XL, AdmiraNeXT01, AdmiraNeXT05 y el PlayerTaza existente. Director sigue en `/studio.html`; los interactivos de vending, cine y web siguen en `/interactivos/`. Los modelos y medios se copian al repositorio AInimation, con navegación propia. Los PC conservan sus geometrías distintas y reutilizan la simulación existente, ahora estrictamente local. No envían comandos físicos. El stock y las salidas de Admira TV siguen siendo servicios compartidos. El puente de Stream Deck puede requerir CORS; conserva imágenes de respaldo. No se migran sesiones, secretos ni APIs autenticadas de Cloudflare a GitHub Pages. La consola física se abre explícitamente en el dominio original. El Galleon recibe ahora el Stage de Director en directo mediante un iframe del mismo origen; no se publica ni se envía al hardware.

EN: `/digital-twins/` groups the Galleon, Stream Deck, both PC geometries and the existing mug player. Director remains at `/studio.html`; vending, cinema and web interactives remain at `/interactivos/`. Models and media live in this repository. PC previews use the shipped simulation locally and never send physical commands. Stock and Admira TV outputs remain shared services. Stream Deck live reads depend on bridge CORS, with bundled image fallback. Authenticated APIs, sessions and secrets remain on their original Cloudflare host; hardware consoles open explicitly there. Galleon now receives live Director Stage frames through a same-origin iframe; this does not publish or send to hardware.

Machine-readable catalogue: `/digital-twins/catalogue.json`. Tutorial/help ES+EN: `/digital-twins/help/`.

## Director → Galleon (21-nov-2026)

Entry: `/studio.html?twin=galleon-100#workspace`. `assets/director-twin.mjs` maps the current Stage into a 720×384 LCD and 480×640 mosaic (12×160px keys). Surface and contain/cover settings persist in `plan.digitalTwin`; Stage size remains explicit. Rendering reuses `drawStageDomFrame`, the video exporter renderer. Strict same-origin, parent/child identity and per-opening session token bind frame requests; one in-flight composition with retry, transferred ImageBitmaps closed after drawing. Embedded mode disables Admira TV subscriptions and importer, and never sends hardware commands. Close releases the iframe and stops playback started inside this preview. Text/shape demo appends to the existing project and participates in Undo. See ES/EN tutorial for limits.

## Inventario y cierre de los gemelos de objetos (27-nov-2026)

Trece objetos en `/digital-twins/catalogue.json` (campo `updated`), cada uno con su carpeta, su ficha en el índice, su
entrada en `sitemap.xml`, su sección ES + EN en `/digital-twins/help/` (anclas `#<id>` y `#<id>-en`, enlazadas desde la
barra `twin-nav.js`) y su test. `tests/digital-twins-inventario.test.mjs` comprueba que las cinco cosas sigan alineadas.

| id | Objeto | Modo | Físico / estado | Test |
|---|---|---|---|---|
| `galleon-100` | Corsair Galleon 100 SD | playlist + Stage de Director en directo (iframe mismo origen) | consola admira.store/objeto/galleon-100 (LCD y 12 teclas capturadas) | director-twin |
| `apple-watch-ultra` | Apple Watch Ultra | playlist + control cruzado | app watchOS · `/api/apple-watch-state` | apple-watch-twin |
| `iphone-pro-max` | iPhone Pro Max | playlist + control cruzado, casi al fotograma | app iOS AdmiraPhonePlayer · `/api/device-state` | iphone-twin |
| `eink-sy11-ab` | SY11-ab tinta electrónica | previo del espejo iPhone · Galleon | puente MacStudio BLE · `api.admira.store/signage/now` | eink-sy11-twin |
| `galaxy-z-fold5` | Galaxy Z Fold5 | objeto articulado + observación USB externa | player nativo `fold-carlos-pruebas` | fold5-controls, test_fold5_usb_observer.py |
| `samsung-fold` | Galaxy Fold | playlist + control cruzado, offline en el teléfono | web app `fold.html?device=1` | samsung-fold-twin |
| `iphone-duo` | iPhone Duo · ThinkPad X1 | 3D, playlist y teclado | app WindowsiOS · `admira.tv/api/twin-sync` | iphone-duo-twin, -esc-windows, -telemetria |
| `iphone-duo-fisico` | iPhone Duo | 3D, playlist y teclado táctil | mismo Duo · `twin-sync` | iphone-duo-fisico-twin |
| `trio` | Trío reloj + iPhone + Fold | pared: sincronizados / extendidos | `/api/wall?group=trio` | trio-twin |
| `stream-deck` | Stream Deck XL | en vivo con foto de respaldo; REPOSO | espejo `admira.store/objeto/stream-deck/api`; control con sesión en AdmiraDesk | stream-deck-control |
| `admiranext01` | AdmiraNeXT01 (METAHUMAN) | **en vivo o simulación local** | `admira.store/supercomputer/api` (hoy exige sesión: arranca en simulación) | digital-twins-inventario |
| `admiranext05` | AdmiraNeXT05 (PC-Cocina) | **en vivo o simulación local** | `admira.store/supercomputer/pc-cocina/api` (mirar público, pase para mandar) | digital-twins-inventario |
| `taza` | PlayerTaza | player existente | `/taza/` | — |

Cambios de este cierre:

- **AdmiraNeXT01 en vivo como el 05.** El gemelo tenía `SIM=true` fijo y la casilla «solo gemelo». Ahora lee
  `https://www.admira.store/supercomputer/api` (estado y miniaturas sin cookies), pide el pase a admira.store en una
  ventana para mandar escena o luz (`admira:supercomputer:pase`, máquina `metahuman`) y cae a simulación, arrancando de
  lo último que hacía la máquina, si el PC no está en línea o la nube no contesta. **Depende de admira-store:** esa API
  todavía contesta 401 sin CORS desde este dominio (la de PC-Cocina ya está abierta, commit 5c6e3ae1 de admira-store);
  hasta que se abra igual para METAHUMAN el gemelo sigue en simulación, sin romperse.
- **Catálogo completo**: `help`, `tests`, `state`/`pass`/`physical` donde faltaban, modos reales de los PC
  (`live-or-local-simulation`), Stream Deck con espejo, control y límites, Duo con `twin-sync`.
- **Ayuda** con índice de objetos y seis secciones nuevas (Duo ×2, Stream Deck XL, AdmiraNeXT01, AdmiraNeXT05, Taza)
  en ES y EN; el párrafo de los PC ya no dice que sean solo simulación.
- **Barra común**: «Ayuda / Help» abre la sección del gemelo en el que estás.
- **Índice** y **sitemap**: fichas de los PC al día, descripción con los trece objetos, y los seis URL que faltaban
  (reloj, iPhone, tinta, Fold, Trío, ayuda).

EN: Thirteen objects, each with a folder, an index card, a sitemap entry, an anchored ES + EN help section and a test;
`tests/digital-twins-inventario.test.mjs` keeps them aligned. AdmiraNeXT01 now mirrors AdmiraNeXT05's live mode (public
watch + admira.store pass to send, simulation fallback) and will go live as soon as admira.store opens
`/supercomputer/api` to this origin like it did for PC-Cocina.
