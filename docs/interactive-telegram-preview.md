# Telegram → AINimation: vista previa

El bot de Admira no se modifica. BotFather ha rechazado crear otro bot en la cuenta actual por el límite de 20. Carlos ha elegido usar un bot libre y después ha indicado que creará uno llamado ainimation.studio. Falta confirmar su @usuario terminado en bot y disponer de su token en la bóveda como AINIMATION_TELEGRAM_BOT_TOKEN. No pegar secretos en el chat ni en git.

Preparado: bucket R2 privado ainimation-interactive-originals-preview y tablas Telegram en la D1 exclusiva de preview. Interfaz Biblioteca → Telegram. Sin bot configurado, la vinculación permanece desactivada y se explica; el webhook rechaza cualquier petición sin secreto. Producción no se publica.

Flujo: Google verificado → enlace aleatorio de un uso, 10 minutos → /start desde Telegram privado → confirmación de la identidad Telegram en la aplicación → /nuevo Cafetería → hasta 20 documentos PNG/JPEG/WebP de hasta 20 MB → /terminar → Telegram / Revisar subida en la aplicación → miniaturas, orden y nombre → Crear proyecto nuevo → Sincronizar biblioteca. No se añaden imágenes a los proyectos existentes.

Originales R2 sin modificar, huella SHA-256 y tamaño en D1. Descarga únicamente con Google del propietario. Las fotos comprimidas se rechazan con indicación de enviar como Archivo. Edición usa copias optimizadas con referencia al original privado. Bot recibe solo el chat vinculado y no obtiene acceso de lectura a la biblioteca existente. No hay borrado de biblioteca. Actualizaciones de archivo repetidas no duplican elementos y el límite se comprueba al insertar. Webhook serializado con max_connections=1 para respetar el cierre del lote tras los archivos.

Prueba automatizada, no Telegram real: 18 documentos de muestra pasan por el receptor y sus bytes se conservan exactamente; no se escriben proyectos previos; aislamiento de cuentas, vencimiento, confirmación, rechazo de webhook ajeno y de fotos comprimidas, máximo 20 y duplicados. 25 pruebas totales correctas. No se afirma aún prueba real del bot ni vinculación de Carlos.

Activación cuando exista bot libre: ejecutar cloud-library/scripts/connect-telegram-preview.py con el nombre del secreto en la bóveda. Verifica getMe y getWebhookInfo; si el bot tiene otro webhook aborta. Registra solo la URL de preview, no descarta updates pendientes y guarda secretos como secrets del Worker. Se debe revisar previamente el destino: dedicar un bot existente implica que sus futuros mensajes privados los procesará esta integración de prueba.

Prueba real pendiente: vínculo por Carlos, 18 archivos sin comprimir en el bot, comprobación de hashes de originales, revisión en móvil y escritorio, crear entrada nueva y verificar que los proyectos anteriores coinciden antes/después. No finalizar ni publicar mientras falte esa prueba.
