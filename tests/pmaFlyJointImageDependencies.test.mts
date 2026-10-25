import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

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
