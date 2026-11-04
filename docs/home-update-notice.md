# Aviso de nueva versión de la portada

La portada compara su marca `ain-page-revision` con la del HTML publicado. El
sellado existente genera esta marca automáticamente a partir del HTML final,
incluidos sus tokens de assets. Así detecta tanto cambios del menú como de código
o estilos, aunque el sello editorial de `version.json` no cambie. El proceso es
estable: volver a sellar sin cambios conserva la marca.

La comprobación se hace al cargar, cada minuto mientras la pestaña esté visible,
y al recuperar visibilidad, conexión o una página del historial. Usa peticiones
al mismo origen, sin credenciales, sin caché y con tiempo máximo de ocho segundos.
Errores de red, redirecciones, respuestas no HTML y marcas ausentes o inválidas
no muestran el aviso. No se consulta desde los editores ni desde pestañas ocultas.

Cuando la marca cambia aparece un aviso discreto en ES/EN, sin desplazar el foco.
**Actualizar** navega a la misma portada con una clave de recarga, conservando el
idioma, otros parámetros y el fragmento. **Más tarde** oculta esa versión durante
la vida de la página. Una publicación posterior puede mostrar un aviso nuevo.
No hay recarga automática ni escrituras en almacenamiento, borrado de cachés,
cambios de sesión o modificaciones de proyectos.

Una pestaña que ya estuviera abierta antes de instalar este módulo necesita una
recarga inicial para disponer del aviso. No se puede añadir código retroactivamente
a un documento que el navegador ya haya cargado.

Validación: `node --test tests/update-notice.test.mjs tests/site-language.test.mjs
tests/site-shell.test.mjs tests/site-session.test.mjs`. La prueba local de navegador
mantiene abierta una portada, sirve una marca distinta desde el servidor de
prueba y comprueba el aviso, el cambio de idioma y la navegación por consentimiento.
