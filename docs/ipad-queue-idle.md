# iPad Starbucks · Admirito completo / Full-screen Admirito

## Español

Sin pedidos en Recibido, En preparación ni Preparado, Admirito ocupa toda la pantalla del iPad. Al llegar un pedido reaparecen las tres fases; al recogerse el último vuelve al avatar completo. Una pérdida de conexión conserva el último estado conocido. /ipad cola activa la cola, /ipad abrir la amplía (también doble clic), /ipad off recupera la playlist. Los previos de Pixeria conservan prioridad. La vista de escena no activa voz propia; la voz ampliada requiere un toque. Las pruebas usan starbucks-qa, sin alterar la cola real de Carlos.

## English

With no Received, Preparing or Ready orders, Admirito fills the iPad screen. Any active order restores all three phases; collecting the last order restores the full avatar. A connection failure retains the last known state. /ipad cola enables the queue, /ipad abrir expands it (also double-click), /ipad off restores its playlist. Pixeria previews retain priority. Scene mode has no independent voice; expanded voice requires a user gesture. Tests use starbucks-qa without changing Carlos’s live queue.

## Contrato compartido / Shared contract

- Device: `starbucks-ipad-01` / `PDG103-IPAD-01`; venue `alsea-sbux-021`.
- Queue page: https://www.ainimation.studio/cola/ipad.html?store=starbucks-paseo-de-gracia
- Read-only relay: https://mcp-ainimation.admira.store/cola/estado?store=starbucks-paseo-de-gracia ; arrays `recibido`, `preparando`, `listo`. Empty means all three arrays are empty, not merely no ready orders.
- Source: `ainimation/cola/ipad.html` (Matrix iframe and expanded view); `admira-xp/scripts/ipad-cola.js` (Good/Better/Best canvas adapter).
- Native avatar URL: `https://digitalavatar.ai/nube.html?embed=1&kiosk=1&avatar=admirito&tier=good&sector=retail&audio=off`. Embed removes the console/header and fills the stage; kiosk hides the avatar evolution selector.
- Queue UI state: body class `ipad-idle`; iframe is retained through transitions, no avatar reload. The DEMO notice remains overlaid. No browser Fullscreen API is invoked.
- Storage `xpace:ipad-cola`: missing=ON, off=playlist. Matrix iframe has `escena=1` and cache token `v=ipad-idle-20261007`. Preserve mapped corners and independent playlist channel `ipad`.
- Regression: empty → received → preparing → ready → empty; disconnection while active; portrait/landscape layout; Pixeria override; /ipad off. Test orders must use `starbucks-qa`, never create automated orders in `starbucks-paseo-de-gracia`.
- Local simulated UI, no payments or physical iPad installation. Real voice and hardware delivery require separate acceptance.

## handON · 2026-10-07

Recovered current Store main with native Store walkthrough, local demos, kiosk messages, three-phase queue and mug project association. Portable Agora handoff is historical; current repository and live queue page were inspected. Initial defect confirmed in the public page: empty columns consumed 595 of 1280 px and avatar used kiosk console. This change supplies full-screen idle mode in both rendering paths.
