# Recuperación y sincronización por proyecto

La cuenta Google verificada ofrece tres acciones: **Recuperar biblioteca** descarga y combina los proyectos de la nube sin enviar escrituras; **Sincronizar este proyecto** intercambia únicamente el proyecto activo y, si hay conflicto, su copia independiente; **Sincronizar biblioteca** conserva el intercambio completo anterior.

La recuperación mantiene los proyectos locales que aún no se han enviado. Los cambios divergentes se conservan en una copia. La sincronización por proyecto no aplica cambios remotos ni sube cambios locales de los otros proyectos. Ambas operaciones mantienen las bases por cuenta, las revisiones condicionales y el respaldo local de la biblioteca.

Recuperar se bloquea si hay cambios o imágenes pendientes. La apertura de un proyecto y la sincronización ya no vuelven a guardar un activo que no ha cambiado. Tras cada operación se informa si se ha recuperado la biblioteca o sincronizado el proyecto. La recarga conserva los datos locales y requiere verificar Google otra vez para sincronizar: el token sigue solo en memoria.

El módulo de sincronización hereda el sello de versión del Creador para que unos controles nuevos no utilicen una implementación antigua desde el caché HTTP. El constructor del previo incluye los mismos archivos que producción.

Las copias de seguridad se guardan en IndexedDB (`ainimation-interactive-backups`, almacén `libraries`) para que una biblioteca con imágenes no agote la cuota de localStorage al duplicarse. El respaldo anterior se migra antes de retirarlo de localStorage; el respaldo actual queda bajo la clave `ainimation:cloud:backup:<endpoint>` y el migrado bajo esa clave más `:migrated`. Si el archivo falla, no se sustituye la biblioteca ni se sube ningún proyecto. Se vuelve a comprobar la concurrencia después del archivo asíncrono. En entornos sin IndexedDB se mantiene el respaldo anterior en localStorage.

Verificación automática: 57 pruebas, incluido un recorrido de copia de demo ordenador → nube → segundo almacenamiento → edición y sincronización en ambos sentidos. Solo el ID de la copia recibe escrituras; proyectos anteriores y proyectos locales pendientes conservan todos sus campos. También se comprueban el conflicto del proyecto elegido, el rechazo de IDs inexistentes sin llamadas ni escrituras, la recuperación con poco espacio y los fallos o ediciones durante el respaldo.

Las peticiones de sincronización tienen un límite de 30 segundos. Si se agota, se conserva el trabajo local y se ofrece reintentar; una subida de respuesta incierta se resuelve con las revisiones y comparación de contenido al recuperar.

## Comprobación real del 21 de octubre de 2026

Chrome, cuenta Google de Carlos: la copia creada desde la demo se subió desde producción, se recuperó en el origen de vista previa con almacenamiento independiente y se editó allí con ancho de 390 px. La edición llegó a producción mediante «Recuperar biblioteca». Desde el escritorio se restauró el texto original, se sincronizó solo el proyecto y la segunda sesión recibió esa versión. Las revisiones remotas de la copia pasaron de 1 a 2 y a 3, sin crear duplicados.

La recarga de la segunda sesión conservó los once proyectos locales y la copia editable. La reconexión con Google y recuperación también funcionaron a 320 px; los tres controles permanecieron dentro del ancho. La comparación de todos los campos de los nueve proyectos remotos anteriores y de los ocho registros locales previos de la segunda sesión no encontró cambios. El proyecto local pendiente de esa sesión no se subió. El contenido final de la demo coincide con el de antes de la prueba; solo avanzaron sus revisiones.

Se corrigió durante esta revisión un agotamiento real de la cuota de localStorage al duplicar la biblioteca para respaldarla. La recuperación pasó después de migrar el respaldo a IndexedDB. Producción publicó el sello `1f67020`; los procesos de publicación y sellado terminaron correctamente. Los anchos móviles se comprobaron mediante emulación de Chrome en el Mac: no se ha controlado ni verificado directamente un teléfono físico.
