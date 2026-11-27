(() => {
 const name=location.pathname.split('/').filter(Boolean).pop();
 const physical={admiranext01:'/supercomputer/', 'admiranext05':'/supercomputer/pc-cocina/','stream-deck':'/objeto/stream-deck/','galleon-100':'/objeto/galleon-100/'};
 const nav=document.createElement('nav');nav.className='twin-navigation';nav.setAttribute('aria-label','AInimation Studio');
 // La ayuda abre en la sección de ESTE gemelo (anclas id="<gemelo>" en /digital-twins/help/); el índice y la propia ayuda, arriba.
 const ayuda='/digital-twins/help/'+(name&&name!=='digital-twins'&&name!=='help'?'#'+name:'');
 for(const [label,url] of [['AInimation Studio','/'],['Digital twins','/digital-twins/'],['Admira Director','/studio.html'],['Ayuda / Help',ayuda]]){const a=document.createElement('a');a.textContent=label;a.href=url;nav.append(a);}
 if(physical[name]){const a=document.createElement('a');a.textContent='Hardware · consola / console';a.href='https://www.admira.store'+physical[name]+'?hardware=1';a.target='_blank';a.rel='noopener';nav.append(a);}
 if(name==='galleon-100'){const create=document.createElement('a');create.textContent='Crear animación en Director';create.href='/studio.html?twin=galleon-100#workspace';nav.append(create);}
 document.body.prepend(nav);document.documentElement.style.setProperty('--xs-bar-h','48px');
 if(name==='galleon-100')document.querySelector('main').style.paddingTop='48px';
})();
