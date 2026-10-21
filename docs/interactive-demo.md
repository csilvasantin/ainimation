# Demo del Creador de interactivos

En `/interactivos/`, **Ver demo** abre el mismo vídeo desde el acceso o desde el espacio de trabajo. En modo **Experto**, la caja **Comando** acepta `/demo interactivo` (también `/demo interactive`) y **Ejecutar** o Intro. El enlace `/interactivos/?demo=interactivo` abre el reproductor sin reproducción automática.

Vídeo propio de 1:14, 1920×1080, H.264/AAC, capturas reales de Chrome editadas y voz sintética Mónica en español. Enseña crear un proyecto separado, editar tres pantallas, conectar cuatro botones, probar ida y vuelta, recuperar al recargar y exportar JSON/HTML. La demostración fue realizada con una biblioteca local aislada; no muestra sincronización en la nube. Los subtítulos españoles están disponibles en el control del vídeo.

El reproductor utiliza controles nativos y `playsinline` para móvil. Cerrar, incluido Escape, pausa el sonido. Un bloqueo de reproducción deja los controles disponibles; hay un enlace directo de respaldo al MP4. La demo no carga ni modifica proyectos, no requiere sesión y no ejecuta comandos arbitrarios.

Archivos: `assets/demos/interactivo/`. El constructor de vista previa incluye el módulo y sus tres recursos. Publicación desde `main` con el sello de caché habitual.
