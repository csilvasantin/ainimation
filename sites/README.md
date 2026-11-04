# Sites · importar, editar y animar

Entrada: `https://www.ainimation.studio/sites/`. Accesible desde la portada,
Presentaciones y el inspector de Presentaciones. El selector ofrece PortAventura
NeXT como primera URL y conserva las copias importadas en IndexedDB del navegador.

## Recorrido

1. Seleccionar un site o pegar una URL HTTPS. Se importa la página concreta, no
   se rastrea el dominio entero. Los enlaces del mismo dominio permiten seleccionar
   otra página y crear otra copia independiente.
2. Seleccionar un texto, imagen, vídeo o SVG desde la página o la lista. Editar
   textos, imágenes/vídeos por URL o archivo local y descripción alternativa. También admite fondos
   declarados en estilos inline. Se pueden añadir imágenes o vídeos por URL o archivo al final.
3. Elegir aparecer, entrada desde abajo, acercamiento o flotar, con duración y
   retraso. Son animaciones CSS, no generación de vídeo con IA; respetan movimiento
   reducido. Deshacer/rehacer y comparación conservan el original importado.
4. Descargar el proyecto editable (original y borrador), reabrirlo o exportar HTML
   con los ajustes y animaciones. Los archivos locales se incluyen; los medios remotos
   conservan sus URLs públicas.

El original nunca se modifica. La copia se guarda en el navegador, no en una cuenta
ni en un servidor de proyectos. Cada nueva importación tiene su propia identidad;
reimportar no sustituye silenciosamente el borrador anterior. El historial completo
es de sesión; tras recargar se recuperan original y borrador y se puede deshacer
al original. Publicar una copia o guardar en su fuente son pasos independientes.

## Fidelidad y aislamiento

Conserva HTML, CSS disponible (hasta 12 hojas externas), SVG con referencias locales
`use`, textos y medios. Retira scripts, formularios y documentos incrustados.
El contenido que depende de JavaScript, canvas, sesión o datos en directo necesita
un adaptador o recreación específica. Se indican estas limitaciones tras importar.
Las reglas CSS `@import` no se siguen; no se promete capturar una web dinámica ni
reproducir sus servicios originales. Los fondos definidos sólo en hojas externas
se conservan visualmente pero no tienen aún su propio campo de sustitución.

DOMPurify 3.4.17 está vendorizado con su licencia en `vendor/`; actualizarlo desde
la dependencia correspondiente, manteniendo ambas copias sincronizadas. La copia
se vuelve a limpiar al previsualizar y al exportar, incluso al abrir un JSON.
Los iframes carecen de acceso al origen de AINimation. Sólo se ejecuta el puente
del editor, con nonce CSP: selección y medios en el borrador; recepción de
archivos arrastrados en ambas vistas. El puente valida ventana y canal; no se
habilitan navegación superior, formularios ni conexiones desde la copia.

## Servicio de lectura

`site-import/worker.mjs` sólo descarga HTML/CSS públicos. No transmite cookies,
Authorization ni credenciales del visitante. Verifica URL y DNS públicos en cada
salto, permite HTTPS y puerto estándar, limita a tres redirecciones y 2 MB por
respuesta, con tiempos máximos y límite de peticiones. Sólo acepta los orígenes
de AINimation. `ALLOW_LOCAL=1` se usa exclusivamente en el servidor de pruebas.

Despliegue independiente: `wrangler deploy --config site-import/wrangler.toml`.
No comparte bindings, secretos ni despliegue con el MCP o los kioscos.

## Verificación

- `npm run verify:sites`: importación, CSS, medios, límites, redirecciones, DNS,
  limpieza al reabrir, CSP, edición, animación, historial y recuperación.
- `npm run preview:sites`: `http://127.0.0.1:9138/sites/`, con el mismo servicio de
  lectura servido localmente. Requiere acceso a Internet para importar páginas.
- Regresión del inspector anterior: `node --test tests/refinement-*.test.mjs`.

Ensayo inicial: la portada pública de `https://www.portaventuranext.com/`
produjo 22 componentes (19 textos y 3 gráficos). Su canvas y programas originales
no se ejecutan; el trazado SVG y los estilos se conservan.

## Imágenes y vídeos desde el ordenador

**Añadir imagen o vídeo → Cargar desde el ordenador** admite hasta diez archivos
a la vez. En las propiedades de un medio, **Sustituir desde el ordenador** reemplaza
su fuente conservando la identidad, animación e historial del componente. Una carga
múltiple es un solo paso de deshacer/rehacer. Se comprueba el lote antes de editar.

También se pueden **arrastrar y soltar imágenes y vídeos** sobre el editor o
cualquiera de las dos vistas de comparación. Un aviso superpuesto indica dónde
soltar sin redimensionar el lienzo. Utiliza la misma carga por archivos y conserva
sus límites, historial, persistencia y empaquetado. Las carpetas se rechazan y los
arrastres de texto o URL mantienen su comportamiento normal. Durante una carga o
importación se espera a que termine; sin proyecto abierto se muestra Opciones.

Formatos: PNG, JPEG, WebP, GIF y AVIF (10 MB por imagen); MP4 y WebM (50 MB por vídeo).
El navegador debe poder decodificar sus dimensiones y metadatos. El tipo se reconoce
por los bytes, no por la extensión o el MIME declarado. No se admite SVG como archivo
local activo. Límite de archivos por copia: 100 MB. Una carga rechazada conserva la copia.

Los archivos no se envían a un servidor: sus Blobs se guardan con la copia en IndexedDB.
Las referencias SHA-256 permiten deduplicar archivos idénticos. El iframe recibe copias
de los Blobs por el canal validado y crea sus URLs dentro de su propio origen aislado;
no se añade `allow-same-origin`. Las URLs se liberan al abandonar la vista. Las
animaciones y controles de reproducción funcionan también para estos medios.

El JSON de proyecto versión 2 empaqueta una sola copia de cada archivo usado por
original o borrador, con tamaño, MIME e identidad. Al reabrir se verifican bytes,
identidad, límites y reproducción antes de sustituir el proyecto abierto. Se siguen
aceptando proyectos versión 1 sin archivos locales. Los JSON nuevos requieren esta
versión del editor; el límite de paquete es 145 MB. Tras recargar, el borrador y sus
medios permanecen, aunque el historial completo sigue siendo de sesión.

**Exportar HTML** incorpora los archivos locales como datos, con declaración UTF-8,
animaciones y CSP sin scripts importados. No depende de URLs blob temporales ni de los
archivos originales del ordenador. Los recursos que ya eran remotos siguen remotos.

Pruebas adicionales: `tests/sites-media.test.mjs` y `tests/sites-drop.test.mjs`.
Ensayo del arrastre con eventos DataTransfer en el editor real y en ambas vistas
aisladas: JPG + MP4, rechazo de lote inválido, deshacer/rehacer, recarga, selector y
sustitución por archivo, descarga con dos recursos y hashes verificados. El aviso
conservó exactamente la geometría del iframe. Se usan controles de prueba locales;
no se automatiza un arrastre del Finder ni se publica ese arnés de pruebas.

Ensayo visual inicial sobre una copia de
PortAventura: carga conjunta de PNG y MP4, reemplazo por JPEG y MP4 distintos, deshacer,
rechazo de imagen al reemplazar vídeo, recarga, paquete descargado/reabierto y HTML
exportado con imagen y vídeo reproducibles.

## Interfaz cuadrática

Barra superior: Opciones a la izquierda, Avanzado y Experto a la derecha, en ese
orden. Opciones contiene importación, biblioteca, componentes y medios. Avanzado
contiene las propiedades y avisos de importación. Experto ofrece una consola de
órdenes tipadas (`/help`), sin ejecutar JavaScript. El centro conserva el lienzo,
historial, comparación y descargas.

Los tres paneles son independientes, se superponen al contenido y arrancan
cerrados en cada carga. No se recuerda su apertura. Escape dentro de un panel lo
cierra y devuelve el foco al botón correspondiente. Seleccionar en la página o en
la lista abre Avanzado. Importar correctamente cierra Opciones. Ningún cambio de
panel mueve o redimensiona el centro ni sus iframes.

El tutorial en `/help/#importar-sites` muestra esta interfaz con narración en
español, subtítulos ES/EN, transcripción y capturas ampliadas del recorrido real.
