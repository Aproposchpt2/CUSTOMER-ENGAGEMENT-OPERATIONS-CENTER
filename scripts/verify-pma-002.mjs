import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir='docs/pma-002/evidence';mkdirSync(dir,{recursive:true});
const results=[];
for(const [command,args,file] of [['npm',['test'],'npm-test.log'],['npx',['tsc','--noEmit'],'typecheck.log']]){
 const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:10*1024*1024});
 writeFileSync(`${dir}/${file}`,result.stdout+result.stderr);results.push({command:[command,...args].join(' '),exitCode:result.status,log:`${dir}/${file}`});
}
writeFileSync(`${dir}/local-verification.json`,JSON.stringify({timestamp:new Date().toISOString(),results},null,2)+'\n');
console.log(JSON.stringify(results));process.exit(results.some(r=>r.exitCode!==0)?1:0);
