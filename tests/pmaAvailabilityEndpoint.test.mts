import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import * as domain from '../lib/propertyManagement/domain.ts';
const require=createRequire(import.meta.url);
function load(path:string,deps:Record<string,any>,env:Record<string,string>={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Date,Intl,process:{env},require:(n:string)=>{if(!(n in deps))throw Error('Unexpected import '+n);return deps[n];}});return module.exports as any;}
const availability=load('lib/propertyManagement/availability.ts',{'./domain':domain});
const tenant='20000000-0000-4000-8000-000000000001',propertyId='40000000-0000-4000-8000-000000000001';
const ctx={call_sid:'CA'+'1'.repeat(32),session_id:'a0000000-0000-4000-8000-000000000001',agentRoute:'property-management-assistant',start_time:new Date().toISOString()};
function endpoint(rows:any[],options:any={}){
 const queries:any[]=[];
 const admin={rpc:async()=>({data:{...ctx,...options.session}}),from:(table:string)=>{
  const trace:any={table,filters:[]};queries.push(trace);
  const data=table==='pm_properties'?{name:'Synthetic property',status:'active',accepts_inquiries:true,timezone:'America/Los_Angeles',...options.property}:rows;
  const chain:any={select:(fields:string)=>{trace.fields=fields;return chain;},eq:(key:string,value:any)=>{trace.filters.push([key,value]);return chain;},order:()=>chain,limit:(n:number)=>{trace.limit=n;return chain;},single:async()=>({data}),then:(resolve:any,reject:any)=>Promise.resolve({data,error:options.error}).then(resolve,reject)};
  return chain;
 }};
 const env={NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-not-a-real-key',PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',VOICE_DEMO_WORKFLOWS_ENABLED:'true',PMA_STAGING_PROPERTY_ID:propertyId,AI4CC_VOICE_DEMO_TENANT_ID:tenant};
 const result=(r:any)=>{if(r.error)throw new domain.PmaError('Synthetic database failure',503);return r.data;};
 const api=load('pages/api/intake/voice-demo-staging.ts',{'@supabase/supabase-js':{createClient:()=>admin},twilio:{validateRequest:()=>true},'@/lib/propertyManagement/transport':{},'@/lib/propertyManagement/server':{result},'@/lib/propertyManagement/availability':availability,'@/lib/propertyManagement/domain':domain,'@/lib/voiceDemo/gateway.cjs':require('../lib/voiceDemo/gateway.cjs')},env);
 return {queries,run:()=>api.executeVoiceDemoBody({action:'pma_availability',...ctx,args:{bedrooms:2}})};
}
test('PMA-005 endpoint: trusted tenant/property and exact bedrooms remain mandatory; wrong-bedroom rows never escape',async()=>{
 const e=endpoint([{label:'Unit 415',bedrooms:1,status:'vacant',availability_date:'2026-10-25',updated_at:new Date().toISOString()}]);
 const out=await e.run();assert.equal(out.availability.state,'NO_VERIFIED_MATCH');assert.equal(out.availability.units.length,0);
 const units=e.queries.find(q=>q.table==='pm_units');assert.deepEqual(units.filters,[['tenant_id',tenant],['property_id',propertyId],['bedrooms',2]]);assert.equal(units.limit,201);assert.match(units.fields,/updated_at/);
});
test('PMA-005 endpoint: incomplete and failed queries cannot announce an empty inventory',async()=>{
 await assert.rejects(endpoint(Array.from({length:201},()=>({}))).run(),/incomplete/);
 await assert.rejects(endpoint([],{error:{message:'unavailable'}}).run(),/database failure/);
});
test('PMA-005 endpoint: closed, expired and foreign-route sessions cannot query inventory',async()=>{
 for(const session of [{end_time:new Date().toISOString()},{start_time:'2020-01-01'},{agentRoute:'sales-specialist'}]){
  const e=endpoint([],{session});await assert.rejects(e.run());assert.equal(e.queries.length,0);
 }
 const e=endpoint([],{property:{timezone:'UTC'}});await assert.rejects(e.run(),/inventory unavailable/);assert.equal(e.queries.some(q=>q.table==='pm_units'),false);
});
