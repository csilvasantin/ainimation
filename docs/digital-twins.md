# Digital twins / Gemelos de objetos

Migración desde admira.store, 21-nov-2026. Origen: csilvasantin/admira-store @ 0be8afe6.

ES: `/digital-twins/` reúne Galleon 100 SD, Stream Deck XL, AdmiraNeXT01, AdmiraNeXT05 y el PlayerTaza existente. Director sigue en `/studio.html`; los interactivos de vending, cine y web siguen en `/interactivos/`. Los modelos y medios se copian al repositorio AInimation, con navegación propia. Los PC conservan sus geometrías distintas y reutilizan la simulación existente, ahora estrictamente local. No envían comandos físicos. El stock y las salidas de Admira TV siguen siendo servicios compartidos. El puente de Stream Deck puede requerir CORS; conserva imágenes de respaldo. No se migran sesiones, secretos ni APIs autenticadas de Cloudflare a GitHub Pages. La consola física se abre explícitamente en el dominio original. La importación automática de un proyecto de Director al gemelo no está implementada.

EN: `/digital-twins/` groups the Galleon, Stream Deck, both PC geometries and the existing mug player. Director remains at `/studio.html`; vending, cinema and web interactives remain at `/interactivos/`. Models and media live in this repository. PC previews use the shipped simulation locally and never send physical commands. Stock and Admira TV outputs remain shared services. Stream Deck live reads depend on bridge CORS, with bundled image fallback. Authenticated APIs, sessions and secrets remain on their original Cloudflare host; hardware consoles open explicitly there. Automatic Director project transfer is not implemented.

Machine-readable catalogue: `/digital-twins/catalogue.json`. Tutorial/help ES+EN: `/digital-twins/help/`.
