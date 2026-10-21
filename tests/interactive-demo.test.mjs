import test from 'node:test';
import assert from 'node:assert/strict';
import {mountInteractiveDemo} from '../assets/interactive-demo.mjs';

function fixture({search='',blocked=false,lang='es'}={}) {
  const elements=new Map();
  for(const id of ['interactiveDemo','interactiveDemoVideo','demoPlaybackStatus','expertCommandForm','expertCommand','expertCommandStatus','closeInteractiveDemo']) {
    const element=new EventTarget();element.textContent='';elements.set(id,element);
  }
  const buttons=[new EventTarget(),new EventTarget()],dialog=elements.get('interactiveDemo'),video=elements.get('interactiveDemoVideo');
  dialog.open=false;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new Event('close'));};
  video.plays=0;video.pauses=0;video.play=()=>{video.plays++;return blocked?Promise.reject(Error('gesture required')):Promise.resolve();};video.pause=()=>{video.pauses++;};
  const doc={documentElement:{lang},location:{search},getElementById:id=>elements.get(id),querySelectorAll:()=>buttons};
  mountInteractiveDemo(doc);
  const command=value=>{elements.get('expertCommand').value=value;const event=new Event('submit',{cancelable:true});elements.get('expertCommandForm').dispatchEvent(event);assert.ok(event.defaultPrevented);};
  return {elements,buttons,dialog,video,command};
}

test('ambos botones abren el mismo vídeo y cerrar o Escape detiene su sonido',()=>{
  const f=fixture();f.buttons[0].dispatchEvent(new Event('click'));assert.ok(f.dialog.open);assert.equal(f.video.plays,1);
  f.elements.get('closeInteractiveDemo').dispatchEvent(new Event('click'));assert.equal(f.dialog.open,false);assert.equal(f.video.pauses,1);
  f.buttons[1].dispatchEvent(new Event('click'));assert.ok(f.dialog.open);assert.equal(f.video.plays,2);
  f.dialog.dispatchEvent(new Event('close'));assert.equal(f.video.pauses,2);
});
test('el comando de Experto acepta ES/EN, evita navegación y rechaza otros comandos',()=>{
  const f=fixture();f.command(' /DEMO   interactivo ');assert.ok(f.dialog.open);assert.equal(f.video.plays,1);
  f.dialog.close();f.command('/demo interactive');assert.equal(f.video.plays,2);
  f.dialog.close();for(const unknown of ['/demo interactivo borrar','/demo','javascript:alert(1)',''])f.command(unknown);
  assert.equal(f.dialog.open,false);assert.equal(f.video.plays,2);assert.match(f.elements.get('expertCommandStatus').textContent,/no reconocido/);
});
test('un bloqueo de reproducción conserva el diálogo y explica cómo iniciar el vídeo',async()=>{
  const f=fixture({blocked:true});f.command('/demo interactivo');await Promise.resolve();assert.ok(f.dialog.open);assert.match(f.elements.get('demoPlaybackStatus').textContent,/Reproducir/);
  f.video.dispatchEvent(new Event('error'));assert.match(f.elements.get('demoPlaybackStatus').textContent,/Abrir vídeo/);
});
test('el enlace de demo se abre sin autoplay, sin acceso a biblioteca ni cambiar el idioma',()=>{
  const f=fixture({search:'?demo=interactivo',lang:'en'});assert.ok(f.dialog.open);assert.equal(f.video.plays,0);
  f.dialog.close();f.command('/demo interactive');assert.match(f.elements.get('expertCommandStatus').textContent,/Opening/);
});
