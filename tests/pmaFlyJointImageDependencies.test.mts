import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname,normalize} from 'node:path';
import {builtinModules} from 'node:module';

// The Fly PMA image runs the shared bridge server. Top-level requires must be packaged
// even when Sales/Support feature flags are disabled.
const root=join(process.cwd(),'twilio-bridge');
const docker=readFileSync(join(root,'Dockerfile.pma-staging'),'utf8');
const copyTokens=new Set([...docker.matchAll(/^COPY\s+([^\n]+)$/gm)].flatMap(([,args])=>args.trim().split(/\s+/).slice(0,-1)));
test('Fly PMA Dockerfile packages all joint specialist runtime dependencies',()=>{
  for(const file of [
    'specialist-staging.cjs','voice-agent-catalog-expanded.json','stellar-kb-v1.json',
    'staging-knowledge-policy.cjs','safety-intents.cjs','support-intelligence.cjs',
    'support-intent-catalog-v1.json'
  ])assert.ok(copyTokens.has(file),`Missing Fly PMA image dependency: ${file}`);
  assert.match(readFileSync(join(root,'server.js'),'utf8'),/require\('\.\/specialist-staging\.cjs'\)/);
});

test('every literal transitive bridge require is packaged at its runtime path',()=>{
  const copied=new Map<string,string>();
  for(const [,args] of docker.matchAll(/^COPY\s+([^\n]+)$/gm)){
    const tokens=args.trim().split(/\s+/),destination=tokens.pop()!;
    for(const source of tokens){
      if(source.includes('*'))continue;
      copied.set(normalize(join(destination,source.split('/').at(-1)!)),source);
    }
  }
  const dependencies=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).dependencies;
  const seen=new Set<string>();
  function visit(runtime:string){
    if(seen.has(runtime))return;seen.add(runtime);
    const source=copied.get(runtime);assert.ok(source,`Missing COPY destination ${runtime}`);
    if(source.endsWith('.json'))return;
    const code=readFileSync(join(root,source),'utf8');
    for(const [,dependency] of code.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)){
      if(dependency.startsWith('.')){
        const path=normalize(join(dirname(runtime),dependency));
        const resolved=[path,path+'.js',path+'.cjs',path+'.json',join(path,'index.js')].find(p=>copied.has(p));
        assert.ok(resolved,`${runtime} requires unpackaged ${dependency}`);visit(resolved);
      }else if(!builtinModules.includes(dependency)&&!dependency.startsWith('node:')){
        assert.ok(dependencies[dependency],`Undeclared production dependency ${dependency}`);
      }
    }
  }
  visit('server.js');assert.ok(seen.size>=20);
});
