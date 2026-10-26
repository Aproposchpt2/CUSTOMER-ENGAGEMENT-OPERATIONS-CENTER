import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname,normalize} from 'node:path';
import {builtinModules} from 'node:module';

// The Fly PMA image runs the shared bridge server. Top-level requires must be packaged
// even when Sales/Support feature flags are disabled.
const root=join(process.cwd(),'twilio-bridge');
const dockerfiles=['Dockerfile','Dockerfile.pma-staging'];
const copiedFiles=(dockerfile:string)=>{
  const docker=readFileSync(join(root,dockerfile),'utf8');
  return new Map([...docker.matchAll(/^COPY\s+([^\n]+)$/gm)].flatMap(([,args])=>{
    const tokens=args.trim().split(/\s+/),destination=tokens.pop()!;
    return tokens.filter(source=>!source.includes('*')).map(source=>[normalize(join(destination,source.split('/').at(-1)!)),source]);
  }));
};
const copyTokens=new Set([...copiedFiles('Dockerfile.pma-staging').values()]);
test('Fly PMA Dockerfile packages all joint specialist runtime dependencies',()=>{
  for(const file of [
    'specialist-staging.cjs','voice-agent-catalog-expanded.json','stellar-kb-v1.json',
    'staging-knowledge-policy.cjs','safety-intents.cjs','support-intelligence.cjs',
    'support-intent-catalog-v1.json'
  ])assert.ok(copyTokens.has(file),`Missing Fly PMA image dependency: ${file}`);
  assert.match(readFileSync(join(root,'server.js'),'utf8'),/require\('\.\/specialist-staging\.cjs'\)/);
});

test('both bridge images package the shared persona module and its live runtime dependencies',()=>{
  for(const dockerfile of dockerfiles){
    const copied=copiedFiles(dockerfile);
    for(const file of ['stellar-conversational-persona.cjs','voice-entry.cjs','voice-receptionist.cjs'])
      assert.ok(copied.has(file),`${dockerfile} is missing ${file}`);
  }
});

test('every literal transitive bridge require is packaged at its runtime path',()=>{
  const dependencies=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).dependencies;
  for(const dockerfile of dockerfiles){
    const copied=copiedFiles(dockerfile),seen=new Set<string>();
    function visit(runtime:string){
      if(seen.has(runtime))return;seen.add(runtime);
      const source=copied.get(runtime);assert.ok(source,`${dockerfile} missing COPY destination ${runtime}`);
      if(source.endsWith('.json'))return;
      const code=readFileSync(join(root,source),'utf8');
      for(const [,dependency] of code.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)){
        if(dependency.startsWith('.')){
          const path=normalize(join(dirname(runtime),dependency));
          const resolved=[path,path+'.js',path+'.cjs',path+'.json',join(path,'index.js')].find(p=>copied.has(p));
          assert.ok(resolved,`${dockerfile}: ${runtime} requires unpackaged ${dependency}`);visit(resolved);
        }else if(!builtinModules.includes(dependency)&&!dependency.startsWith('node:')){
          assert.ok(dependencies[dependency],`Undeclared production dependency ${dependency}`);
        }
      }
    }
    visit('server.js');assert.ok(seen.size>=20);
  }
});
