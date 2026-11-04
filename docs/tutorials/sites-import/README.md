# Tutorial de Sites · PortAventura

Vídeo guiado de 72 segundos, 1920×1080, H.264/AAC, 25 fps. Narración española
generada localmente con la voz Mónica de macOS. Subtítulos abiertos ES y pistas
WebVTT ES/EN, con transcripciones. No usa proveedores de pago ni credenciales.

El recorrido usa capturas reales obtenidas con CUA: acceso desde la portada
pública, interfaz cuadrática de AINimation en revisión local y contenido público
de PortAventura. No es una grabación continua: el montaje amplía regiones y añade
un puntero editorial para explicar cada paso. El original de PortAventura no se
modifica. Las capturas están en `captures/`, con su manifiesto; `video.json` guarda
la duración, las escenas y el hash del MP4.

La demo muestra Opciones → URL → Importar página → selección → Avanzado → texto
y animación → carga de medios en Opciones → /help en Experto → descargar proyecto
o HTML. Los tres paneles empiezan cerrados, se superponen y no redimensionan el
lienzo. El vídeo explica los límites de scripts, canvas y datos en directo.

Publicación: `/help/#importar-sites`. Vídeo, póster, subtítulos y transcripciones
en `/help/media/importar-site-portaventura.*`. El editor enlaza directamente a
esa sección desde Ayuda. No hay reproducción automática. El reproductor incluye
un botón de silencio siempre visible, además de los controles nativos; el icono
y su tooltip se sincronizan con el estado y el idioma.

Archivado en el Stock compartido de Pixeria/Admira: catálogo **Demos · AINimation**,
proyecto `ainimation`, etiquetas `demos`, `ainimation`, `portaventura`, `sites` y
`tutorial`. Asset **1947** (`1793815054156-cxqmo2`); recibo y hash en `stock.json`.
Acceso: https://www.pixeria.com/stock.html?catalogo=demos-ainimation.
Las siguientes demos de este proyecto deben guardarse en ese catálogo, conservar
la etiqueta del proyecto y ofrecer siempre la opción de silenciar.

Reproducción local: `npm run preview:sites`. Para reconstruir, instala Pillow en
un entorno Python y ejecuta `python scripts/render-sites-help.py`; requiere
ffmpeg/ffprobe y la voz local de macOS. Las capturas no se generan artificialmente.

Verificado: decodificación íntegra del MP4, H.264 1920×1080 + AAC 48 kHz; subtítulos
y transcripciones en ambos idiomas; 28 pruebas de Sites/medios/cuadratura y 67
de regresión del inspector. Prueba visual: los iframes conservaron exactamente
x/y/ancho/alto al abrir a la vez Opciones, Avanzado y Experto; órdenes de importar,
seleccionar, texto y animación aplicadas sólo a una copia.
