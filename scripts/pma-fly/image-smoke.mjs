// Builds and starts only a disposable, network-isolated local Docker container.
// No registry push, Fly command, provider credentials, phone call, or notification.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const sha=process.env.PMA_SOURCE_SHA||spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
assert.match(sha,/^[0-9a-f]{40}$/);
const dockerfile=process.env.BRIDGE_DOCKERFILE||'Dockerfile.pma-staging';
assert.ok(['Dockerfile.pma-staging','Dockerfile'].includes(dockerfile));
const dedicated=dockerfile==='Dockerfile.pma-staging';
const image='fly-validation:'+sha+(dedicated?'-pma':'-shared'), container='fly-smoke-'+process.pid;
function docker(args,input){const r=spawnSync('docker',args,{encoding:'utf8',input,maxBuffer:20*1024*1024});if(r.status!==0)throw Error(`docker ${args[0]} failed: ${r.stderr||r.error||r.stdout}`);return r.stdout.trim();}
mkdirSync('evidence/pma-fly',{recursive:true});
const evidence={sourceSha:sha,image,dockerfile,liveDeployment:false,liveSms:false,network:'none'};
try{
 console.log(docker(['build','--build-arg','PMA_SOURCE_SHA='+sha,'-f','twilio-bridge/'+dockerfile,'-t',image,'twilio-bridge']));
 evidence.imageId=docker(['image','inspect',image,'--format','{{.Id}}']);
 const labels=JSON.parse(docker(['image','inspect',image,'--format','{{json .Config.Labels}}']));
 evidence.revision=labels?.['org.opencontainers.image.revision']||null;assert.equal(evidence.revision,dedicated?sha:null);
 const env={OPENAI_API_KEY:'synthetic-not-a-provider-key',BRIDGE_HMAC_SECRET:'synthetic-local-smoke-secret',STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',VOICE_DEMO_IVR_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',NETLIFY_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',STAGING_SUPPORT_WRITES_ENABLED:'false',STAGING_VOICE_ORCHESTRATION_ENABLED:'false',SS_STAGING_INTELLIGENCE_ENABLED:'true',STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',SS_STAGING_SALES_TENANT_ID:'5885a020-d363-4c27-910a-c035eda132f5',SS_STAGING_SUPPORT_TENANT_ID:'d7e80001-0000-4000-b000-000000000001',STAGING_SUPABASE_SERVICE_ROLE_KEY:'synthetic-not-a-database-key',SS_STAGING_HVAC_WRITES_ENABLED:'false',SS_STAGING_SALES_WRITES_ENABLED:'false',PORT:'8080',BRIDGE_RELEASE_SHA:'0'.repeat(40)};
 evidence.rejectedConfigurations=[];
 for(const [name,patch,code] of [
  ['production-gateway',{NETLIFY_BASE_URL:'https://stellaruc.com'},'STAGING_GATEWAY_BINDING_REQUIRED'],
  ['foreign-support-tenant',{SS_STAGING_SUPPORT_TENANT_ID:env.SS_STAGING_SALES_TENANT_ID},'SPECIALIST_TENANT_BINDINGS_REQUIRED'],
  ['missing-backend-credential',{STAGING_SUPABASE_SERVICE_ROLE_KEY:''},'SPECIALIST_BACKEND_CREDENTIAL_REQUIRED']
 ]){
  const bad=spawnSync('docker',['run','--rm','--network','none',...Object.entries({...env,...patch}).flatMap(([k,v])=>['-e',k+'='+v]),image],{encoding:'utf8',timeout:15000});
  assert.equal(bad.status,1);assert.ok((bad.stdout+bad.stderr).includes(code));assert.ok(!(bad.stdout+bad.stderr).includes('[bridge] listening'));evidence.rejectedConfigurations.push(name);
 }
 docker(['run','-d','--network','none','--name',container,...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),image]);
 const healthScript=`(async()=>{for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:8080/health');if(r.ok){console.log(JSON.stringify(await r.json()));return;}}catch{}await new Promise(r=>setTimeout(r,200));}process.exit(1);})();`;
 evidence.health=JSON.parse(docker(['exec',container,'node','-e',healthScript]));
 assert.equal(evidence.health.ok,true);assert.equal(evidence.health.stagingOnly,true);assert.equal(evidence.health.commit,'0'.repeat(40));assert.equal(evidence.health.imageRevision,dedicated?sha:null);assert.equal(evidence.health.revisionMismatch,dedicated?true:null);assert.match(evidence.health.nodeVersion,dedicated?/^v24\./:/^v20\./);assert.equal(evidence.health.pma.enabled,true);assert.equal(evidence.health.voiceDemo.enabled,true);assert.equal(evidence.health.supportPersistence,'STAGING_WRITES_DISABLED');
 assert.deepEqual(evidence.health.voiceDemo.routes,['support-specialist','sales-specialist','property-management-assistant']);
 evidence.runtime=JSON.parse(docker(['exec','-i',container,'node'],`
 const assert=require('node:assert/strict');
 const {createSpecialistSession,TENANTS,GREETINGS,VOICES}=require('./specialist-staging.cjs');
 const {createPmaAdapter}=require('./pma-adapter.cjs');
 const callSid='CA'+'a'.repeat(32),session_id='00000000-0000-4000-8000-000000000001';
 const forbidden=()=>{throw Error('Network forbidden during smoke');};
 for(const profile of ['sales','support']){
  const session=createSpecialistSession({profile,callSid,env:process.env,request:forbidden,trustedSession:{call_sid:callSid,session_id,agentRoute:profile==='sales'?'sales-specialist':'support-specialist'}});
  assert.equal(session.voice,profile==='sales'?'echo':'cedar');assert.equal(session.greeting,GREETINGS[profile]);assert.equal(session.tenantId,TENANTS[profile]);
  assert.equal(session.assess({reference:profile==='sales'?'SUP-049':'SAL-033',confidence:1}).state,'CLARIFY');session.close();
 }
 const pma=createPmaAdapter(process.env,forbidden);assert.equal(pma.enabled,true);assert.ok(pma.tools.some(t=>t.name==='pma_property_workflow'));
 assert.match(pma.instructions,/invoke pma_property_workflow during that same active call/);
 assert.equal(createPmaAdapter({...process.env,STELLAR_BRIDGE_STAGING:'false'},forbidden).enabled,false);
 console.log(JSON.stringify({node:process.version,specialists:['echo','cedar'],pmaTool:true,tenantIsolation:true,networkCalls:0}));
 `));
 assert.match(evidence.runtime.node,dedicated?/^v24\./:/^v20\./);
 const logs=docker(['logs',container]);assert.doesNotMatch(logs,/MODULE_NOT_FOUND|Cannot find module|SyntaxError|ReferenceError/);
 evidence.result='PASS';console.log(JSON.stringify(evidence,null,2));
}finally{
 try{docker(['rm','-f',container]);}catch{}
 writeFileSync('evidence/pma-fly/image-smoke-'+(dedicated?'pma':'shared')+'.json',JSON.stringify(evidence,null,2)+'\n');
}
