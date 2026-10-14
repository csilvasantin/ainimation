# Confirmación de pedidos del quiosco / Kiosk acknowledgements

## Español

Una sala del gestor no aprovisiona automáticamente el quiosco. Cada quiosco necesita su carta/marca, relé y clave `gk_…` autorizada para esa tienda mediante el procedimiento habitual. Nunca se usa una clave del staff `gc_…` ni de administrador en el navegador para sustituir esa autorización.

La carta `menu.admiranext.json` prepara la sala `admiranext-demo` con la marca AdmiraNeXT, café y croissant de ejemplo, precios ficticios, ES/EN y pago simulado. La entrada candidata es `/xperiencias/kiosko-pedido/?marca=admiranext&store=admiranext-demo&avatar=off`. La carta no incorpora ninguna clave ni publica el quiosco; el alta sigue cerrada hasta su aprovisionamiento.

El alta debe responder con el ID exacto, número y token específico del pedido antes de mostrar un QR. Si falla, se conserva el mismo pedido para reintentar durante esa visita; no se genera un número local ni se confirma el pago. No se promete recuperación del borrador tras cerrar o recargar la página.

El móvil confirma exclusivamente el pago simulado de un pedido existente con su token. No crea otro pedido. Emite notificaciones sólo después del ACK del relé con ID exacto y estado pagado reconocido. El quiosco trata esas notificaciones como pistas: consulta el pedido y sólo finaliza si el servidor confirma que ya está pagado; no inicia un pago por recibir un mensaje. La acción explícita de caja conserva su operación y exige ACK.

Caso real detectado en admiranext-demo: el quiosco mostraba A001 aunque el relé devolvía pedido no encontrado (404). El gestor y la pantalla no recibían la comanda. La corrección impide esa confirmación falsa, pero no provisiona claves ni acredita funcionamiento físico o voz audible.

## English

A queue-manager room does not automatically provision a kiosk. Each kiosk requires its configured menu/brand, relay and authorized per-store `gk_…` kiosk key through the normal process. Staff `gc_…` and administrator keys must never substitute kiosk provisioning in the browser.

The `menu.admiranext.json` menu prepares the `admiranext-demo` room with AdmiraNeXT branding, sample coffee and croissant, fictitious prices, ES/EN and simulated payment. The candidate entry is `/xperiencias/kiosko-pedido/?marca=admiranext&store=admiranext-demo&avatar=off`. No key is embedded and no kiosk is published; creation stays protected until normal provisioning.

The create acknowledgement must include the exact ID, queue number and order-specific payment token before the QR is shown. Failure preserves the same order for retry during that visit, without a local number or payment success. Draft recovery after closing/reloading is not claimed.

The mobile page pays only an existing order using its specific token. Notifications follow an acknowledgement with the exact ID and an acknowledged paid state. Kiosk notifications trigger a read of the order, never a new payment write. Only the explicit counter action retains its payment operation, requiring a valid acknowledgement.

The verified admiranext-demo defect showed A001 even though the relay had no order (404), and neither the manager nor the public display received it. This patch prevents false success; it does not provision keys or verify physical/audible output.

## Verificación / Verification

`node --test xperiencias/kiosko-pedido/queue-ack.test.mjs`

`PLAYWRIGHT_PATH=/path/to/playwright node tools/review-kiosk-queue-ack.mjs`

The browser review overlays this checkout's kiosk/payment sources on public static assets. Relay responses are explicitly simulated (401 and valid acknowledgements), labelled as isolated, and all other writes are blocked. It checks both languages, rejected create/payment, retry with the same ID, spoofed notification not initiating payment, and a server-issued number. It never validates production provisioning or writes real orders.
