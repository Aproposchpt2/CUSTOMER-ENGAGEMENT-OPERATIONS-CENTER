import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {timingSafeEqual} from 'node:crypto';
import {emergencyRuntimeReadiness} from '../lib/propertyManagement/emergencyReadiness.ts';
const env={PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',AI4CC_VOICE_DEMO_TENANT_ID:'5885a020-d363-4c27-910a-c035eda132f5',PMA_STAGING_PROPERTY_ID:'eead9ac5-b28b-4594-b75b-a9e9bbbd111f',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',PMA_STAGING_SMS_FROM:'+17252010584',PMA_CHANNELS_ENABLED:'true',PMA_VOICE_INTEGRATION_ENABLED:'true',VOICE_DEMO_IVR_ENABLED:'true',VOICE_DEMO_WORKFLOWS_ENABLED:'true',VOICE_DEMO_REUSABLE_DIDS_ENABLED:'true',SUPABASE_SERVICE_ROLE_KEY:'synthetic-storage',TWILIO_ACCOUNT_SID:'synthetic-account',TWILIO_AUTH_TOKEN:'synthetic-token',BRIDGE_HMAC_SECRET_STAGING:'synthetic-secret',CONTEXT:'branch-deploy',COMMIT_REF:'synthetic-revision',DEPLOY_ID:'synthetic-deploy'};
test('readiness identifies published-context gaps without exposing credential values',()=>{
 const ready=emergencyRuntimeReadiness(env);assert.equal(ready.configurationReady,true);assert.equal(ready.liveSmsAttempted,false);assert.equal(ready.releaseDecision,'NOT_EVALUATED');
 const root={...env,PMA_CHANNELS_ENABLED:'',PMA_VOICE_INTEGRATION_ENABLED:undefined,PMA_STAGING_SMS_FROM:undefined,AI4CC_VOICE_DEMO_TENANT_ID:undefined};
 assert.deepEqual(emergencyRuntimeReadiness(root).blockers.sort(),['PMA_CHANNELS_ENABLED','PMA_VOICE_INTEGRATION_ENABLED','smsSender','stagingTenant'].sort());
 const output=JSON.stringify(ready);for(const secret of ['synthetic-storage','synthetic-account','synthetic-token','synthetic-secret'])assert.ok(!output.includes(secret));
});
function run(method:string,key:any,overrides:Record<string,string>={}){
 const module={exports:{}};const fakeProcess={env:{...env,...overrides}};
 vm.runInNewContext(ts.transpileModule(readFileSync('pages/api/staging/pma-emergency-readiness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,process:fakeProcess,Buffer,require:(name:string)=>{if(name==='crypto')return {timingSafeEqual};if(name==='@/lib/propertyManagement/emergencyReadiness')return {emergencyRuntimeReadiness};throw Error('Unexpected dependency: '+name);}});
 const res:any={statusCode:0,headers:{},setHeader(k:string,v:string){this.headers[k]=v;},status(n:number){this.statusCode=n;return this;},json(body:any){this.body=body;return this;}};
 (module.exports as any).default({method,headers:{'x-test-key':key}},res);return res;
}
test('read-only endpoint rejects POST, absent/wrong keys and production before returning configuration',()=>{
 assert.equal(run('POST',env.BRIDGE_HMAC_SECRET_STAGING).statusCode,405);
 assert.equal(run('GET',undefined).statusCode,401);assert.equal(run('GET','wrong').statusCode,401);
 assert.equal(run('GET',env.BRIDGE_HMAC_SECRET_STAGING,{PMA_ENVIRONMENT:'production'}).statusCode,403);
 const good=run('GET',env.BRIDGE_HMAC_SECRET_STAGING);assert.equal(good.statusCode,200);assert.equal(good.body.configurationReady,true);assert.equal(good.headers['Cache-Control'],'no-store');
});
