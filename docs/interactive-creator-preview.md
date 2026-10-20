# Creador de interactivos — primera versión para revisión

Ruta: `/interactivos/`. Acceso desde portada y Author. No publicada en producción.

## Referencia recuperada
Respuesta de Jobs a la consulta #6855, recibida en la bandeja Trinity #6861 el 20-oct-2026. Fuente contrastada: `xperiencias/kiosko-pedido/README.md`, `plantillas/quiosco-de-pedidos.json`, `assets/director-kiosk.js`, main `5261211`.

Jobs identifica el quiosco construido del 7 al 15 de octubre y no encuentra un interactivo de cafetería creado el domingo 18. Atribuye en git la base a Carlos Silva y las ampliaciones a Morfeo, Oráculo y Merovingio. No atribuimos la implementación a los consejeros. A la hora de preparar esta versión no había respuestas adicionales visibles de Wozniak, Lucas o Disney.

El quiosco existente tiene opciones, carrito, voz, cola y pago simulado. Esta nueva superficie reutiliza el recorrido conceptual táctil y la norma de volver al inicio tras inactividad. No incrusta el quiosco ni conecta sus servicios. El nuevo contrato `ainimation-interactive` v1 es independiente del contrato existente `ainimation-project`; no cambia ni sobrescribe proyectos Author.

## Qué revisar

- Abrir la plantilla de cafetería y recorrer bienvenida → carta → elección → cierre → inicio.
- Editar textos, color y formato vertical/horizontal/cuadrado; añadir pantallas y botones, elegir sus destinos y pantalla inicial.
- Recargar: se recupera el borrador de este navegador, almacenado bajo `ainimation:interactive:draft:v1`.
- Guardar JSON, abrirlo de nuevo (con confirmación antes de sustituir), y exportar HTML autónomo.
- El previo embebido usa el mismo reproductor que la exportación. No realiza peticiones ni envía pedidos.
- Cambiar el tiempo de inactividad (15/30/60/120 s) y comprobar vuelta al inicio.

## Límites deliberados de esta revisión

Recorridos táctiles con texto y botones; sin carrito, precios, cobros, cámara, micrófono, IA generativa ni publicación remota. La plantilla no crea comandas. El guardado es por navegador, no en nube. El archivo JSON permite trasladar el trabajo. El HTML puede abrirse sin conexión.

No se puede eliminar la pantalla inicial ni una pantalla a la que todavía apuntan otros botones: se explica qué conexiones cambiar primero. Los archivos inválidos, contratos futuros y fallos de almacenamiento conservan el borrador previo; se informa y no se anuncia un guardado falso. Texto de usuario se trata como texto literal. El reproductor va en un iframe aislado y el HTML exportado bloquea conexiones por CSP.

## Validación

`node --test tests/interactive-project.test.mjs`

Prueba local: `python3 -m http.server 46220 --bind 127.0.0.1`, abrir `http://127.0.0.1:46220/interactivos/`.
