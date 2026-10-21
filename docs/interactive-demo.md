# Demo del Creador de interactivos

En `/interactivos/`, **Ver demo** abre el mismo vídeo desde el acceso o desde el espacio de trabajo. En modo **Experto**, la caja **Comando** acepta `/demo interactivo` (también `/demo interactive`) y **Ejecutar** o Intro. El enlace `/interactivos/?demo=interactivo` abre el reproductor sin reproducción automática.

Vídeo propio de 1:14, 1920×1080, H.264/AAC, capturas reales de Chrome editadas y voz sintética Mónica en español. Enseña crear un proyecto separado, editar tres pantallas, conectar cuatro botones, probar ida y vuelta, recuperar al recargar y exportar JSON/HTML. La demostración fue realizada con una biblioteca local aislada; no muestra sincronización en la nube. Los subtítulos españoles están disponibles en el control del vídeo.

El reproductor utiliza controles nativos y `playsinline` para móvil. Cerrar, incluido Escape, pausa el sonido. Un bloqueo de reproducción deja los controles disponibles; hay un enlace directo de respaldo al MP4. Ver el vídeo no modifica proyectos, no requiere sesión y no ejecuta comandos arbitrarios.

**Crear este interactivo**, junto al vídeo, añade y abre una copia editable con las tres pantallas y los cuatro botones del ejemplo. Cada uso tiene su propia identidad y nombre (`Demo · Mi cafetería · copia`, `copia 2`…). Los registros anteriores, sus revisiones y el borrador antiguo no se reescriben. El botón también funciona desde la pantalla de acceso: pasa al editor local sin exigir cuenta. Las copias quedan en el navegador y se pueden sincronizar con el flujo habitual de Google.

Si hay cambios sin guardar, imágenes pendientes, falta de espacio o una biblioteca incompatible, no se crea ni se abre otra copia: el trabajo y el diálogo se conservan y se muestra la causa. La apertura pausa el vídeo y lleva el foco al editor sin abrir el teclado del móvil.

Archivos: `assets/demos/interactivo/`. El constructor de vista previa incluye el módulo y sus tres recursos. Publicación desde `main` con el sello de caché habitual.

Verificación de la copia editable: 50 pruebas automáticas; Chrome en escritorio y a 320/390 px. Creación desde acceso sin sesión y desde el editor, nombres independientes, edición conservada al recargar, recorrido completo y bloqueo con cambios pendientes. Al abrir una copia se retira el parámetro de demo del enlace para que una recarga vuelva al editor.
