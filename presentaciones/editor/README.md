# Afinar sites y presentaciones

`/presentaciones/` es la entrada al inspector; `/presentaciones/editor/` mantiene
la misma interfaz como ruta directa. El reproductor anterior se conserva en
`/presentaciones/reproductor/`.

Las dos muestras ficticias permiten texto, color y posición, comparación,
deshacer/rehacer y descarga de ajustes. Conservan un borrador independiente en
la pestaña; recargar los reinicia. Descargar no guarda en el origen.

Conectar presentación real abre el laboratorio privado del generador. El
inspector recibe una proyección de textos de audiencia vinculados a una revisión.
Las credenciales y el guardado permanecen en el origen. El canal comprueba
ventana, origen y nonce; una confirmación sólo se acepta para la petición en
curso, una revisión nueva y los valores exactos enviados. No hay guardado directo
desde una URL ni una importación de cualquier site sin conector autorizado.

El conector real permite textos y miniaturas, conserva una versión anterior, sincroniza
los idiomas de las escenas usando el editor nativo y confirma por relectura. Su vista de contenido
es orientativa; el diseño original, medios, decks y comportamientos se conservan
en el generador. Los colores y posiciones de las muestras no se prometen como
ajustes guardables en ese origen. Un conflicto mantiene el borrador.

Escritorio/Móvil sólo modifica el canvas interno. El preview usa DOM/textContent,
sin ejecutar HTML importado. La siguiente conexión para sites necesita su fuente
editable y una confirmación de guardado del adaptador correspondiente.

## Miniaturas de todas las propuestas

Cada proyecto del inspector incluye una miniatura 16:9. El catálogo privado del
generador muestra una composición por propuesta sin migraciones ni escrituras
masivas. Usa la imagen de portada existente cuando está disponible; sin ella
ofrece una ilustración inicial de Órbita, claramente seleccionable y sustituible
por la portada del origen. Esto no genera automáticamente una ilustración única
por cliente ni llama a un proveedor de imágenes durante la carga.

El titular, antetítulo, color y composición de la miniatura son independientes
del guion. Se editan, comparan y deshacen con el mismo núcleo. El JPG exportado
mide 3840×2160 y se comprime bajo 2 MB. El render usa Canvas; no ejecuta contenido
importado. La miniatura real se guarda por idioma en ideas.thumbnails, con revisión,
versiones antes/después y relectura. Los guardados normales del guion y su
regeneración conservan esos diseños. La traducción de escenas no traduce
automáticamente el titular de una miniatura ajustada en otro idioma.

Las imágenes privadas las lee el generador con su sesión y transmite sólo
copias JPEG limitadas al editor por el canal autorizado. No se transmiten cookies,
tokens ni notas. Las referencias guardadas se limitan a assets de la propia
presentación o a la ilustración inicial. Si falta el asset, el preview lo avisa
y la exportación no sustituye silenciosamente una imagen que falte.

Las miniaturas también admiten imágenes y logotipos independientes de la biblioteca
privada aprobada del propio cliente. No se asignan a las láminas al usarlas aquí.
El logotipo conserva sus proporciones, se coloca arriba a la derecha y puede
mantener su color original o usar una máscara blanca sobre transparencia. La
fuente opcional Fira Sans 900 se sirve desde assets propios con licencia OFL.
Los diseños anteriores se normalizan a fuente del sistema y sin logotipo,
conservando sus valores originales.

## Comparar revisiones en un conflicto (incremento en borrador)

Cuando el conector devuelve otra revisión, el inspector mantiene su original,
su borrador y su historial. La revisión del origen se muestra aparte: las tres
miniaturas usan sus propios recursos, y los campos se clasifican como ajustes
distintos, sólo del borrador, sólo del origen o coincidentes. Los componentes
retirados, los contratos modificados y los bindings de diapositivas diferentes
se marcan como no comparables. También se conservan los metadatos fuera de los
campos editables. La comparación trabaja sobre copias. La resolución parte siempre de la revisión actual y sólo cambia los campos elegidos.

Cada campo cambiado permite conservar el borrador, el estado actual o el valor
original. Los ajustes sólo de un lado y los coincidentes tienen una propuesta;
los valores distintos requieren una elección explícita. Los componentes retirados
o con otro contrato/binding sólo permiten conservar su estado actual; si tenían
un ajuste propio, hay que reconocerlo expresamente. Los campos nuevos y los datos
no editables siempre parten de la revisión actual.

La cuarta miniatura muestra el resultado combinado y señala si todavía quedan
campos pendientes. Incluye imagen, titular, antetítulo, color, composición,
tipografía, logotipo y su versión. Continuar prepara un borrador local sobre la
revisión actual, sin guardar. Toda la resolución es un paso de historial:
Deshacer recupera la revisión, borrador y comparación anteriores; Rehacer vuelve
a la resolución. Las decisiones y cada comparación se conservan durante la
sesión, incluso ante varios conflictos consecutivos. Cerrar sólo oculta el panel.
Recargar la pestaña todavía reinicia estos datos; se puede descargar el changeset.

El guardado posterior requiere otra acción. El conector conserva el proyecto
canónico devuelto en el conflicto, relee de nuevo y valida revisión, campos y
valores previos. Si el origen volvió a cambiar, muestra otro conflicto sin
escribir ni reintentar. Sólo un acuse con relectura exacta confirma el guardado.
Una lectura posterior distinta del acuse se identifica como incierta: el ajuste
pudo haberse aplicado, y la interfaz pide revisar su historial antes de preparar
otro borrador. Una lectura todavía antigua conserva el error de confirmación.

Los recursos actuales prevalecen cuando comparten la misma referencia; una
imagen antigua sólo puede recuperarse por una referencia distinta. Los bytes
anteriores de una URL reutilizada no son un recurso versionado recuperable.
El servidor nativo sigue validando que cada imagen o logotipo exista y esté
aprobado para esa propuesta. Ninguna resolución copia metadatos antiguos ni
escribe automáticamente.

El mensaje de conflicto y las imágenes posteriores se correlacionan con ventana,
origen, canal, petición y revisión. Las imágenes llegan aparte para que su carga
no retrase la respuesta al guardado. Cada vista conserva sus recursos: los
recursos actuales no sustituyen los que se abrieron originalmente. Las imágenes
se comparan por su referencia versionada.

Ensayo exclusivamente local con datos ficticios:

- `/presentaciones/?conflictFixture=site`
- `/presentaciones/?conflictFixture=presentation`

Añade `&conflictPhase=after-save` para ensayar un guardado incierto y su
revisión de historial. Estos parámetros sólo activan el ensayo en loopback y
sin conector remoto.
Los fixtures usan el artwork ficticio público de Órbita bajo dos referencias de
muestra y logotipos de prueba dibujados en Canvas. No leen datos de clientes.
