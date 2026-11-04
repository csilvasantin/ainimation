import {mountQuadraticHeader} from './site-shell.mjs';
// Contextual four-band chrome inside the existing detail, never a second site header.
// Panels overlay the canvas; opening them must not resize or reposition it.
export function mountCapsuleShell({dialog,form,doc=document,win=window,t}){
 const $=selector=>dialog.querySelector(selector),header=$('header'),tools=$('.capsule-preview-tools');
 const optionsButton=$('[data-options-toggle]'),advancedButton=$('[data-advanced-toggle]');
 const options=doc.createElement('aside');options.className='capsule-options';options.hidden=true;
 options.id='capsule-options';options.setAttribute('aria-label',t('Opciones de la cápsula','Capsule options'));
 const heading=doc.createElement('h3');heading.textContent=t('Opciones','Options');options.append(heading);
 const closeOptions=doc.createElement('button');closeOptions.type='button';closeOptions.textContent=t('Cerrar Opciones','Close Options');options.append(closeOptions);
 const formHeading=doc.createElement('h3');formHeading.textContent=t('Avanzado · contenido y generación','Advanced · content and rendering');
 const closeAdvanced=doc.createElement('button');closeAdvanced.type='button';closeAdvanced.textContent=t('Cerrar Avanzado','Close Advanced');
 form.prepend(formHeading,closeAdvanced);form.classList.add('capsule-advanced');form.id='capsule-advanced';form.hidden=true;
 advancedButton.setAttribute('aria-controls',form.id);optionsButton.setAttribute('aria-controls',options.id);
 for(const label of Array.from(tools.querySelectorAll('label')))options.append(label);
 options.append($('[data-reset-position]'));
 const description=header.nextElementSibling;if(description?.tagName==='P')options.append(description);
 const live=$('.capsule-live');const liveTitle=live.querySelector('h3');if(liveTitle){const help=liveTitle.nextElementSibling;if(help?.tagName==='P')options.append(help);liveTitle.remove();}
 const note=$('.capsule-preview-note');if(note)options.append(note);
 for(const node of Array.from($('[data-live-host]').parentElement.children))if(!node.hasAttribute('data-live-host'))options.append(node);
 dialog.append(options);
 for(const selector of ['[data-undo]','[data-redo]','[data-save]'])tools.append($(selector));
 const review=doc.createElement('button');review.type='button';review.dataset.reviewRender='';review.textContent=t('Revisar y generar','Review and render');tools.append(review);
 const statusbar=doc.createElement('div');statusbar.className='capsule-statusbar';header.after(statusbar);statusbar.append($('[data-status]'),$('[data-save-status]'));
 const ui=mountQuadraticHeader(header,{doc,win,panels:{options,advanced:form},buttons:{options:optionsButton,advanced:advancedButton,expert:$('[data-expert-reserved]')},host:dialog});
 closeOptions.onclick=()=>ui.hide('options');closeAdvanced.onclick=()=>ui.hide('advanced');
 review.onclick=()=>{ui.show('advanced');form.elements.secret.focus({preventScroll:true});};
 return {openAdvanced:()=>ui.show('advanced'),destroy:()=>ui.destroy()};
}
