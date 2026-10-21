const $=id=>document.getElementById(id);
let language='es',mode='basic';
try{language=localStorage.getItem('ainimation:ui:language')||'es';mode=localStorage.getItem('ainimation:ui:mode')||'basic';}catch{}
if(!['es','en'].includes(language))language='es';
if(!['basic','advanced','expert'].includes(mode))mode='basic';
const dictionary={
'Crear este interactivo':'Create this interactive',
'Se abrirá una copia editable con las tres pantallas del vídeo. Tus proyectos actuales se conservan.':'Open an editable copy with the three screens from the video. Your existing projects are preserved.',
'Ver demo':'Watch demo','Comandos de Experto':'Expert commands','Comando':'Command','Ejecutar':'Run',
'Escribe /demo interactivo para abrir el vídeo de creación.':'Enter /demo interactivo to open the creation video.',
'Demo · Creador de interactivos':'Demo · Interactive creator','Cerrar demo':'Close demo','Abrir vídeo ↗':'Open video ↗',
'Una guía de 1:14 con voz en español: crea, conecta y prueba. Demostración local con capturas reales de Chrome.':'A 1:14 guide with Spanish narration: create, connect and test. Local demonstration with real Chrome captures.',
'Entra. Elige tu idioma.':'Sign in. Choose your language.',
'Crea tu interactivo.':'Create your interactive.',
'Tu espacio para diseñar experiencias que responden.':'Your space to design responsive experiences.',
'01 / ACCESO':'01 / SIGN IN','02 / IDIOMA':'02 / LANGUAGE',
'Tu biblioteca, contigo.':'Your library, with you.',
'Identifícate para recuperar tus proyectos desde tus dispositivos.':'Sign in to recover your projects across devices.',
'Iniciar sesión con Google':'Sign in with Google',
'Vista previa: Google aún no está conectado. Tus proyectos locales se conservan.':'Preview: Google is not connected yet. Your local projects are preserved.',
'Entrar en vista previa local →':'Enter local preview →','A tu manera.':'Your way.',
'Al entrar, este espacio deja sitio a Avanzado y Experto. Puedes volver a cambiar el idioma desde Cuenta.':'Once inside, this space becomes Advanced and Expert. You can change your language from Account.',
'Acceso e idioma':'Sign in and language',

'Idioma':'Language','Iniciar sesión':'Sign in','Básico':'Basic','Avanzado':'Advanced','Experto':'Expert','CREADOR / INTERACTIVOS':'CREATOR / INTERACTIVES',
'Animación':'Animation','Interactivos':'Interactives','Xperiencias':'Experiences','VISTA PREVIA · v0.1':'PREVIEW · v0.1',
'DE UNA IDEA A UNA EXPERIENCIA':'FROM IDEA TO EXPERIENCE','Crea algo que responda.':'Create something that responds.','Diseña pantallas, conecta sus botones y prueba el recorrido.':'Design screens, connect buttons and test the journey.',
'Abrir proyecto':'Import project','Guardar archivo':'Save file','Exportar interactivo ↗':'Export interactive ↗','TU ESPACIO DE TRABAJO':'YOUR WORKSPACE','Biblioteca de interactivos':'Interactive library','+ Nuevo proyecto':'+ New project',
'Cada proyecto conserva sus propias pantallas. Se guarda en este navegador; descarga un archivo para llevarlo a otro equipo.':'Each project keeps its own screens. Saved in this browser; download a file to move it to another device.',
'Tu biblioteca, en tus dispositivos':'Your library, across devices','Vista previa: conexión con la nube pendiente de configurar. Los proyectos de este navegador se conservan.':'Preview: cloud connection awaits configuration. Projects in this browser are preserved.','Sincronizar biblioteca':'Sync library','Desconectar cuenta':'Sign out',
'01 / PROYECTO':'01 / PROJECT','Nombre':'Name','Formato':'Format','Vertical · 9:16':'Portrait · 9:16','Horizontal · 16:9':'Landscape · 16:9','Cuadrado · 1:1':'Square · 1:1','Color de acento':'Accent color','Volver al inicio tras inactividad':'Reset after inactivity','02 / PANTALLAS':'02 / SCREENS','+ Añadir':'+ Add','Al iniciar, mostrar':'Start screen','Empezar con una plantilla':'Start from a template','03 / CONTENIDO':'03 / CONTENT','Eliminar pantalla':'Delete screen','Título':'Title','Imagen de esta pantalla':'Screen image','Quitar imagen':'Remove image','Texto':'Text','Al tocar…':'On tap…','+ Botón':'+ Button','04 / PRUEBA EN VIVO':'04 / LIVE PREVIEW','El recorrido, en tus manos.':'Try the journey.','↻ Reiniciar':'↻ Restart',
'Tu cuenta AINimation':'Your AINimation account','El acceso con Google está pendiente de configurar en esta vista previa. Puedes continuar con tus proyectos locales.':'Google sign-in awaits configuration in this preview. You can continue using your local projects.','Volver al creador':'Back to creator',
'PNG, JPG o WebP, hasta 600 KB por imagen. Se incorpora al proyecto y a su exportación.':'PNG, JPG or WebP, up to 600 KB per image. Included in the project and its export.'
};
// Only shell text is translated; authored project text and input values are untouched.
const nodes=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(['SCRIPT','STYLE','OPTION'].includes(n.parentElement?.tagName)||n.parentElement?.closest('#sceneName,#scenes,.library-card h3'))continue;const key=n.textContent.trim();if(dictionary[key])nodes.push({n,key});}
function apply(){document.documentElement.lang=language;document.body.dataset.mode=mode;$('uiLanguage').value=language;for(const {n,key}of nodes)n.textContent=language==='en'?dictionary[key]:key;for(const b of document.querySelectorAll('[data-mode-choice]'))b.setAttribute('aria-pressed',String(b.dataset.modeChoice===mode));const hints={es:{basic:'Lo esencial: crea pantallas, añade imágenes y conecta botones.',advanced:'Avanzado: formato, color, pantalla inicial y reinicio automático.',expert:'Experto: todas las herramientas, exportación HTML y referencias.'},en:{basic:'The essentials: create screens, add images and connect buttons.',advanced:'Advanced: layout, color, start screen and automatic reset.',expert:'Expert: all tools, HTML export and references.'}};$('modeHint').textContent=hints[language][mode];try{localStorage.setItem('ainimation:ui:language',language);localStorage.setItem('ainimation:ui:mode',mode);}catch{}}
$('uiLanguage').onchange=e=>{language=e.target.value;apply();};
for(const b of document.querySelectorAll('[data-mode-choice]'))b.onclick=()=>{mode=mode===b.dataset.modeChoice?'basic':b.dataset.modeChoice;apply();};
$('loginButton').onclick=()=>{const login=$('googleLogin');$('loginTarget').append(login);if(login.childElementCount)$('loginExplanation').textContent=language==='en'?'Sign in with your Google account to sync your library.':'Inicia sesión con tu cuenta Google para sincronizar tu biblioteca.';$('loginDialog').showModal();};
$('closeLogin').onclick=()=>$('loginDialog').close();apply();

const sessionTools=document.querySelector('.session-tools'),languageLabel=$('uiLanguage').closest('label'),modeTools=document.querySelector('.mode-bar .tools');
$('entryLanguage').append(languageLabel);
const accountButton=document.createElement('button');accountButton.id='accountButton';accountButton.textContent='Cuenta / Idioma';accountButton.onclick=()=>{$('accountLanguage').append(languageLabel);$('loginTarget').append($('googleLogin'));if($('googleLogin').hidden)$('loginExplanation').textContent=language==='en'?'Account connected. Your local projects are preserved.':'Cuenta conectada. Tus proyectos locales se conservan.';else $('loginExplanation').textContent=language==='en'?'Sign in with Google to sync your library.':'Inicia sesión con Google para sincronizar tu biblioteca.';$('loginDialog').showModal();};
sessionTools.append(modeTools,accountButton);
function stage(value){document.body.dataset.stage=value;if(value==='entry'){$('entryLanguage').append(languageLabel);mode='basic';apply();}try{sessionStorage.setItem('ainimation:ui:stage',value);}catch{}}
$('entryLogin').onclick=()=>$('loginButton').click();
$('enterPreview').onclick=()=>stage('workspace');
$('backToEntry').onclick=()=>{$('loginDialog').close();stage('entry');};
window.addEventListener('interactive-authenticated',()=>{$('loginDialog').close();stage('workspace');});
try{stage(sessionStorage.getItem('ainimation:ui:stage')==='workspace'?'workspace':'entry');}catch{stage('entry');}

window.addEventListener('interactive-signed-out',()=>stage('entry'));
window.addEventListener('interactive-demo-created',()=>stage('workspace'));
