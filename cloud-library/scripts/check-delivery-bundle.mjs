// Run against Wrangler's emitted Worker, where function serialization can change.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {demoProject} from '../../assets/interactive-demo-project.mjs';
const {default:worker}=await import(pathToFileURL(process.argv[2]).href);
const id='a'.repeat(64),row={id,project:JSON.stringify(demoProject())};
const response=await worker.fetch(new Request('https://preview.test/api/deliveries/'+id+'/player'),{LIBRARY_DB:{prepare:()=>({bind:()=>({first:async()=>row})})}});
assert.equal(response.status,200);const html=await response.text(),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const doc={createElement:()=>({append(){},setAttribute(){}})},root={ownerDocument:doc,replaceChildren(){},append(){},addEventListener(){}};
vm.runInNewContext(script,{document:{getElementById:()=>root},setTimeout,clearTimeout});
assert.doesNotMatch(script,/\b__name\b/);console.log('Bundled Worker: exported interactive runtime executes independently.');
