import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {createRequire} from 'node:module';
import * as domain from '../lib/propertyManagement/domain.ts';
const require=createRequire(import.meta.url),runtime=require('../twilio-bridge/pma-intents.cjs');
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/propertyManagement/voiceOrchestration.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,process,Date,Intl,require:(n:string)=>({'./domain':domain,'./intentCatalog':{intentDecision:runtime.classify},'./availability':{},'./scheduling':{},'./emergencyDispatch':{}})[n]});
const api=module.exports as any;
const incident={reportedName:'Jeff Example',reportedAddress:'100 Fictional Way',reportedUnit:'101',description:'My kitchen sink won’t drain.'};
const base={agentRoute:'property-management-assistant',message:incident.description,confirmed:true,maintenance:incident,observedCallerTurns:['My name is Jeff Example. My kitchen sink won’t drain.']};
test('known incident can be an exact span of one longer caller utterance; paraphrases, partial words and missing evidence are rejected',()=>{
 assert.equal(api.prepareVoiceTurn(base).action,'incident_report');
 for(const observedCallerTurns of [[],['The sink is clogged.'],['prefixMy kitchen sink won’t drain.suffix']])assert.equal(api.prepareVoiceTurn({...base,observedCallerTurns}).action,'clarify');
 assert.equal(api.prepareVoiceTurn({...base,confirmed:false}).action,'clarify');
 assert.throws(()=>api.prepareVoiceTurn({...base,maintenance:{...incident,reportedAddress:''}}),/Invalid reported address/);
 assert.throws(()=>api.prepareVoiceTurn({...base,actor:'owner'}),/Untrusted/);
 const emergency=api.prepareVoiceTurn({...base,observedCallerTurns:['My kitchen sink won’t drain. There is a gas leak in my apartment.']});
 assert.equal(emergency.action,'incident_report');assert.equal(emergency.safety,'SUSPECTED_GAS_LEAK');
});

test('transcript preserves documented fragments, timing order, repeated words and space-only deltas without delegated-text contamination',()=>{
 const {createPmaTranscript}=require('../twilio-bridge/pma-conversation.cjs'),capture=createPmaTranscript();
 capture.observe({type:'session.input_transcript.delta',event_id:'a',delta:'gas',start_ms:100,end_ms:110});
 capture.observe({type:'session.input_transcript.delta',event_id:'c',delta:'leak, leak',start_ms:120,end_ms:130});
 capture.observe({type:'session.input_transcript.delta',event_id:'b',delta:' ',start_ms:110,end_ms:120});
 capture.observe({type:'session.input_transcript.delta',event_id:'c',delta:'leak, leak',start_ms:120,end_ms:130});
 capture.observe({type:'response.output_text.delta',delta:'I invented a ticket.'});
 assert.deepEqual(capture.callerEvidence(),['gas leak, leak']);
 assert.deepEqual(capture.snapshot(),[{speaker:'customer',content:'gas leak, leak'}]);
 assert.equal(capture.truncated,false);
});

test('transcript can finalize the same completed staging call; incident writes, cross-scope access, stale finalization and altered replay remain denied',async()=>{
 const db=new PGlite();
 const tenant='20000000-0000-4000-8000-000000000001',property='40000000-0000-4000-8000-000000000001',owner='10000000-0000-4000-8000-000000000001',sid='a0000000-0000-4000-8000-000000000001',call='CA'+'1'.repeat(32);
 const transcript=[{speaker:'agent',content:'Thank you for calling.'},{speaker:'customer',content:'My kitchen sink won’t drain.'}];
 const role=async(r='service_role')=>{await db.exec('reset role;set local role '+r);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:r})]);};
 const deny=async(fn:()=>Promise<any>)=>{await db.exec('savepoint denied');try{await assert.rejects(fn);}finally{await db.exec('rollback to savepoint denied;release savepoint denied');}};
 const save=async(s=sid,c=call,p=property,body=transcript)=> (await db.query<{v:any}>('select public.pma_voice_transcript_save_v1($1,$2,$3,$4,$5) v',[tenant,p,s,c,body])).rows[0].v;
 try{
  await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
  for(const file of readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  await db.exec(readFileSync('supabase/tests/pma_acceptance.sql','utf8').split('set local role authenticated;')[0]);
  await db.exec(`update public.pm_properties set accepts_inquiries=true,timezone='America/Los_Angeles' where id='${property}';insert into private.pm_voice_config_v1 values('${tenant}','${property}','${owner}',true);`);
  await db.query("insert into public.ai4cc_interactions(id,tenant_id,channel,status,started_at,ended_at,metadata) values($1,$2,'voice','completed',now()-interval '2 minutes',now()-interval '1 second',$3)",[sid,tenant,{synthetic:true,voice_demo:true,selected_route:'property-management-assistant',property_id:property,call_sid:call}]);
  await role();
  await deny(()=>save(sid,'CA'+'2'.repeat(32)));
  await deny(()=>save(sid,call,'40000000-0000-4000-8000-000000000002'));
  for(const r of ['anon','authenticated']){await role(r);await deny(()=>save());}await role();
  await deny(()=>db.query('select public.pma_voice_incident_create_v1($1,$2,$3,$4,$5)',[tenant,property,sid,call,incident]));
  const first=await save();assert.equal(first.state,'CONFIRMED');assert.equal(first.transcriptTurns,2);
  assert.equal((await save()).replayed,true);
  await deny(()=>save(sid,call,property,[{speaker:'customer',content:'Changed text'}]));
  await db.exec('reset role');const rows=await db.query<{content:string}>('select content from public.ai4cc_transcripts where interaction_id=$1 order by sequence_no',[sid]);
  assert.deepEqual(rows.rows.map(x=>x.content),transcript.map(x=>x.content));
  await db.exec(`update public.ai4cc_interactions set started_at=now()-interval '20 minutes',ended_at=now()-interval '6 minutes' where id='${sid}'`);await role();await deny(()=>save());
  await db.exec('reset role;rollback');
 }finally{await db.close();}
});
