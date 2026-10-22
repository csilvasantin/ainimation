// Keep Google's frames in their original parents. Reparenting an active GSI
// iframe reloads it and can leave its popup without the matching message channel.
export function mountGoogleAuth({endpoint,doc=document,win=window,request=fetch,onVerified=()=>{},onSignedOut=()=>{},sdk}={}){
 const $=id=>doc.getElementById(id),t=(es,en)=>doc.documentElement.lang==='en'?en:es;
 const library=$('googleLogin'),dialog=$('loginDialog'),status=$('cloudStatus');
 let google,authenticated=false,generation=0,promptGeneration=0,accepting=true;
 const dialogHost=doc.createElement('div');dialogHost.id='googleDialogLogin';$('loginTarget').append(dialogHost);
 const promptHost=doc.createElement('div');promptHost.id='googleInlinePrompt';dialogHost.append(promptHost);
 const rendered=new Set();
 const explain=message=>{status.textContent=message;$('loginExplanation').textContent=message;};
 const controls=connected=>{library.hidden=dialogHost.hidden=connected;$('cloudLogout').hidden=!connected;for(const id of ['cloudSync','cloudPull','cloudProjectSync'])$(id).disabled=!connected;};
 async function credential(response){
  if(!accepting||authenticated)return;
  const attempt=++generation;
  try{
   if(typeof response?.credential!=='string'||!response.credential)throw Error(t('Google no ha completado el acceso. Vuelve a intentarlo.','Google has not completed sign-in. Try again.'));
   const check=await request(endpoint+'/projects',{headers:{authorization:'Bearer '+response.credential},signal:AbortSignal.timeout(30000)});
   if(attempt!==generation)return;
   if(!check.ok)throw Error(t('Esta cuenta no tiene acceso o la sesión ha caducado.','This account does not have access or the session expired.'));
   authenticated=true;promptGeneration++;controls(true);
   status.dataset.googleSignInMethod=String(response.select_by||'google').slice(0,40);
   status.dataset.googleSignInButton=String(response.state||'unknown').slice(0,40);
   explain(t('Cuenta verificada. Pulsa sincronizar para conservar y combinar tus proyectos.','Account verified. Sync to keep and combine your projects.'));
   onVerified(response.credential);
  }catch(error){if(attempt===generation&&!authenticated)explain(error.name==='TimeoutError'?t('Google respondió, pero no se pudo comprobar la cuenta a tiempo. Tus proyectos se conservan.','Google responded, but account verification timed out. Your projects are preserved.'):error.message);}
 }
 function render(host,name){
  if(!google||rendered.has(host))return;rendered.add(host);
  const buttonHost=doc.createElement('div');buttonHost.className='google-signin-button';host.append(buttonHost);
  google.renderButton(buttonHost,{theme:'outline',size:'large',text:'signin_with',state:name,click_listener:()=>{accepting=true;promptGeneration++;status.dataset.googleSignInAttempt='popup';}});
  const inline=doc.createElement('button');inline.type='button';inline.className='quiet';inline.textContent=t('Continuar con Google aquí','Continue with Google here');inline.onclick=()=>{
   if(!dialog.open)dialog.showModal();render(dialogHost,'account');accepting=true;const attempt=++promptGeneration;
   status.dataset.googleSignInAttempt='inline';explain(t('Completa la confirmación de Google en esta página.','Complete the Google confirmation on this page.'));
   try{google.prompt(note=>{if(authenticated||attempt!==promptGeneration)return;if(note.isNotDisplayed?.()||note.isSkippedMoment?.()){status.dataset.googlePromptReason=note.getNotDisplayedReason?.()||note.getSkippedReason?.()||'unavailable';explain(t('Google no pudo mostrar la confirmación. Puedes usar el botón de Google de esta ventana. Tus proyectos se conservan.','Google could not show the confirmation. You can use this window’s Google button. Your projects are preserved.'));}});}catch{if(!authenticated&&attempt===promptGeneration)explain(t('Google no pudo abrir la confirmación. Tus proyectos se conservan.','Google could not open the confirmation. Your projects are preserved.'));}
  };host.append(inline);
 }
 win.addEventListener('interactive-account-open',()=>{render(dialogHost,'account');if(authenticated)$('loginExplanation').textContent=t('Cuenta conectada. Tus proyectos locales se conservan.','Account connected. Your local projects are preserved.');});
 controls(false);
 const ready=(async()=>{
  if(!endpoint)return;
  try{
   const response=await request(endpoint+'/config');if(!response.ok)throw Error();const config=await response.json();if(!config.clientId)throw Error();
   if(!sdk)await new Promise((resolve,reject)=>{const script=doc.createElement('script');script.src='https://accounts.google.com/gsi/client';script.referrerPolicy='strict-origin-when-cross-origin';script.onload=resolve;script.onerror=reject;doc.head.append(script);});
   google=sdk||win.google?.accounts?.id;if(!google)throw Error();
   google.initialize({client_id:config.clientId,ux_mode:'popup',auto_select:true,prompt_parent_id:'googleInlinePrompt',callback:credential});
   render(library,'library');if(dialog.open)render(dialogHost,'account');
   explain(t('Conecta tu cuenta Google para sincronizar tu biblioteca.','Connect your Google account to sync your library.'));
   $('entryLogin').nextElementSibling.textContent=t('Acceso de prueba para las cuentas de Carlos. La biblioteca local se conserva.','Preview access for Carlos’s accounts. The local library is preserved.');
   win.dispatchEvent(new Event('interactive-login-ready'));
  }catch{explain(t('No se puede conectar con Google. Tus proyectos locales se conservan.','Cannot connect to Google. Your local projects are preserved.'));}
 })();
 return {ready,signOut(){accepting=false;authenticated=false;generation++;promptGeneration++;controls(false);google?.cancel?.();google?.disableAutoSelect?.();delete status.dataset.googleSignInMethod;delete status.dataset.googleSignInButton;explain(t('Cuenta desconectada. Tus proyectos locales se conservan.','Account disconnected. Your local projects are preserved.'));onSignedOut();}};
}
