# Recrear un interactivo desde una URL — MVP (vista previa)

Pega la URL de una web (carta de cafetería, quiosco, menú…) y obtén una cápsula
interactiva táctil para mupi/quiosco, importable en el Creador de interactivos.

```
node tools/url-a-interactivo.mjs https://coffeeloverspoint.com/cartamadrid/ [carpeta]
```

Flujo: Chromium headless abre la URL → cierra banners de cookies → extrae título,
descripción, secciones (h1–h4 y paneles de pestañas) con sus elementos y precios →
captura la portada (JPEG ≤ 800 KB) → `assets/interactive-from-url.mjs` construye un
proyecto `ainimation-interactive` v1 (inicio con captura → índice paginado de ≤5
secciones + «Más» → una pantalla por sección con «Lo quiero / Volver» → final) →
`validate()` + `playerHtml()` de `interactive-project.mjs`.

Salida por URL (`examples/desde-url/<host>/`):
- `estructura.json` — lo extraído (auditable).
- `proyecto-portrait.json` / `proyecto-landscape.json` — «Abrir proyecto» en `/interactivos/`
  (1080×1920 y 1920×1080), de ahí «Afinar en Director» o «Enviar a Xpacio».
- `capsula-portrait.html` / `capsula-landscape.html` — cápsula autónoma (CSP cerrada, sin red).
- `capturas/` — recorrido inicio → carta → Cafés → final en ambos formatos.

Reglas: si hay secciones con precio, se descartan las demás (contacto, legal, redes).
Máx. 10 secciones, 6 botones/pantalla, 480 caracteres por pantalla. El campo
`source {kind:'url', url, capturedAt}` deja constancia del origen.

Límites conocidos: cartas en pestañas cargadas por JS sin `role=tabpanel` (p.ej.
postresdelvalle.es) salen como una sola sección; webs con login/captcha no se
procesan; no se copian imágenes de producto (solo la captura de portada); no hay
botón en la UI todavía (CLI). Pruebas: `node --test tests/interactive-from-url.test.mjs`.
No publicar sin revisión de Carlos: el contenido y las marcas son de terceros.
