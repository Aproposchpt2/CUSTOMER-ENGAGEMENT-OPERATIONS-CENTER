import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const dir='docs/pma-003/evidence';mkdirSync(dir,{recursive:true});
const results=[];
for(const [command,args,log]of [['npm',['test'],'npm-test.log'],['npx',['tsc','--noEmit'],'typecheck.log']]){
 const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:10*1024*1024});
 const output=((r.stdout??'')+(r.stderr??'')).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'[test module data URL elided]');
 writeFileSync(dir+'/'+log,output);results.push({command:[command,...args].join(' '),exitCode:r.status,log:dir+'/'+log});
}
writeFileSync(dir+'/local-verification.json',JSON.stringify({timestamp:new Date().toISOString(),results},null,2)+'\n');
console.log(JSON.stringify(results));process.exit(results.every(x=>x.exitCode===0)?0:1);
