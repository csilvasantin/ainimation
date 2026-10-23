const NAME_KEY='ainimation:device-name:v1';
export function deviceName(storage){try{const value=storage.getItem(NAME_KEY);return typeof value==='string'&&value.trim().length<=60&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():'';}catch{return '';}}
export function setDeviceName(storage,value){
 if(typeof value!=='string'||value.trim().length>60||/[\u0000-\u001f\u007f]/.test(value))throw Error('Usa un nombre de hasta 60 caracteres, sin saltos de línea.');
 const name=value.trim();storage.setItem(NAME_KEY,name);return name;
}
// A short browser-local label distinguishes unnamed sessions without a hostname.
export function deviceLabel(storage,nav=globalThis.navigator){
 const custom=deviceName(storage);if(custom)return custom;
 let code;try{code=storage.getItem('ainimation:device-label:v1');if(!/^[A-F0-9]{6}$/.test(code||'')){code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase();storage.setItem('ainimation:device-label:v1',code);}}catch{return 'Dispositivo no registrado';}
 const ua=nav?.userAgent||'',platform=nav?.platform||'';
 const device=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)||platform==='MacIntel'&&nav?.maxTouchPoints>1?'iPad':/Android/.test(ua)?'Android':/Mac/.test(platform+ua)?'Mac':/Win/.test(platform+ua)?'Windows':/Linux/.test(platform+ua)?'Linux':'Equipo';
 return device+' · sesión '+code;
}
export function versionIdentity(record){
 const date=new Date(record.updatedAt),valid=typeof record.updatedAt==='string'&&Number.isFinite(date.getTime());
 const stamp=valid?new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'medium',timeZone:'Europe/Madrid'}).format(date)+' (Madrid)':'Fecha no registrada';
 const device=typeof record.sourceDevice==='string'&&record.sourceDevice.trim()?record.sourceDevice:'Dispositivo no registrado';
 return {date:stamp,device};
}

export function mountDeviceNaming({status,storage}){
 const doc=status.ownerDocument,box=doc.createElement('details'),summary=doc.createElement('summary'),form=doc.createElement('form'),label=doc.createElement('label'),input=doc.createElement('input'),save=doc.createElement('button'),reset=doc.createElement('button'),hint=doc.createElement('p'),message=doc.createElement('p');
 box.className='device-naming';summary.textContent='Nombre de este dispositivo';label.textContent='Nombre del dispositivo';input.type='text';input.maxLength=60;input.value=deviceName(storage);input.placeholder='Por ejemplo: Mac del estudio';label.append(input);
 save.type='submit';save.textContent='Guardar nombre';reset.type='button';reset.textContent='Usar nombre automático';hint.textContent='Se aplica a los próximos cambios guardados desde este navegador. Las versiones anteriores conservan su origen.';message.setAttribute('role','status');
 const show=()=>{summary.textContent='Nombre de este dispositivo: '+deviceLabel(storage);};
 form.onsubmit=event=>{event.preventDefault();try{const name=setDeviceName(storage,input.value);show();message.textContent=name?'Nombre guardado: '+name+'. Se usará en los próximos cambios.':'Se usará el nombre automático en los próximos cambios.';}catch(e){message.textContent=e.message;}};
 reset.onclick=()=>{try{setDeviceName(storage,'');input.value='';show();message.textContent='Se usará el nombre automático en los próximos cambios.';}catch(e){message.textContent=e.message;}};
 form.append(label,save,reset);box.append(summary,hint,form,message);status.after(box);show();return box;
}
