import {validateProject,editField,changesBetween} from './project.mjs';

export function createSession(input) {
  const original=validateProject(input);
  let states=[{original,draft:original}],cursor=0;
  const read=()=>structuredClone(states[cursor].draft);
  const push=frame=>{states=states.slice(0,cursor+1);states.push(frame);if(states.length>100)states.shift();cursor=states.length-1;return read();};
  return {
    get original(){return structuredClone(states[cursor].original);},
    get draft(){return read();},
    get canUndo(){return cursor>0;},
    get canRedo(){return cursor<states.length-1;},
    get changes(){return changesBetween(states[cursor].original,states[cursor].draft);},
    edit(id,value){
      const frame=states[cursor],next=editField(frame.draft,id,value);
      if(!changesBetween(frame.draft,next).changes.length)return read();
      return push({original:frame.original,draft:next});
    },
    rebase(current,draft){
      const base=validateProject(current),edited=validateProject(draft),before=states[cursor].original;
      changesBetween(base,edited);
      if(base.kind!==before.kind||base.source.adapter!==before.source.adapter||base.source.id!==before.source.id||base.source.revision===before.source.revision)throw Error('La resolución necesita otra revisión del mismo origen.');
      return push({original:base,draft:edited});
    },
    undo(){if(cursor>0)cursor--;return read();},
    redo(){if(cursor<states.length-1)cursor++;return read();},
    reset(){
      const frame=states[cursor];
      if(!changesBetween(frame.original,frame.draft).changes.length)return read();
      return push({original:frame.original,draft:structuredClone(frame.original)});
    }
  };
}
