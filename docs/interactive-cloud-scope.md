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

## Aviso de conflicto: validación en vista previa del 22 de octubre de 2026

La combinación comunica los conflictos después de conservar ambas versiones en el almacenamiento local. El Creador muestra: «Conflicto detectado. Se han conservado ambas versiones: la de la nube y una “copia de este equipo” con tus cambios». Si falla después la subida, mantiene esa explicación y añade el error; no presenta una conservación que haya fallado antes de escribir la biblioteca.

Verificado en Safari de un iPhone 17 Pro Max físico, iOS 27.0.1, controlado por Xcode Device Hub y visible en QuickTime, y en Chrome del Mac con emulación desactivada. Vista previa `2241efa`, Worker `e75a4d7f-527d-4111-bfdd-4729b27abe6b`. Se provocó un conflicto en cada sentido usando solo el proyecto de prueba `3ad4fa71-c66b-4613-94d0-d12d10b5ae6d`: el iPhone conservó la copia `4c472ca5-712a-4b65-a6cd-bb3d18bba7f1` y el ordenador `f187caec-cc51-4cb0-a8d8-98c728fce2ec`. El aviso se leyó en el estado de la página y se comprobó visualmente en ambos dispositivos. Las copias quedan conservadas.

Comparación final: los doce registros remotos ajenos al ID de prueba y los registros locales previos ajenos a él permanecen idénticos en todos sus campos; la nube pasó de trece a quince proyectos por las dos copias de conflicto. No se utilizó «Sincronizar biblioteca». Las 113 pruebas de interactivos pasan, incluidas la notificación tras conservar ambas versiones, el fallo posterior de subida y la ausencia de falso conflicto al recibir un cambio remoto sin edición local. Esta aceptación corresponde a la vista previa; la publicación del frontend en producción queda pendiente.

## Comparación de versiones conservadas (vista previa, 22 de octubre)

El aviso ofrece «Comparar versiones conservadas». Un diálogo muestra los dos recorridos y las diferencias de todos los campos del proyecto, incluidos textos, destinos de botones, imágenes y diseño. Cada versión dispone de un botón para abrirla en el editor. Comparar no escribe la biblioteca; abrir cambia únicamente el proyecto activo, sin alterar contenido, revisión ni fecha de ningún registro. Si hay cambios o imágenes pendientes, abrir otra versión queda bloqueado. No hay acciones de borrar, sustituir ni resolver automáticamente.

Los pares se identifican por los IDs comunicados por la combinación, nunca por nombres. Se guardan hasta veinte referencias locales para poder volver a comparar tras recargar; solo se guardan los IDs, sin tokens ni copias de contenido. Se muestran las versiones guardadas actuales. La comparación es local al dispositivo donde se detectó el conflicto; recuperar desde otro dispositivo no inventa relaciones entre proyectos.

Aceptación en Safari de un iPhone 17 Pro Max físico (iOS 27.0.1, Xcode Device Hub y QuickTime) y Chrome del Mac sin emulación, vista previa `a5fd5e7`, Worker `4f07a9bf-e9e3-4ee3-950e-a0b4a1240757`: conflicto en cada sentido exclusivamente sobre `3ad4fa71-c66b-4613-94d0-d12d10b5ae6d`. Copias conservadas: `2fc5925c-82bd-4443-906a-50bfe46545af` en iPhone y `51869fdf-94c8-423a-abef-c03846031ade` en Mac. Se comprobaron ambos textos en la comparación, la apertura de cada ID y la igualdad íntegra de los registros antes y después de comparar y abrir. Tras recargar ambos dispositivos, la comparación vuelve a abrirse y las huellas SHA-256 de sus bibliotecas completas permanecen iguales.

Los dieciséis registros remotos ajenos al proyecto de prueba y los registros locales anteriores ajenos a él permanecen idénticos. La nube pasa de diecisiete a diecinueve registros por las dos copias de conflicto. Las 125 pruebas de interactivos pasan. Esta comparación está comprobada en vista previa y pendiente de publicación en producción.
