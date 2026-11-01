import {validateProject,editField,changesBetween} from './project.mjs';

export function createSession(input) {
  const original=validateProject(input);
  let states=[original],cursor=0;
  const read=()=>structuredClone(states[cursor]);
  return {
    get original(){return structuredClone(original);},
    get draft(){return read();},
    get canUndo(){return cursor>0;},
    get canRedo(){return cursor<states.length-1;},
    get changes(){return changesBetween(original,states[cursor]);},
    edit(id,value){
      const next=editField(states[cursor],id,value);
      if(!changesBetween(states[cursor],next).changes.length)return read();
      states=states.slice(0,cursor+1);states.push(next);
      if(states.length>100)states.shift();
      cursor=states.length-1;return read();
    },
    undo(){if(cursor>0)cursor--;return read();},
    redo(){if(cursor<states.length-1)cursor++;return read();},
    reset(){
      if(!changesBetween(original,states[cursor]).changes.length)return read();
      states=states.slice(0,cursor+1);states.push(structuredClone(original));
      if(states.length>100)states.shift();cursor=states.length-1;return read();
    }
  };
}
