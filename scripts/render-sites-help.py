"""Build the Sites help tutorial from real CUA screenshots and local Spanish speech.

Requires Pillow, ffmpeg/ffprobe and the macOS Mónica voice. No network or credentials.
Run from this checkout: python scripts/render-sites-help.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, subprocess, textwrap, hashlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'docs/tutorials/sites-import/captures'
OUTPUT=ROOT/'help/media'
WORK=Path('/private/tmp/ainimation-site-demo/render')
WORK.mkdir(parents=True,exist_ok=True)
OUTPUT.mkdir(parents=True,exist_ok=True)
W,H,FPS=1920,1080,25
REG='/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font=lambda size,bold=False:ImageFont.truetype(BOLD if bold else REG,size)
BG='#0c0c14';LIME='#c3ff6b';INK='#f6f4ff';DIM='#aaa6be'

SCENES=[
 {'shot':'01-home','title':'Abre\nSites.','action':'Desde el menú de la portada.','crop':[0,0,1010,590],
  'target':[846,35],
  'es':'Para importar una web, entra en AINimation Studio y abre Sites, en el menú de la portada.',
  'en':'To import a web page, open AINimation Studio and choose Sites from the home-page menu.'},
 {'shot':'02-url','title':'Pega\nla URL.','action':'En Opciones, importa una página.','crop':[0,0,335,502],'target':[30,32],
  'es':'Abre Opciones. Pega la URL de la página o selecciona un site guardado. Usaremos PortAventura NeXT.',
  'en':'Open Options. Paste the page URL or select a saved site. We will use PortAventura NeXT.'},
 {'shot':'03-import','title':'Importa\nuna copia.','action':'Pulsa «Importar página».','crop':[0,112,335,502],'target':[164,356],
  'es':'Pulsa Importar página. AINimation prepara una copia editable, sin modificar la web original.',
  'en':'Click Import page. AINimation creates an editable copy without changing the original website.'},
 {'shot':'04-imported','title':'Revisa\nel resultado.','action':'Diseño y componentes disponibles.','crop':[10,155,1015,855],'target':[400,450],
  'es':'La vista previa muestra el diseño y sus componentes. Los scripts, el canvas y los datos en directo originales necesitan recrearse.',
  'en':'The preview shows the design and its components. Original scripts, canvas and live data need to be recreated.'},
 {'shot':'05-select','title':'Selecciona\nun texto.','action':'Haz clic directamente en la página.','crop':[10,155,1015,855],'target':[230,450],
  'es':'Haz clic sobre un texto de la página para seleccionar su elemento. También puedes usar la lista de componentes.',
  'en':'Click text on the page to select its element. You can also use the components list.'},
 {'shot':'06-text','title':'Edita\nel borrador.','action':'Avanzado · propiedades del elemento.','crop':[652,160,1025,610],'target':[837,300],
  'es':'En Avanzado, cambia el texto en sus propiedades. El resultado se aplica solo a tu borrador y puedes deshacerlo.',
  'en':'In Advanced, change the text in its properties. The change applies only to your draft and can be undone.'},
 {'shot':'07-animation','title':'Añade\nmovimiento.','action':'Elige animación y duración.','crop':[652,160,1025,610],'target':[837,460],
  'es':'Elige una animación y ajusta su duración o retraso. Los efectos respetan la preferencia de movimiento reducido.',
  'en':'Choose an animation and adjust its duration or delay. Effects respect the visitor’s reduced-motion preference.'},
 {'shot':'08-media','title':'Carga\ntus medios.','action':'Imágenes y vídeos del ordenador.','crop':[0,540,335,950],'target':[160,680],
  'es':'Vuelve a Opciones. En Añadir imagen o vídeo, pulsa Cargar desde el ordenador para incluir tus archivos en la copia.',
  'en':'Return to Options. Under Add image or video, choose Load from computer to include your files in the copy.'},
 {'shot':'09-expert','title':'Experto,\na tu ritmo.','action':'Consola opcional · empieza con /help.','crop':[0,829,1025,1169],'target':[470,1125],
  'es':'Experto es opcional. Abre su consola y escribe barra help para consultar las órdenes disponibles sobre tu copia.',
  'en':'Expert is optional. Open its console and type slash help to see the commands available for your copy.'},
 {'shot':'10-export','title':'Descarga\ntu versión.','action':'Proyecto editable o HTML.','crop':[0,56,1025,650],'target':[750,90],
  'es':'Descarga el proyecto para seguir editando, o exporta HTML. Los archivos locales quedan incluidos. La web original permanece intacta.',
  'en':'Download the project to keep editing, or export HTML. Local files are included. The original website stays unchanged.'}
]

def run(args,**kw):
 return subprocess.run(args,check=True,**kw)

def duration(path):
 return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],text=True).strip())

def lines(draw,text,f,width):
 result=[]
 for paragraph in text.split('\n'):
  current=''
  for word in paragraph.split():
   trial=(current+' '+word).strip()
   if current and draw.textlength(trial,font=f)>width:result.append(current);current=word
   else:current=trial
  result.append(current)
 return result

def make_card(index,scene):
 image=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(image)
 d.rounded_rectangle((44,38,104,98),radius=14,fill=LIME)
 d.text((58,48),'AI',font=font(34,True),fill=BG)
 d.text((124,44),'AINIMATION',font=font(27,True),fill=INK)
 d.text((125,78),'HELP / SITES',font=font(16),fill=DIM)
 d.text((1535,62),'DEMO · PORTAVENTURA',font=font(19),fill=DIM)
 d.line((64,136,1856,136),fill='#30303e',width=2)
 d.text((64,198),f'{index+1:02d} / {len(SCENES):02d}',font=font(22,True),fill=LIME)
 y=260
 for line in scene['title'].split('\n'):
  d.text((60,y),line,font=font(58,True),fill=INK);y+=70
 for line in lines(d,scene['action'],font(27),390):
  d.text((64,y+28),line,font=font(27),fill=DIM);y+=38
 d.rounded_rectangle((64,670,430,754),radius=12,outline='#3f4735',width=2,fill='#151b14')
 d.text((83,691),'COPIA EDITABLE',font=font(20,True),fill=LIME)
 d.text((83,721),'El original no cambia.',font=font(17),fill=DIM)
 # A magnified crop of the actual UI, never a recreated interface.
 src=Image.open(SOURCE/(scene['shot']+'.png')).convert('RGB')
 x0,y0,x1,y1=scene['crop'];crop=src.crop((x0,y0,min(x1,src.width),min(y1,src.height)))
 box=(500,195,1856,874);bw,bh=box[2]-box[0],box[3]-box[1]
 scale=min((bw-24)/crop.width,(bh-24)/crop.height)
 resized=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 px=box[0]+(bw-resized.width)//2;py=box[1]+(bh-resized.height)//2
 d.rounded_rectangle(box,radius=17,fill='#14141d',outline='#454451',width=2)
 image.paste(resized,(px,py))
 tx=px+(scene['target'][0]-x0)*scale;ty=py+(scene['target'][1]-y0)*scale
 tx=max(px+18,min(px+resized.width-18,tx));ty=max(py+18,min(py+resized.height-18,ty))
 d=ImageDraw.Draw(image)
 d.text((502,896),'Capturas reales · Vista ampliada para mostrar cada paso',font=font(17),fill=DIM)
 d.text((64,1016),'www.ainimation.studio/sites/',font=font(23,True),fill=LIME)
 for i in range(len(SCENES)):
  d.rounded_rectangle((1420+i*48,1020,1455+i*48,1027),radius=3,fill=LIME if i<=index else '#343341')
 image.save(WORK/f'card-{index:02d}.png')
 return image,(tx,ty)

def timestamp(t,sep='.'):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}'

def split_captions(text):
 words=text.split();n=max(1,math.ceil(len(words)/12));size=math.ceil(len(words)/n)
 return [' '.join(words[i:i+size]) for i in range(0,len(words),size)]

timeline=[];start=0
for i,scene in enumerate(SCENES):
 voice=WORK/f'voice-{i:02d}.aiff';text=WORK/f'voice-{i:02d}.txt';text.write_text(scene['es'])
 run(['say','-v','Mónica','-r','174','-f',str(text),'-o',str(voice)])
 length=max(4.5,duration(voice)+1.0);frames=math.ceil(length*FPS);length=frames/FPS
 base,target=make_card(i,scene)
 out=WORK/f'segment-{i:02d}.mp4'
 args=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(voice),'-af','adelay=250|250,apad','-t',str(length),'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-ar','48000','-movflags','+faststart',str(out)]
 proc=subprocess.Popen(args,stdin=subprocess.PIPE)
 try:
  for frame in range(frames):
   t=frame/FPS;im=base.copy();draw=ImageDraw.Draw(im)
   # Motion is an editorial pointer over the captured UI, not an invented click.
   p=min(1,max(0,(t-.2)/1.1));p=1-(1-p)**3
   tx,ty=target;cx=tx+95*(1-p);cy=ty+80*(1-p)
   pulse=26+5*math.sin(t*4)
   draw.ellipse((tx-pulse,ty-pulse,tx+pulse,ty+pulse),outline=LIME,width=3)
   draw.polygon([(cx,cy),(cx+6,cy+35),(cx+15,cy+24),(cx+30,cy+25)],fill='#ffffff',outline='#111111',width=2)
   # Legible open captions, with a separate optional English WebVTT track.
   pieces=split_captions(scene['es']);idx=min(len(pieces)-1,int(max(0,t-.25)/max(.1,(length-.5)/len(pieces))))
   for row,line in enumerate(lines(draw,pieces[idx],font(29),1650)):
    width=draw.textlength(line,font=font(29));draw.text(((W-width)/2,939+row*34),line,font=font(29),fill=INK)
   proc.stdin.write(im.tobytes())
 finally:proc.stdin.close()
 if proc.wait():raise RuntimeError('No se ha codificado el segmento.')
 timeline.append({**scene,'start':start,'end':start+length,'duration':length});start+=length
 print(f'Segmento {i+1}/{len(SCENES)} · {length:.2f} s',flush=True)

playlist=WORK/'segments.txt';playlist.write_text(''.join("file '"+str(WORK/f'segment-{i:02d}.mp4')+"'\n" for i in range(len(SCENES))))
video=OUTPUT/'importar-site-portaventura.mp4'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(playlist),'-c','copy','-movflags','+faststart',str(video)])
for lang in ['es','en']:
 cues=['WEBVTT','']
 for scene in timeline:
  pieces=split_captions(scene[lang]);step=scene['duration']/len(pieces)
  for i,piece in enumerate(pieces):
   cues.extend([timestamp(scene['start']+i*step)+' --> '+timestamp(scene['start']+(i+1)*step)+' line:12% position:50% align:center size:90%',piece,''])
 (OUTPUT/f'importar-site-portaventura.{lang}.vtt').write_text('\n'.join(cues))
 # Human-readable transcript beside the video.
 (OUTPUT/f'importar-site-portaventura.{lang}.txt').write_text('\n\n'.join(scene[lang] for scene in SCENES)+'\n')
poster=Image.open(WORK/'card-03.png');d=ImageDraw.Draw(poster)
d.rounded_rectangle((495,340,1810,700),radius=22,fill='#0c0c14')
d.text((550,390),'Importa un site.',font=font(90,True),fill=INK)
d.text((550,505),'Edítalo. Dale movimiento.',font=font(51),fill=LIME)
d.text((550,600),'PortAventura NeXT · Demo guiada',font=font(28),fill=DIM)
poster.save(OUTPUT/'importar-site-portaventura.jpg',quality=91)
manifest={'format':'ainimation-help-video','version':1,'source':'Real CUA screenshots of the AINimation UI, including the quadratic interface in local QA and the public PortAventura page','voice':'Mónica, es-ES, local macOS synthesis','width':W,'height':H,'fps':FPS,'duration':duration(video),'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'scenes':timeline}
(ROOT/'docs/tutorials/sites-import/video.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'video':str(video),'seconds':manifest['duration'],'bytes':video.stat().st_size}),flush=True)
