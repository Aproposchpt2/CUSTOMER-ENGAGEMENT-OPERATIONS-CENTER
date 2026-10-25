import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(new URL('../twilio-bridge/server.js',import.meta.url));
const source=readFileSync('twilio-bridge/server.js','utf8').replace(/start\(\);\s*$/,'globalThis.provenance = imageProvenance;');
function inspect(file:string|null,reported='b'.repeat(40)){
 const context:any={require:(name:string)=>name==='node:fs'?{readFileSync:(path:string)=>{assert.equal(path,'/app/bridge-image-revision');if(file===null)throw Error('missing');return file;}}:require(name),__dirname:'/app',process:{env:{BRIDGE_RELEASE_SHA:reported},version:'v24.22.1'},Buffer,URL,AbortSignal,fetch:()=>{throw Error('Network forbidden');},console};
 vm.runInNewContext(source,context);
 return JSON.parse(JSON.stringify(context.provenance()));
}
test('Fly image provenance reports baked revision separately from a stale release secret',()=>{
 const result=inspect('a'.repeat(40)+'\n');assert.equal(result.imageRevision,'a'.repeat(40));assert.equal(result.revisionMismatch,true);assert.equal(result.nodeVersion,'v24.22.1');
 assert.equal(inspect('a'.repeat(40),'a'.repeat(40)).revisionMismatch,false);
});
test('missing or malformed image file never falls back to configured source provenance',()=>{
 for(const value of [null,'not-a-revision','a'.repeat(41)]){const result=inspect(value);assert.equal(result.imageRevision,null);assert.equal(result.revisionMismatch,null);assert.equal(JSON.stringify(result).includes('b'.repeat(40)),false);}
});
