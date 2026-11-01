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

El primer conector real permite textos, conserva una versión anterior, sincroniza
los idiomas usando el editor nativo y confirma por relectura. Su vista de contenido
es orientativa; el diseño original, medios, decks y comportamientos se conservan
en el generador. Los colores y posiciones de las muestras no se prometen como
ajustes guardables en ese origen. Un conflicto mantiene el borrador.

Escritorio/Móvil sólo modifica el canvas interno. El preview usa DOM/textContent,
sin ejecutar HTML importado. La siguiente conexión para sites necesita su fuente
editable y una confirmación de guardado del adaptador correspondiente.
