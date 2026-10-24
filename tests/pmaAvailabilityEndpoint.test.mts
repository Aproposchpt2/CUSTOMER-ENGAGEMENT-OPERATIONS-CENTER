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
 return {queries,run:(args:any={bedrooms:2})=>api.executeVoiceDemoBody({action:'pma_availability',...ctx,args})};
}
test('PMA-005 endpoint: trusted tenant/property and exact bedrooms remain mandatory; wrong-bedroom rows never escape',async()=>{
 const e=endpoint([{label:'Unit 415',bedrooms:1,status:'vacant',availability_date:'2026-10-25',updated_at:new Date().toISOString()}]);
 const out=await e.run();assert.equal(out.availability.state,'NO_VERIFIED_MATCH');assert.equal(out.availability.units.length,0);
 const units=e.queries.find(q=>q.table==='pm_units');assert.deepEqual(units.filters,[['tenant_id',tenant],['property_id',propertyId],['bedrooms',2]]);assert.equal(units.limit,201);assert.match(units.fields,/updated_at/);
 assert.deepEqual(e.queries.find(q=>q.table==='pm_properties').filters,[['tenant_id',tenant],['id',propertyId]]);
});
test('PMA-005 endpoint: incomplete and failed queries cannot announce an empty inventory',async()=>{
 await assert.rejects(endpoint(Array.from({length:201},()=>({}))).run(),/incomplete/);
 await assert.rejects(endpoint([],{error:{message:'unavailable'}}).run(),/database failure/);
 for(const bad of [null,undefined,{},'[]'])await assert.rejects(endpoint(bad as any).run(),/invalid data/);
});
test('PMA-005 R3: snapshot and bridge preserve each factual/spoken classification',async()=>{
 const {verifiedAvailability}=require('../twilio-bridge/pma-availability.cjs');
 const row={label:'Synthetic 2B',bedrooms:2,status:'vacant',availability_date:'2026-11-01',updated_at:new Date().toISOString()};
 const cases=[
  {rows:[row],state:'AVAILABLE',speech:/current recorded availability/},
  {rows:[],state:'NO_VERIFIED_MATCH',speech:/lookup completed.*no verified available/is},
  {rows:[{...row,status:'occupied',availability_date:null}],state:'UNAVAILABLE_UNITS',speech:/marked occupied or unavailable/},
  {rows:[{...row,status:'unavailable'}],state:'UNAVAILABLE_UNITS',speech:/no verified vacancy/},
  {rows:[{...row,updated_at:new Date(Date.now()-86400001).toISOString()}],state:'INVENTORY_STALE',speech:/out of date/},
  ...[null,'2026-02-30',''].map(availability_date=>({rows:[{...row,availability_date}],state:'INVALID_INVENTORY',speech:/missing or invalid/})),
  ...[null,'invalid',new Date(Date.now()+3600000).toISOString()].map(updated_at=>({rows:[{...row,updated_at}],state:'INVALID_INVENTORY',speech:/missing or invalid/})),
  ...[{label:''},{bedrooms:null},{status:'unknown'},null].map(change=>({rows:[change?{...row,...change}:null],state:'INVALID_INVENTORY',speech:/missing or invalid/}))
 ];
 for(const scenario of cases){
  const output=(await endpoint(scenario.rows).run()).availability;
  assert.equal(output.state,scenario.state);const voice=verifiedAvailability(output,2);assert.equal(voice.state,scenario.state);assert.match(voice.reply,scenario.speech);assert.equal(voice.success,scenario.state!=='INVALID_INVENTORY');
  if(scenario.state!=='AVAILABLE')assert.equal(voice.units.length,0);
 }
});
test('PMA-005 R3: any-size server search omits equality; studio search retains bedrooms=0',async()=>{
 for(const args of [{},{bedrooms:0}]){
  const e=endpoint([{label:'Synthetic studio',bedrooms:0,status:'vacant',availability_date:'2026-11-01',updated_at:new Date().toISOString()}]);
  const answer=(await e.run(args)).availability;assert.equal(answer.state,'AVAILABLE');assert.equal(answer.requestedBedrooms,(args as any).bedrooms??null);
  const filters=e.queries.find(q=>q.table==='pm_units').filters;
  assert.equal(filters.some(([key]:string[])=>key==='bedrooms'),'bedrooms' in args);
 }
});
test('PMA-005 endpoint: closed, expired and foreign-route sessions cannot query inventory',async()=>{
 for(const session of [{end_time:new Date().toISOString()},{start_time:'2020-01-01'},{agentRoute:'sales-specialist'},{session_id:'b0000000-0000-4000-8000-000000000001'},{call_sid:'CA'+'2'.repeat(32)}]){
  const e=endpoint([],{session});await assert.rejects(e.run());assert.equal(e.queries.length,0);
 }
 const e=endpoint([],{property:{timezone:'UTC'}});await assert.rejects(e.run(),/inventory unavailable/);assert.equal(e.queries.some(q=>q.table==='pm_units'),false);
});
test('PMA-005 R3: model-supplied tenant/property scope is denied before database inventory access',async()=>{
 for(const injected of [{tenantId:'foreign'},{propertyId:'foreign'},{tenant_id:tenant},{property_id:propertyId}]){
  const e=endpoint([]);await assert.rejects(e.run({bedrooms:2,...injected}),/Invalid availability filter/);assert.equal(e.queries.length,0);
 }
});
