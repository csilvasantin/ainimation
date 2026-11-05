# Paneles redimensionables

Opciones se ensancha desde su borde derecho; Avanzado, desde el izquierdo;
Experto cambia de altura desde el borde superior. El asa muestra una marca
visible y admite ratón, lápiz, gestos táctiles y teclado. Sus nombres y ayudas
siguen el idioma de la aplicación.

Con el asa enfocada, las flechas ajustan 16 px y Mayúsculas + flecha, 64 px.
Inicio reduce al mínimo y Fin amplía hasta el límite disponible. Los tamaños se
limitan al área visible bajo la cabecera y se reajustan si cambia el viewport.
Doble clic en el borde o Intro con el asa enfocada restablecen el tamaño CSS
original de esa superficie, adaptado al viewport actual. No cierran el panel ni
modifican su contenido. La ayuda del borde explica ambos gestos.

Los paneles siguen superpuestos: redimensionar no modifica la posición ni el
tamaño del lienzo, los datos del proyecto o la ventana. El navegador guarda sólo
la medida de cada panel, por sección y contexto (incluido el editor de cápsulas).
Al volver a entrar se recuperan las medidas, pero los paneles siempre empiezan
cerrados. El idioma, las consultas de la URL y los IDs de proyectos no cambian
esta preferencia. Las rutas con `index.html` comparten preferencia con su carpeta.
Las medidas se adaptan al espacio disponible sin sobrescribir el tamaño preferido
cuando la ventana es más pequeña. Doble clic o Intro borran esa medida guardada.
Si el almacenamiento está bloqueado o lleno, el ajuste funciona en la página
actual sin interrumpir el editor ni tocar sus datos.

El mismo comportamiento se instala en el shell compartido (incluidas las
cápsulas) y en los paneles propios de Sites y Produce, conservando sus toggles y
controles. Al terminar o cancelar un arrastre se restablece la interacción con
las vistas previas. Los eventos se retiran al desmontar el shell.

Pruebas: `node --test tests/panel-resize.test.mjs tests/site-shell.test.mjs
tests/site-language.test.mjs tests/sites-quad.test.mjs tests/update-notice.test.mjs`.
Verificación en navegador: arrastres reales de los tres paneles en Interactivos,
reapertura con tamaño conservado, límites por teclado y arrastre sobre el iframe
de Sites, manteniendo idénticos su contenido y su geometría.
