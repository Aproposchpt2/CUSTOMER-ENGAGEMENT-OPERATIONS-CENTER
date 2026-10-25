import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {validateStagingRuntime}=require('../twilio-bridge/staging-runtime-config.cjs');
const gateway='https://pma-validation--ai4cc-staging.netlify.app';
const pma={STELLAR_BRIDGE_STAGING:'true',NETLIFY_BASE_URL:gateway,PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:gateway};
const specialists={...pma,SS_STAGING_INTELLIGENCE_ENABLED:'true',STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',SS_STAGING_SALES_TENANT_ID:'5885a020-d363-4c27-910a-c035eda132f5',SS_STAGING_SUPPORT_TENANT_ID:'d7e80001-0000-4000-b000-000000000001',STAGING_SUPABASE_SERVICE_ROLE_KEY:'synthetic-backend-credential'};
test('staging cannot fall back to a production gateway, including legacy staging activation',()=>{
 for(const URL of [undefined,'','https://stellaruc.com','https://admin-staging.stellaruc.com',gateway+'.attacker.invalid']){
  assert.throws(()=>validateStagingRuntime({...pma,NETLIFY_BASE_URL:URL}),/STAGING_GATEWAY_BINDING_REQUIRED/);
  assert.throws(()=>validateStagingRuntime({RAILWAY_ENVIRONMENT_NAME:'staging',NETLIFY_BASE_URL:URL}),/STAGING_GATEWAY_BINDING_REQUIRED/);
 }
 assert.deepEqual(validateStagingRuntime(pma),{staging:true,specialists:false});
 assert.deepEqual(validateStagingRuntime({...pma,NETLIFY_BASE_URL:gateway+'/'}),{staging:true,specialists:false});
 assert.throws(()=>validateStagingRuntime({...pma,PMA_STAGING_BASE_URL:'https://production.invalid'}),/PMA_STAGING_GATEWAY_BINDING_REQUIRED/);
});
test('specialist activation requires explicit staging, exact separate tenants and backend-only credential',()=>{
 assert.deepEqual(validateStagingRuntime(specialists),{staging:true,specialists:true});
 for(const [key,value,code] of [
  ['STELLAR_BRIDGE_STAGING','false','EXPLICIT_STAGING'],['STAGING_SUPABASE_URL','https://production.invalid','DATABASE'],
  ['SS_STAGING_SALES_TENANT_ID',specialists.SS_STAGING_SUPPORT_TENANT_ID,'TENANT_BINDINGS'],
  ['SS_STAGING_SUPPORT_TENANT_ID',specialists.SS_STAGING_SALES_TENANT_ID,'TENANT_BINDINGS'],
  ['STAGING_SUPABASE_SERVICE_ROLE_KEY','','BACKEND_CREDENTIAL']
 ])assert.throws(()=>validateStagingRuntime({...specialists,[key]:value}),new RegExp(String(code)));
});
test('write switches do not implicitly enable specialists or bypass staging; error text omits credentials',()=>{
 for(const key of ['SS_STAGING_HVAC_WRITES_ENABLED','SS_STAGING_SALES_WRITES_ENABLED']){
  assert.throws(()=>validateStagingRuntime({[key]:'true'}),/EXPLICIT_STAGING/);
  assert.throws(()=>validateStagingRuntime({...pma,[key]:'true'}),/INTELLIGENCE_REQUIRED_FOR_WRITES/);
  assert.deepEqual(validateStagingRuntime({...specialists,[key]:'true'}),{staging:true,specialists:true});
 }
 try{validateStagingRuntime({...specialists,STAGING_SUPABASE_URL:'https://private.invalid'});assert.fail();}catch(error){assert.doesNotMatch(String(error),/synthetic-backend-credential|private.invalid/);}
 // Existing non-staging startup is outside this guard's scope.
 assert.deepEqual(validateStagingRuntime({NETLIFY_BASE_URL:'https://stellaruc.com'}),{staging:false,specialists:false});
});
test('configuration guard runs before provider pool and listener startup and is packaged in both images',()=>{
 const server=readFileSync('twilio-bridge/server.js','utf8').split('function start() {')[1];
 assert.ok(server.indexOf('validateStagingRuntime(process.env)')<server.indexOf('fillPool()'));
 assert.ok(server.indexOf('validateStagingRuntime(process.env)')<server.indexOf('server.listen('));
 for(const file of ['Dockerfile','Dockerfile.pma-staging'])assert.match(readFileSync('twilio-bridge/'+file,'utf8'),/^COPY staging-runtime-config\.cjs \.\/$/m);
});
