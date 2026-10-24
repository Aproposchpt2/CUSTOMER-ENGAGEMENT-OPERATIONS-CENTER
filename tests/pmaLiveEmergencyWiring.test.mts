import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as domain from '../lib/propertyManagement/domain.ts';
import * as emergency from '../lib/propertyManagement/emergencyDispatch.ts';
const require=createRequire(import.meta.url),runtime=require('../twilio-bridge/pma-intents.cjs');
const deps:Record<string,any>={'./domain':domain,'./intentCatalog':{intentDecision:runtime.classify},'./emergencyDispatch':emergency,'./availability':{},'./scheduling':{}};
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/propertyManagement/voiceOrchestration.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,process,Date,Intl,require:(n:string)=>deps[n]});
const api=module.exports as any;
const env={PMA_VOICE_INTEGRATION_ENABLED:'true',PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',AI4CC_VOICE_DEMO_TENANT_ID:'5885a020-d363-4c27-910a-c035eda132f5',PMA_STAGING_PROPERTY_ID:'eead9ac5-b28b-4594-b75b-a9e9bbbd111f',TWILIO_ACCOUNT_SID:'synthetic',TWILIO_AUTH_TOKEN:'synthetic',PMA_STAGING_DID:'+17029351414',PMA_STAGING_SMS_FROM:'+17252010584'};
const scope={call_sid:'CA'+'1'.repeat(32),session_id:'10000000-0000-4000-8000-000000000001',agentRoute:'property-management-assistant'};
test('live classifier intents pass unchanged to voice SQL and map to restricted emergency dispatch',async(t)=>{
 const sent:URLSearchParams[]=[];t.mock.method(globalThis,'fetch',async(_url:any,o:any)=>{sent.push(new URLSearchParams(o.body));return new Response('{}',{status:201});});
 for(const [message,voiceIntent,dispatchIntent] of [
  ['I smell gas','SUSPECTED_GAS_LEAK','GAS_EMERGENCY'],
  ['There is a fire','FIRE_OR_SMOKE','FIRE_EMERGENCY'],
  ['major flooding','MAJOR_FLOODING','FLOOD_EMERGENCY'],
  ['sparking outlet','ELECTRICAL_HAZARD','PERSONAL_SAFETY_THREAT'],
  ['I cannot breathe','PERSONAL_SAFETY_THREAT','PERSONAL_SAFETY_THREAT'],
 ]){
  const calls:any[]=[];
  const admin={rpc:async(name:string,args:any)=>{calls.push({name,args});return name==='pm_voice_turn_v1'?{data:{state:'INFORMATION',interactionPersisted:true,domainPersisted:false,reply:'Move to safety and contact local emergency services. I cannot confirm dispatch.'}}:{data:{incidentId:'20000000-0000-4000-8000-000000000001',notify:true,preferences:[{channel:'sms',destination:'+17753508039'}]}};}};
  const r=await api.executePmaVoice({...scope,message,confirmed:false},admin,env);
  assert.equal(calls[0].name,'pm_voice_turn_v1');assert.equal(calls[0].args.turn.intent,voiceIntent);
  assert.equal(calls[1].name,'pm_staging_emergency_prepare_v1');assert.equal(calls[1].args.intent,dispatchIntent);
  assert.equal(calls[1].args.test_mode,false);assert.equal(calls[1].args.call_sid,scope.call_sid);assert.equal(calls[1].args.session_id,scope.session_id);
  assert.equal(r.emergencyDispatch.dispatched,true);assert.equal(r.notificationSent,false);
 }
 assert.equal(sent.length,5);assert.ok(sent.every(x=>x.get('From')==='+17252010584'));
});
test('closed/cross-call authorization errors and disabled integration never reach dispatch',async()=>{
 let dispatches=0;const admin={rpc:async(name:string)=>{if(name!=='pm_voice_turn_v1')dispatches++;return {error:{code:'42501'}};}};
 await assert.rejects(api.executePmaVoice({...scope,message:'I smell gas'},admin,env),/Active authorized/);
 await assert.rejects(api.executePmaVoice({...scope,message:'I smell gas'},admin,{...env,PMA_VOICE_INTEGRATION_ENABLED:'false'}),/disabled/);
 assert.equal(dispatches,0);
 assert.equal(emergency.emergencyDispatchIntent('constructor'),null);assert.equal(emergency.emergencyDispatchIntent('ordinary maintenance'),null);
});
