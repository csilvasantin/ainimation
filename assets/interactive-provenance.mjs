// A short browser-local label distinguishes sessions without collecting a hostname.
export function deviceLabel(storage,nav=globalThis.navigator){
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
