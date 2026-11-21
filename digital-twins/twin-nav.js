(() => {
 const name=location.pathname.split('/').filter(Boolean).pop();
 const physical={admiranext01:'/supercomputer/', 'admiranext05':'/supercomputer/pc-cocina/','stream-deck':'/objeto/stream-deck/','galleon-100':'/objeto/galleon-100/'};
 const nav=document.createElement('nav');nav.className='twin-navigation';nav.setAttribute('aria-label','AInimation Studio');
 for(const [label,url] of [['AInimation Studio','/'],['Digital twins','/digital-twins/'],['Admira Director','/studio.html'],['Ayuda / Help','/digital-twins/help/']]){const a=document.createElement('a');a.textContent=label;a.href=url;nav.append(a);}
 if(physical[name]){const a=document.createElement('a');a.textContent='Hardware · consola / console';a.href='https://www.admira.store'+physical[name]+'?hardware=1';a.target='_blank';a.rel='noopener';nav.append(a);}
 document.body.prepend(nav);document.documentElement.style.setProperty('--xs-bar-h','48px');
 if(name==='galleon-100')document.querySelector('main').style.paddingTop='48px';
})();
