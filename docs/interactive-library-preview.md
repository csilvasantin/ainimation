# Biblioteca de proyectos interactivos — vista previa

La biblioteca usa `ainimation:interactive:library:v1`, independiente del borrador antiguo `ainimation:interactive:draft:v1`. En su primera carga copia un borrador antiguo válido como primer proyecto y deja la clave original intacta. No cambia ni sobrescribe proyectos de Author.

Cada registro tiene un identificador estable, revisión, fecha y proyecto completo. Nombre, pantallas, botones y formato se guardan por proyecto. «Nuevo proyecto», importar JSON y crear desde plantilla añaden una entrada nueva; «Duplicar» copia los datos con un identificador nuevo y nombre diferenciado. Abrir recupera la entrada y la recarga recupera el último proyecto activo. «Renombrar» funciona para cualquier entrada.

Antes de cambiar de proyecto o crear una copia se intenta guardar el proyecto actual. Si sus datos son inválidos, falla el almacenamiento o ha cambiado en otra pestaña, no se cambia de proyecto ni se sobrescribe la versión anterior. El usuario puede descargar el trabajo como JSON. No se eliminan proyectos automáticamente ni se incluye borrado en esta versión. Límite: 100 proyectos sin expulsión de entradas previas.

Se validan toda la biblioteca y cada proyecto antes de escribir. Datos corruptos, parciales o futuros se conservan. Las revisiones impiden que un editor que tenga una copia obsoleta sobrescriba otra pestaña; el evento storage avisa de cambios. La operación de lectura y escritura es síncrona dentro de cada pestaña (no es una base de datos con transacciones entre procesos). La biblioteca es local al navegador y origen, sin sincronización en nube. Se mantienen importación/exportación JSON y HTML autónomo.

Pruebas: `node --test tests/interactive-*.test.mjs` (11). Cubren migración idempotente, independencia, creación/recuperación, duplicado/renombrado, cambios en otra pestaña, datos incompatibles, cuota y las pruebas del reproductor existente.

No publicar sin revisión de Carlos. La vista previa tiene su propio origen; no lleva automáticamente los proyectos guardados en ainimation.studio. Se pueden trasladar con «Guardar archivo» y «Abrir proyecto».
