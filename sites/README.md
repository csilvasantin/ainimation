# Sites · importar, editar y animar

Entrada: `https://www.ainimation.studio/sites/`. Accesible desde la portada,
Presentaciones y el inspector de Presentaciones. El selector ofrece PortAventura
NeXT como primera URL y conserva las copias importadas en IndexedDB del navegador.

## Recorrido

1. Seleccionar un site o pegar una URL HTTPS. Se importa la página concreta, no
   se rastrea el dominio entero. Los enlaces del mismo dominio permiten seleccionar
   otra página y crear otra copia independiente.
2. Seleccionar un texto, imagen, vídeo o SVG desde la página o la lista. Editar
   textos, URLs de imágenes/vídeos y descripción alternativa. También admite fondos
   declarados en estilos inline. Se pueden añadir imágenes o vídeos por URL al final.
3. Elegir aparecer, entrada desde abajo, acercamiento o flotar, con duración y
   retraso. Son animaciones CSS, no generación de vídeo con IA; respetan movimiento
   reducido. Deshacer/rehacer y comparación conservan el original importado.
4. Descargar el proyecto editable (original y borrador), reabrirlo o exportar HTML
   con los ajustes y animaciones. Los medios siguen enlazados a sus URLs públicas.

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
de selección del editor, con nonce CSP. El puente valida ventana y canal; no se
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
