import {conflictFixture} from './conflict-fixtures.mjs';
import {createSession} from './session.mjs';
import {changesBetween} from './project.mjs';
import {resolveRevisions} from './conflict-resolution.mjs';

const FORMAT='ainimation-fixture-recovery',MAX_BYTES=180000,MAX_ACTIONS=300;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bytes=value=>new TextEncoder().encode(value).length;
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...keys].sort());
const fail=message=>{throw Error(message);};
export const fixtureRecoveryKey=(kind,phase='before-save')=>`ainimation.fixture-recovery.v1:${kind}:${phase}`;

export function fixtureRecoveryAllowed(location,remote=false){
  if(remote||location?.protocol!=='http:'||!['localhost','127.0.0.1'].includes(location.hostname))return false;
  const params=new URLSearchParams(location.search);
  return ['site','presentation'].includes(params.get('conflictFixture'))&&!params.has('origin')&&!params.has('channel');
}

// This store only replays commands against code-owned fictitious fixtures. It
// never accepts a project, client, asset bytes, credentials or remote adapter.
export function createFixtureRecovery({location,remote=false,storage}){
  if(!fixtureRecoveryAllowed(location,remote))return null;
  const params=new URLSearchParams(location.search),kind=params.get('conflictFixture'),phase=params.get('conflictPhase')==='after-save'?'after-save':'before-save';
  const data=conflictFixture(kind),basis=JSON.stringify({original:data.original,current:data.current}),key=fixtureRecoveryKey(kind,phase);
  const fieldIds=new Set(data.original.fields.map(field=>field.id));
  const media=new Set(['builtin:orbita','',...Object.values(data.resources)]);
  const cleanDecisions=input=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>fieldIds.size)fail('decisions');
    for(const [id,choice]of Object.entries(input))if(!fieldIds.has(id)||!['draft','current','original'].includes(choice))fail('decisions');
    return structuredClone(input);
  };
  const initial=()=>{const session=createSession(data.original);for(const change of changesBetween(data.original,data.draft).changes)session.edit(change.field,change.after);return session;};
  function apply(session,action){
    if(action?.type==='edit'&&exactKeys(action,['type','field','value'])){
      if(!fieldIds.has(action.field)||(['thumbnail-image','thumbnail-logo'].includes(action.field)&&!media.has(action.value)))fail('field');
      session.edit(action.field,action.value);
    }else if(action?.type==='resolve'&&exactKeys(action,['type','decisions'])){
      const result=resolveRevisions(session.original,session.draft,data.current,cleanDecisions(action.decisions));session.rebase(result.current,result.draft);
    }else if(exactKeys(action,['type'])&&['undo','redo','reset'].includes(action.type)){
      if(action.type==='undo'&&!session.canUndo||action.type==='redo'&&!session.canRedo||action.type==='reset'&&!session.changes.changes.length)fail('history');
      session[action.type]();
    }else fail('action');
  }
  function decode(raw){
    if(typeof raw!=='string'||bytes(raw)>MAX_BYTES)fail('corrupt');
    const record=JSON.parse(raw);
    if(!exactKeys(record,['format','version','basis','kind','phase','actions','decisions','open','historyReviewed']))fail('incompatible');
    if(record.format!==FORMAT||record.version!==1||record.kind!==kind||record.phase!==phase||record.basis!==basis)fail('incompatible');
    if(!Array.isArray(record.actions)||record.actions.length>MAX_ACTIONS||typeof record.open!=='boolean'||typeof record.historyReviewed!=='boolean')fail('corrupt');
    const decisions=cleanDecisions(record.decisions),session=initial();
    for(const action of record.actions)apply(session,action);
    return {session,actions:structuredClone(record.actions),decisions,open:record.open,historyReviewed:record.historyReviewed};
  }
  let device,expected=null,actions=[],session=initial(),ui={decisions:{},open:true,historyReviewed:false},state='new',blocked=false;
  const block=reason=>{blocked=true;state=reason;};
  try{
    device=storage();expected=device.getItem(key);
    if(expected!==null){
      try{const restored=decode(expected);session=restored.session;actions=restored.actions;ui={decisions:restored.decisions,open:restored.open,historyReviewed:restored.historyReviewed};state='restored';}
      catch(error){block(error.message==='incompatible'?'incompatible':'corrupt');}
    }
  }catch{block('unavailable');}
  function record(action){
    if(blocked)return;
    if(actions.length>=MAX_ACTIONS){block('limit');return;}
    actions.push(structuredClone(action));
  }
  const wrapped={
    get original(){return session.original;},get draft(){return session.draft;},get changes(){return session.changes;},get canUndo(){return session.canUndo;},get canRedo(){return session.canRedo;},
    edit(field,value){
      // The editor can still work if recovery is blocked; unsupported references
      // simply stop persistence rather than entering storage.
      const before=session.draft,result=session.edit(field,value);
      if(!same(before,result)){
        if(['thumbnail-image','thumbnail-logo'].includes(field)&&!media.has(value))block('unsupported');
        else record({type:'edit',field,value});
      }
      return result;
    },
    rebase(current,draft,decisions){
      const selected=cleanDecisions(decisions),resolved=resolveRevisions(session.original,session.draft,data.current,selected);
      if(!same(current,resolved.current)||!same(draft,resolved.draft))fail('La resolución no corresponde al ensayo ficticio.');
      const result=session.rebase(current,draft);record({type:'resolve',decisions:selected});return result;
    },
    undo(){const can=session.canUndo,result=session.undo();if(can)record({type:'undo'});return result;},
    redo(){const can=session.canRedo,result=session.redo();if(can)record({type:'redo'});return result;},
    reset(){const dirty=!!session.changes.changes.length,result=session.reset();if(dirty)record({type:'reset'});return result;}
  };
  return {
    kind,phase,key,data,session:wrapped,
    get ui(){return structuredClone(ui);},get state(){return state;},get blocked(){return blocked;},
    persist(next){
      if(blocked)return false;
      try{
        const decisions=cleanDecisions(next.decisions);
        if(typeof next.open!=='boolean'||typeof next.historyReviewed!=='boolean')fail('ui');
        const raw=JSON.stringify({format:FORMAT,version:1,basis,kind,phase,actions,decisions,open:next.open,historyReviewed:next.historyReviewed});
        if(bytes(raw)>MAX_BYTES){block('limit');return false;}
        // Validate a replay before replacing the last good copy. Never repair,
        // retry, delete or overwrite unknown/corrupt or externally changed data.
        const restored=decode(raw);
        if(!same(restored.session.original,session.original)||!same(restored.session.draft,session.draft))fail('replay');
        if(device.getItem(key)!==expected){block('changed');return false;}
        ui={decisions,open:next.open,historyReviewed:next.historyReviewed};
        if(raw===expected)return true;
        device.setItem(key,raw);expected=raw;state='saved';return true;
      }catch{block('unavailable');return false;}
    }
  };
}

export function fixtureRecoveryMessage(state){
  const messages={new:'Los ajustes y decisiones de este ensayo se copiarán sólo en esta pestaña al cambiarlos.',restored:'Borrador, revisión y decisiones recuperados al recargar. Sólo datos ficticios.',saved:'Borrador y decisiones conservados en esta pestaña. Puedes recargar para recuperarlos.',corrupt:'La copia local está dañada. Se conserva intacta; los ajustes nuevos sólo quedan en memoria.',incompatible:'La copia local pertenece a otro formato o revisión. Se conserva intacta; no se ha recuperado ni sustituido.',unavailable:'No se pudo acceder a la copia de esta pestaña. No se reintentará escribir; puedes descargar los ajustes.',changed:'La copia local cambió fuera de este ensayo. Se conserva intacta; la recuperación queda detenida.',limit:'La copia alcanzó el límite del ensayo. Se conserva el último guardado; puedes descargar los ajustes actuales.',unsupported:'Este recurso no pertenece al ensayo ficticio. La recuperación queda detenida sin sustituir la copia.'};
  return messages[state]||messages.unavailable;
}
