// Temas cinematográficos · fase 1 (5 ambientaciones de series, 02-11-2026 18:46) (Carlos, 02-11-2026). Segunda capa sobre la marca blanca:
// la MARCA manda en el acento y el TEMA pone la atmósfera (paleta de fondo y texto, tipografía
// libre de Google Fonts, grano, viñeta, gradación, barras y motion). Nombres por estilo, nunca de
// películas; sin logos, fotogramas ni fuentes con licencia. Sonido opcional, apagado por defecto,
// siempre sintetizado con WebAudio y solo tras un clic del usuario (nunca autoplay).
// Fase 1 · /modo (Elon, 02-11-2026): 4 bases de estudio y 5 producciones de Universal; las 5 primeras son las producciones
// de streaming. ESTUDIOS y resolverEstudio llevan el comando /modo <estudio> [producción] al tema.
// Este fichero es idéntico en admira-next-web (pruebas/ainimation-presentaciones/refinement/) y
// en ainimation (presentaciones/editor/); los JSON de marcablanca/temas/ son su espejo.
export const NONE='ninguno';
// `referenciaInterna` es solo para el equipo (nunca se pinta): los textos visibles usan el nombre de estilo.
// Usar públicamente las marcas o títulos de referencia requeriría licencia.
export const TEMAS=Object.freeze({
  'ochenta-mundo-del-reves':{id:'ochenta-mundo-del-reves',nombre:'Mundo del revés 80s',referenciaInterna:'Ambientación inspirada en Stranger Things (uso interno).',descripcion:'Rojo neón retro de los ochenta sobre negro, cinta VHS, grano y titular condensado de cartel.',
    modo:'oscuro',colores:{fondo:'#070506',fondoAlt:'#120809',superficie:'#1a0b0d',texto:'#f6e9e6',textoSuave:'#e0a9a0',borde:'#4a1a1c',brillo:'#ff2a2a',brillo2:'#4fa3ff'},
    tipografia:{titulos:"'Bebas Neue', 'Anton', Impact, sans-serif",texto:"'Inter', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.08em'},
    aspecto:'1.85:1',grano:0.5,vineta:0.6,gradacion:{saturacion:1.1,contraste:1.12,tinte:'#ff2a2a',tinteFuerza:0.08},
    motion:{entrada:'parpadeo-vhs',duracionMs:900},titulo:{sombra:'0 0 14px #ff2a2acc, 0 0 2px #ff2a2a'},
    sonido:{tipo:'sintetico',descripcion:'Arpegio grave de sintetizador analógico.',base:65.4,ruido:0.08}},
  'academia-gotica':{id:'academia-gotica',nombre:'Academia gótica',referenciaInterna:'Ambientación inspirada en Wednesday (uso interno).',descripcion:'Gótico juvenil: negro, blanco y morado oscuro, serif elegante y líneas de uniforme.',
    modo:'oscuro',colores:{fondo:'#0c0a10',fondoAlt:'#16121d',superficie:'#1d1726',texto:'#f4f1f7',textoSuave:'#c3b6d6',borde:'#3b2d4f',brillo:'#6b3fa0',brillo2:'#ffffff'},
    tipografia:{titulos:"'Cinzel', 'Playfair Display', Georgia, serif",texto:"'Playfair Display', Georgia, serif",google:'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Playfair+Display:wght@400;700&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.12em'},
    aspecto:'2.39:1',grano:0.3,vineta:0.65,gradacion:{saturacion:0.35,contraste:1.2,tinte:'#6b3fa0',tinteFuerza:0.12},
    motion:{entrada:'fundido-iris',duracionMs:1100},titulo:{sombra:'0 2px 0 #000',alineacion:'center'},
    sonido:{tipo:'sintetico',descripcion:'Nota de chelo sintética, grave y sostenida.',base:98,ruido:0.03}},
  'epica-familiar-1950':{id:'epica-familiar-1950',nombre:'Épica familiar 1950',referenciaInterna:'Ambientación inspirada en Al este del Edén (uso interno).',descripcion:'California de los años cuarenta y cincuenta: sepia, ocre y atardecer, serif clásica y viñeta suave.',
    modo:'claro',colores:{fondo:'#f3e6cf',fondoAlt:'#ead6b3',superficie:'#fbf3e4',texto:'#3a2614',textoSuave:'#6b4a2b',borde:'#c9a77a',brillo:'#c8692b',brillo2:'#8a5a2b'},
    tipografia:{titulos:"'Libre Baskerville', Georgia, serif",texto:"'Libre Baskerville', Georgia, serif",google:'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',transformTitulos:'none',trackingTitulos:'0.01em'},
    aspecto:'16:9',grano:0.25,vineta:0.3,gradacion:{saturacion:0.7,contraste:1,tinte:'#c8692b',tinteFuerza:0.14},
    motion:{entrada:'fundido-lento',duracionMs:1400},titulo:{},
    sonido:{tipo:'sintetico',descripcion:'Acorde cálido de cuerdas y viento suave.',base:196,ruido:0.05}},
  'urbano-colombiano-neon':{id:'urbano-colombiano-neon',nombre:'Urbano neón colombiano',referenciaInterna:'Ambientación inspirada en La Reina del Flow (uso interno).',descripcion:'Noche urbana de Medellín: neón magenta y cian, dorado, tipografía gruesa y energía de ritmo.',
    modo:'oscuro',colores:{fondo:'#0a0612',fondoAlt:'#140b22',superficie:'#1b1030',texto:'#fff6fd',textoSuave:'#f0b7e4',borde:'#3d2160',brillo:'#ff2fb3',brillo2:'#ffc93c'},
    tipografia:{titulos:"'Anton', Impact, sans-serif",texto:"'Montserrat', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@400;700&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.02em'},
    aspecto:'16:9',grano:0.2,vineta:0.45,gradacion:{saturacion:1.25,contraste:1.1,tinte:'#22e4ff',tinteFuerza:0.08},
    motion:{entrada:'pulso-ritmo',duracionMs:600},titulo:{sombra:'0 0 16px #ff2fb3aa, 0 0 3px #ffc93c'},
    sonido:{tipo:'sintetico',descripcion:'Pulso de bajo a ritmo de dembow, sintetizado.',base:55,ruido:0}},
  'regencia-romantica':{id:'regencia-romantica',nombre:'Regencia romántica',referenciaInterna:'Ambientación inspirada en Bridgerton (uso interno).',descripcion:'Salón de regencia: pasteles empolvados, crema y oro, serif caligráfica, flores y filigranas.',
    modo:'claro',colores:{fondo:'#f7efe6',fondoAlt:'#eef0f8',superficie:'#fffaf3',texto:'#3a2a3a',textoSuave:'#6a4f66',borde:'#d8c3a5',brillo:'#b8924a',brillo2:'#a9c4e8'},
    tipografia:{titulos:"'Cormorant Garamond', 'Playfair Display', Georgia, serif",texto:"'Cormorant Garamond', Georgia, serif",google:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&display=swap',transformTitulos:'none',trackingTitulos:'0.02em'},
    aspecto:'16:9',grano:0.1,vineta:0.2,gradacion:{saturacion:0.9,contraste:0.98,tinte:'#f2c6d4',tinteFuerza:0.1},
    motion:{entrada:'deslizar-centrado',duracionMs:900},titulo:{alineacion:'center'},
    sonido:{tipo:'sintetico',descripcion:'Arpegio de clave sintético en escala mayor.',base:392,ruido:0}},
  'noche-de-estreno':{id:'noche-de-estreno',nombre:'Noche de estreno',referenciaInterna:'Base del estudio de streaming de /modo netflix (uso interno).',descripcion:'Negro de sala, rojo de estreno y titular condensado enorme: la noche en que sale la serie.',
    modo:'oscuro',colores:{fondo:'#000000',fondoAlt:'#141414',superficie:'#1f1f1f',texto:'#f5f5f1',textoSuave:'#b3b3b3',borde:'#333333',brillo:'#e50914',brillo2:'#ffffff'},
    tipografia:{titulos:"'Bebas Neue', 'Anton', Impact, sans-serif",texto:"'Inter', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.04em'},
    aspecto:'16:9',grano:0.1,vineta:0.5,gradacion:{saturacion:1.05,contraste:1.1,tinte:'#e50914',tinteFuerza:0.05},
    motion:{entrada:'zoom-estreno',duracionMs:700},titulo:{sombra:'0 4px 30px #000'},
    sonido:{tipo:'sintetico',descripcion:'Golpe grave de tambor sintético, a dos tiempos.',base:55,ruido:0.02}},
  'gran-estudio-clasico':{id:'gran-estudio-clasico',nombre:'Gran estudio clásico',referenciaInterna:'Base de /modo universal: el gran estudio de Hollywood (uso interno).',descripcion:'Azul de noche, oro de cartel y serif monumental: la cabecera de un gran estudio de cine.',
    modo:'oscuro',colores:{fondo:'#020a18',fondoAlt:'#0a1a33',superficie:'#0f2342',texto:'#fff8e7',textoSuave:'#c9d6ea',borde:'#2a4470',brillo:'#f2c14e',brillo2:'#8fc8ff'},
    tipografia:{titulos:"'Cinzel', 'Playfair Display', Georgia, serif",texto:"'Inter', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.18em'},
    aspecto:'2.39:1',grano:0.15,vineta:0.55,gradacion:{saturacion:1,contraste:1.08,tinte:'#2f7dd8',tinteFuerza:0.08},
    motion:{entrada:'fundido-orbita',duracionMs:1200},titulo:{sombra:'0 0 18px #f2c14e66',alineacion:'center'},
    sonido:{tipo:'sintetico',descripcion:'Acorde de metales sintéticos, solemne y abierto.',base:130.8,ruido:0.01}},
  'minimal-de-consola':{id:'minimal-de-consola',nombre:'Minimal de consola',referenciaInterna:'Base de /modo sony: electrónica y consola (uso interno).',descripcion:'Negro absoluto, blanco fino y una línea azul: tipografía ligera, mucho aire y precisión de producto.',
    modo:'oscuro',colores:{fondo:'#000000',fondoAlt:'#0b0b0f',superficie:'#15151b',texto:'#ffffff',textoSuave:'#a7b0bd',borde:'#2a2a33',brillo:'#0070d1',brillo2:'#00a3ff'},
    tipografia:{titulos:"'Inter', 'Helvetica Neue', Arial, sans-serif",texto:"'Inter', 'Helvetica Neue', Arial, sans-serif",google:'https://fonts.googleapis.com/css2?family=Inter:wght@200;400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.3em'},
    aspecto:'16:9',grano:0,vineta:0.25,gradacion:{saturacion:0.9,contraste:1.05,tinte:'#0070d1',tinteFuerza:0.04},
    motion:{entrada:'barrido-linea',duracionMs:600},titulo:{},
    sonido:{tipo:'sintetico',descripcion:'Pulso limpio de arranque, una sola nota.',base:440,ruido:0}},
  'accion-aerea':{id:'accion-aerea',nombre:'Acción aérea',referenciaInterna:'Base de /modo skydance: acción y aviación (uso interno).',descripcion:'Atardecer ámbar, cielo de acero y titulares condensados en diagonal: velocidad y altura.',
    modo:'oscuro',colores:{fondo:'#120c08',fondoAlt:'#1e150d',superficie:'#2a1d12',texto:'#ffe9c7',textoSuave:'#d9b98a',borde:'#4a3220',brillo:'#ff7a00',brillo2:'#5d7fa3'},
    tipografia:{titulos:"'Saira Condensed', 'Oswald', Impact, sans-serif",texto:"'Inter', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@700;800&family=Inter:wght@400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.02em'},
    aspecto:'2.39:1',grano:0.2,vineta:0.45,gradacion:{saturacion:1.15,contraste:1.12,tinte:'#ff7a00',tinteFuerza:0.1},
    motion:{entrada:'barrido-diagonal',duracionMs:700},titulo:{sombra:'0 2px 0 #000'},
    sonido:{tipo:'sintetico',descripcion:'Rumor de turbina sintética que va creciendo.',base:82.4,ruido:0.12}},
  'aventura-jurasica':{id:'aventura-jurasica',nombre:'Aventura jurásica',referenciaInterna:'Ambientación inspirada en Jurassic World (uso interno).',descripcion:'Selva húmeda, ámbar y rojo de alerta, titular robusto y grano de película de aventuras.',
    modo:'oscuro',colores:{fondo:'#0b120a',fondoAlt:'#13200f',superficie:'#1a2a14',texto:'#f3ecd2',textoSuave:'#c9c19a',borde:'#3b4a2a',brillo:'#f2a900',brillo2:'#c0392b'},
    tipografia:{titulos:"'Oswald', 'Bebas Neue', Impact, sans-serif",texto:"'Inter', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.06em'},
    aspecto:'2.39:1',grano:0.35,vineta:0.6,gradacion:{saturacion:0.85,contraste:1.15,tinte:'#4a7a2a',tinteFuerza:0.1},
    motion:{entrada:'temblor',duracionMs:900},titulo:{sombra:'0 3px 0 #000, 0 0 22px #f2a90055'},
    sonido:{tipo:'sintetico',descripcion:'Retumbo grave y lejano, como pasos enormes.',base:41.2,ruido:0.06}},
  'amarillo-travieso':{id:'amarillo-travieso',nombre:'Amarillo travieso',referenciaInterna:'Ambientación inspirada en Minions (uso interno).',descripcion:'Amarillo de plátano y azul vaquero, letras redondas y gordas, todo rebota.',
    modo:'claro',colores:{fondo:'#fff7cc',fondoAlt:'#ffefa3',superficie:'#fffbe6',texto:'#1d2d50',textoSuave:'#3d4f7a',borde:'#e6c200',brillo:'#2f6db5',brillo2:'#f5c400'},
    tipografia:{titulos:"'Fredoka', 'Baloo 2', system-ui, sans-serif",texto:"'Nunito', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700&display=swap',transformTitulos:'none',trackingTitulos:'0'},
    aspecto:'16:9',grano:0,vineta:0.1,gradacion:{saturacion:1.2,contraste:1.02,tinte:'#f5c400',tinteFuerza:0.06},
    motion:{entrada:'rebote',duracionMs:700},titulo:{alineacion:'center'},
    sonido:{tipo:'sintetico',descripcion:'Silbido alegre y saltarín, sintetizado.',base:659.3,ruido:0}},
  'escuela-de-magia':{id:'escuela-de-magia',nombre:'Escuela de magia',referenciaInterna:'Ambientación inspirada en el mundo mágico de Harry Potter (uso interno).',descripcion:'Castillo a la luz de las velas: pergamino, oro viejo y burdeos, serif de grabado antiguo.',
    modo:'oscuro',colores:{fondo:'#0e0b14',fondoAlt:'#17121f',superficie:'#201a2b',texto:'#f4ecd8',textoSuave:'#cbbd9e',borde:'#4a3a2a',brillo:'#c9a227',brillo2:'#7a1f2b'},
    tipografia:{titulos:"'IM Fell English SC', 'Cinzel', Georgia, serif",texto:"'IM Fell English', Georgia, serif",google:'https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=IM+Fell+English:ital@0;1&display=swap',transformTitulos:'none',trackingTitulos:'0.04em'},
    aspecto:'2.39:1',grano:0.3,vineta:0.7,gradacion:{saturacion:0.75,contraste:1.15,tinte:'#c9a227',tinteFuerza:0.1},
    motion:{entrada:'chispa-dorada',duracionMs:1200},titulo:{sombra:'0 0 14px #c9a22766',alineacion:'center'},
    sonido:{tipo:'sintetico',descripcion:'Celesta sintética de notas altas y lentas.',base:1046.5,ruido:0}},
  'viaje-en-el-tiempo':{id:'viaje-en-el-tiempo',nombre:'Viaje en el tiempo 85',referenciaInterna:'Ambientación inspirada en Regreso al futuro (uso interno).',descripcion:'Noche de los ochenta con llamas naranjas, chispazo azul eléctrico y titular cromado en cursiva.',
    modo:'oscuro',colores:{fondo:'#0d0a1a',fondoAlt:'#171230',superficie:'#201a3d',texto:'#fff4e0',textoSuave:'#ffcf9a',borde:'#3d2f6b',brillo:'#ff6b1a',brillo2:'#3ec8ff'},
    tipografia:{titulos:"'Russo One', 'Oswald', Impact, sans-serif",texto:"'Inter', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;600&display=swap',transformTitulos:'uppercase',trackingTitulos:'0.02em'},
    aspecto:'1.85:1',grano:0.25,vineta:0.45,gradacion:{saturacion:1.2,contraste:1.1,tinte:'#ff6b1a',tinteFuerza:0.1},
    motion:{entrada:'destello',duracionMs:600},titulo:{sombra:'0 2px 0 #b8380a, 0 0 18px #ffd23f88'},
    sonido:{tipo:'sintetico',descripcion:'Zumbido eléctrico que sube de golpe.',base:110,ruido:0.1}},
  'mundo-de-plataformas':{id:'mundo-de-plataformas',nombre:'Mundo de plataformas',referenciaInterna:'Ambientación inspirada en Super Nintendo World (uso interno).',descripcion:'Cielo de videojuego, rojo y verde de seta, bloques y letras redondas: saltar es la norma.',
    modo:'claro',colores:{fondo:'#e9f6ff',fondoAlt:'#d4ecff',superficie:'#ffffff',texto:'#14213d',textoSuave:'#33476b',borde:'#9ccbf0',brillo:'#e4002b',brillo2:'#43b047'},
    tipografia:{titulos:"'Lilita One', 'Fredoka', system-ui, sans-serif",texto:"'Nunito', system-ui, sans-serif",google:'https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@400;700&display=swap',transformTitulos:'none',trackingTitulos:'0.01em'},
    aspecto:'16:9',grano:0,vineta:0.08,gradacion:{saturacion:1.25,contraste:1.05,tinte:'#ffd23f',tinteFuerza:0.05},
    motion:{entrada:'salto',duracionMs:500},titulo:{sombra:'0 3px 0 #14213d33',alineacion:'center'},
    sonido:{tipo:'sintetico',descripcion:'Arpegio de ocho bits, rápido y ascendente.',base:523.3,ruido:0}}
});
export const TEMA_IDS=Object.freeze(Object.keys(TEMAS));
export const TEMA_OPCIONES=Object.freeze([NONE,...TEMA_IDS]);
export const temaValido=id=>TEMA_OPCIONES.includes(id);
export const temaDe=id=>TEMAS[id]||null;
// /modo <estudio> [producción] (Elon, 02-11-2026): el comando es lo ÚNICO que usa los nombres reales; lo visible es el
// nombre de estilo del tema. El estudio pone el acento y la producción (o la base del estudio) la atmósfera.
// marcablanca/temas/estudios.json es su espejo y marcablanca.js resuelve igual (test/temas-cine.test.mjs).
export const ESTUDIOS=Object.freeze({netflix:{acento:'#e50914',acentoTexto:'#ffffff',base:'noche-de-estreno',alias:['netflx','neflix'],producciones:{stranger:{tema:'ochenta-mundo-del-reves',alias:['strangerthings','upsidedown','hawkins']},wednesday:{tema:'academia-gotica',alias:['merlina','nevermore']},eden:{tema:'epica-familiar-1950',alias:['alestedeleden','eastofeden']},flow:{tema:'urbano-colombiano-neon',alias:['reinadelflow','lareinadelflow']},bridgerton:{tema:'regencia-romantica',alias:['regencia']}}},universal:{acento:'#1f5fb8',acentoTexto:'#ffffff',base:'gran-estudio-clasico',alias:['universalstudios'],producciones:{jurassic:{tema:'aventura-jurasica',alias:['jurassicworld','jurassicpark','jurasic','dinosaurios','dinos']},minions:{tema:'amarillo-travieso',alias:['minion','gru','despicableme']},potter:{tema:'escuela-de-magia',alias:['harrypotter','harry','hogwarts','wizarding','wizardingworld','magia']},regreso:{tema:'viaje-en-el-tiempo',alias:['regresoalfuturo','backtothefuture','back2thefuture','bttf','delorean','futuro']},nintendo:{tema:'mundo-de-plataformas',alias:['nintendoworld','supernintendoworld','supernintendo','mario']}}},sony:{acento:'#0070d1',acentoTexto:'#ffffff',base:'minimal-de-consola',alias:['sonypictures','playstation','ps5'],producciones:{}},skydance:{acento:'#ff7a00',acentoTexto:'#120c08',base:'accion-aerea',alias:['skydancemedia','skydanse'],producciones:{}}});
const claveModo=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'');
function distancia(a,b){let p=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[b.length];}
// [id, nombres] → id: exacto, prefijo (2+ letras) o hasta 2 erratas («neftlix», «jurrasic»).
function elegir(texto,opciones){
  const s=claveModo(texto);if(!s)return '';
  let mejor='',d=9;
  for(const [id,nombres] of opciones)for(const n of nombres){
    if(n===s)return id;
    if(s.length>=2&&n.startsWith(s)){if(d>0){mejor=id;d=0;}continue;}
    const x=distancia(s,n);if(x<d){d=x;mejor=id;}
  }
  return d<=2?mejor:'';
}
const estudiosOpc=E=>Object.entries(E).map(([id,e])=>[id,[id,...e.alias]]);
const produccionesOpc=e=>Object.entries(e.producciones||{}).map(([id,p])=>[id,[id,...p.alias]]);
// texto → {off:true} · {estudio, produccion|null, tema, acento, acentoTexto} · {error:'produccion', estudio} · null.
export function resolverEstudio(texto,E=ESTUDIOS){
  const partes=String(texto||'').trim().split(/[\s.\/·:_-]+/).map(claveModo).filter(Boolean);
  if(!partes.length)return null;
  if(partes.length===1&&/^(next|off|normal|admira|ninguno|default)$/.test(partes[0]))return {off:true};
  const junto=partes.join('');
  let estudio=Object.keys(E).find(id=>id===junto||E[id].alias.includes(junto))||'',resto='';
  if(!estudio){estudio=elegir(partes[0],estudiosOpc(E));resto=partes.slice(1).join('');}
  // Solo la producción («/modo jurassic»): se busca en todos los estudios.
  if(!estudio)for(const [id,e] of Object.entries(E)){if(elegir(junto,produccionesOpc(e))){estudio=id;resto=junto;break;}}
  if(!estudio)return null;
  const e=E[estudio],produccion=resto?elegir(resto,produccionesOpc(e)):'';
  if(resto&&!produccion)return {error:'produccion',estudio};
  return {estudio,produccion:produccion||null,tema:produccion?e.producciones[produccion].tema:e.base,acento:e.acento,acentoTexto:e.acentoTexto};
}
// Contraste WCAG.
const lum=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
export const contraste=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
// Variables CSS de la capa. El acento NO se toca: lo pone la marca.
export function variablesCine(id){
  const t=temaDe(id);if(!t)return {};
  const v={'--mb-cine-grano':String(t.grano),'--mb-cine-vineta':String(t.vineta),'--mb-cine-saturacion':String(t.gradacion.saturacion),'--mb-cine-contraste':String(t.gradacion.contraste),'--mb-cine-tinte':t.gradacion.tinte,'--mb-cine-tinte-fuerza':String(t.gradacion.tinteFuerza),'--mb-cine-aspecto':t.aspecto.replace(':',' / '),'--mb-cine-duracion':t.motion.duracionMs+'ms','--mb-cine-sombra-titulo':t.titulo.sombra||'none','--mb-fuente-titulos':t.tipografia.titulos,'--mb-fuente-texto':t.tipografia.texto,'--mb-transform-titulos':t.tipografia.transformTitulos,'--mb-tracking-titulos':t.tipografia.trackingTitulos};
  for(const [k,val] of Object.entries(t.colores))v['--mb-'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())]=val;
  return v;
}
export function aplicarCine(el,id){
  if(!el)return null;const prev=el.dataset.mbTema;
  if(prev&&TEMAS[prev])for(const k of Object.keys(variablesCine(prev)))el.style.removeProperty(k);
  const t=temaDe(id);if(!t){delete el.dataset.mbTema;return null;}
  for(const [k,val] of Object.entries(variablesCine(id)))el.style.setProperty(k,val);
  el.dataset.mbTema=id;cargarFuente(el.ownerDocument,t);return t;
}
function cargarFuente(doc,t){
  if(!doc||!/^https:\/\/fonts\.googleapis\.com\/css2\?/.test(t.tipografia.google))return;
  if(doc.querySelector('link[data-mb-tema-fuente="'+t.id+'"]'))return;
  const l=doc.createElement('link');l.rel='stylesheet';l.href=t.tipografia.google;l.dataset.mbTemaFuente=t.id;doc.head?.append(l);
}
// Capa para canvas (miniaturas 4K): gradación, viñeta, grano y barras. Respeta el acento ya pintado.
export function pintarCineCanvas(ctx,id,w=1280,h=720,rand=Math.random){
  const t=temaDe(id);if(!t)return false;
  const g=t.gradacion;
  if(g.saturacion<1){ctx.save();ctx.globalCompositeOperation='saturation';ctx.globalAlpha=1-g.saturacion;ctx.fillStyle='#808080';ctx.fillRect(0,0,w,h);ctx.restore();}
  if(g.tinteFuerza>0){ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=g.tinteFuerza*3;ctx.fillStyle=g.tinte;ctx.fillRect(0,0,w,h);ctx.restore();}
  if(t.vineta>0){const r=ctx.createRadialGradient(w/2,h/2,h*.35,w/2,h/2,Math.hypot(w,h)/1.6);r.addColorStop(0,'rgba(0,0,0,0)');r.addColorStop(1,'rgba(0,0,0,'+t.vineta+')');ctx.fillStyle=r;ctx.fillRect(0,0,w,h);}
  if(t.grano>0){ctx.save();const n=Math.round(w*h/180*t.grano);for(let i=0;i<n;i++){const v=rand()>.5?255:0;ctx.fillStyle='rgba('+v+','+v+','+v+','+(.05+rand()*.08)+')';ctx.fillRect(rand()*w,rand()*h,1.2,1.2);}ctx.restore();}
  const [a,b]=t.aspecto.split(':').map(Number),ratio=a/b;
  if(ratio>w/h){const bar=(h-w/ratio)/2;ctx.fillStyle='#000';ctx.fillRect(0,0,w,bar);ctx.fillRect(0,h-bar,w,bar);}
  return true;
}
// Sonido: solo sintetizado, solo tras gesto del usuario. Devuelve una función para pararlo.
const ONDA={'ochenta-mundo-del-reves':'sawtooth','regencia-romantica':'triangle','gran-estudio-clasico':'sawtooth','accion-aerea':'sawtooth','amarillo-travieso':'triangle','escuela-de-magia':'triangle','viaje-en-el-tiempo':'square','mundo-de-plataformas':'square'};
export function sonarTema(id,AudioCtx=globalThis.AudioContext||globalThis.webkitAudioContext){
  const t=temaDe(id);if(!t||!t.sonido||t.sonido.tipo!=='sintetico'||!AudioCtx)return ()=>{};
  const ac=new AudioCtx(),out=ac.createGain();out.gain.value=0.0001;out.connect(ac.destination);
  out.gain.exponentialRampToValueAtTime(0.12,ac.currentTime+0.6);
  const osc=ac.createOscillator();osc.type=ONDA[t.id]||'sine';osc.frequency.value=t.sonido.base;osc.connect(out);osc.start();
  if(t.sonido.ruido>0){const len=ac.sampleRate*2,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*t.sonido.ruido;const src=ac.createBufferSource();src.buffer=buf;src.loop=true;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=t.id==='ochenta-mundo-del-reves'?2400:900;src.connect(f);f.connect(out);src.start();}
  return ()=>{try{out.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+0.3);setTimeout(()=>ac.close(),400);}catch{}};
}
