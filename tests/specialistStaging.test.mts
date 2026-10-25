import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createSpecialistSession,TENANTS,GREETINGS,VOICES}=require('../twilio-bridge/specialist-staging.cjs');
const catalog=require('../twilio-bridge/voice-agent-catalog-expanded.json');
const call='CA00000000000000000000000000000093';
const env=(profile='support')=>({SS_STAGING_INTELLIGENCE_ENABLED:'true',STELLAR_BRIDGE_STAGING:'true',STAGING_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',[profile==='sales'?'SS_STAGING_SALES_TENANT_ID':'SS_STAGING_SUPPORT_TENANT_ID']:TENANTS[profile],STAGING_SUPABASE_SERVICE_ROLE_KEY:'fictional-key',SS_STAGING_HVAC_WRITES_ENABLED:'true',SS_STAGING_SALES_WRITES_ENABLED:'true'});
const args={name:'SS002 Fictional',email:'ss002@example.invalid',phone:'',product:'Fictional furnace',purchaseDate:'2026-10-24',issue:'Fictional no heat test',steps:'None',impact:'Test only',priority:'NORMAL'};
const make=(opts:any={})=>createSpecialistSession({profile:'support',callSid:call,env:env(),trustedSession:{call_sid:call,session_id:'a0000000-0000-4000-8000-000000000001',agentRoute:opts.profile==='sales'?'sales-specialist':'support-specialist'},...opts});
const row={id:'11111111-1111-4111-8111-111111111111',contact_id:'22222222-2222-4222-8222-222222222222',tenant_id:TENANTS.support,intake_session_id:'phone-staging:'+call,test_only:true};
function confirm(s:any){s.observe('Please create a ticket');s.assess({reference:'SUP-049',confidence:1});}
async function prepare(s:any){confirm(s);assert.equal((await s.submit(args)).state,'CONFIRMATION_REQUIRED');s.observe('Yes');s.assess({reference:'SUP-049',confidence:1});}
test('staging binding rejects production, wrong tenant, wrong project and forged call identity',()=>{
 for(const patch of [{STELLAR_BRIDGE_STAGING:'false'},{SS_STAGING_SUPPORT_TENANT_ID:TENANTS.sales},{STAGING_SUPABASE_URL:'https://production.invalid'},{SS_STAGING_INTELLIGENCE_ENABLED:'false'}])assert.throws(()=>make({env:{...env(),...patch}}),/BINDING/);
 assert.throws(()=>make({callSid:'spoof'}),/BINDING/);
});
test('full 283 taxonomy is routed by profile; safety/control shared and foreign domain denied',()=>{
 for(const profile of ['sales','support']){
  const s=make({profile,env:env(profile)});assert.equal(s.greeting,GREETINGS[profile]);assert.equal(s.voice,VOICES[profile]);
  for(const intent of catalog.intents){const z=make({profile,env:env(profile)});const r=z.assess({reference:intent.reference,confidence:1});const allowed=[profile,'universal','conversation_control','safety'].includes(intent.group);assert.equal(r.state,allowed?(intent.group==='safety'?'SAFETY_OVERRIDE':'CLASSIFIED'):'CLARIFY',intent.reference);assert.equal(r.mayExecute,false);}
 }
 assert.equal(make().assess({reference:'SUP-049',confidence:.89}).state,'CLARIFY');
 assert.equal(make().assess({reference:'SUP-049',confidence:NaN}).state,'CLARIFY');
});
test('knowledge reads the bound tenant and denies private, draft, expired and foreign rows',async()=>{
 const base={id:'k1',title:'Heating',content:'Fictional approved checks',tenant_id:TENANTS.support,approved:true,visibility:'public',audience_scope:'public',publication_state:'published',source_status:'VERIFIED'};
 const rows=[base,{...base,id:'private',visibility:'staff'},{...base,id:'foreign',tenant_id:TENANTS.sales},{...base,id:'draft',approved:false},{...base,id:'expired',valid_until:'2020-01-01'},{...base,id:'bad-date',expires_at:'bad'}];
 const s=make({request:async(url:string)=>{const u=new URL(url);assert.equal(u.searchParams.get('tenant_id'),'eq.'+TENANTS.support);assert.equal(u.searchParams.get('visibility'),'eq.public');return {ok:true,json:async()=>rows};}});
 const r=await s.knowledge({query:'Heating'});assert.deepEqual(r.entries.map((x:any)=>x.id),['k1']);assert.equal(r.status,'FOUND');
 assert.equal((await make({request:async()=>{throw Error('secret');}}).knowledge({query:'Heating'})).status,'UNAVAILABLE');
});
test('draft JSON candidates never become caller-approved answers',async()=>{
 const s=make({profile:'sales',env:env('sales'),request:async()=>({ok:true,json:async()=>[]})});
 const r=await s.knowledge({query:'pricing'});assert.equal(r.entries.length,0);assert.equal(r.status,'NO_APPROVED_MATCH');assert.ok(!JSON.stringify(r).includes('approvedVoiceAnswer'));
});
test('split safety transcripts preempt writes and KB retrieval',async()=>{
 let calls=0;const s=make({request:async()=>{calls++;throw Error();}});s.observe('I sm',false);s.observe('ell gas',false);
 assert.equal(s.assess({reference:'SUP-049',confidence:1}).state,'SAFETY_OVERRIDE');assert.equal((await s.submit(args)).state,'SAFETY_OVERRIDE');assert.equal((await s.knowledge({query:'Heating'})).status,'SAFETY_OVERRIDE');assert.equal(calls,0);
 const medical=make();assert.ok(medical.observe('Someone is unconscious'));
});
test('ticket requires classified intent and explicit observed confirmation, never a model flag',async()=>{
 let calls=0;const s=make({request:async()=>{calls++;throw Error();}});assert.equal((await s.submit(args)).state,'INTENT_AUTHORIZATION_REQUIRED');confirm(s);assert.equal((await s.submit(args)).state,'CONFIRMATION_REQUIRED');
 for(const text of ['not correct','no, do not submit','yes but change my email']){s.observe(text);s.assess({reference:'SUP-049',confidence:1});assert.equal((await s.submit(args)).state,'CONFIRMATION_REQUIRED');}assert.equal(calls,0);
 await assert.rejects(s.submit({...args,tenantId:TENANTS.sales}),/INVALID_SUPPORT_ARGUMENTS/);
});
test('write performs verified readback, stable operation and no duplicate POST',async()=>{
 let posts=0,reads=0;const s=make({request:async(url:string,opts:any)=>{if(opts.method==='POST'){posts++;const body=JSON.parse(opts.body);assert.equal(body.p_tenant_id,TENANTS.support);assert.equal(body.p_session_id,'phone-staging:'+call);return {ok:true,json:async()=>[{customer_id:row.contact_id,case_id:row.id}]};}reads++;return {ok:true,json:async()=>posts?[row]:[]};}});
 await prepare(s);const result=await s.submit(args);assert.equal(result.state,'COMPLETED');assert.equal(result.caseId,row.id);assert.equal(result.notificationSent,false);assert.equal((await s.submit(args)).operationId,result.operationId);assert.equal(posts,1);assert.equal(reads,2);
});
test('unknown response reconciles persisted case without retrying POST',async()=>{
 let posts=0;const s=make({request:async(url:string,opts:any)=>{if(opts.method==='POST'){posts++;throw Error('timeout after commit');}return {ok:true,json:async()=>posts?[row]:[]};}});
 await prepare(s);assert.equal((await s.submit(args)).state,'UNKNOWN');assert.equal((await s.submit(args)).state,'COMPLETED');assert.equal(posts,1);
});
test('foreign readback never confirms; closed sessions and Sales cannot write',async()=>{
 let posts=0;const s=make({request:async(url:string,opts:any)=>{if(opts.method==='POST'){posts++;return {ok:true,json:async()=>[]};}return {ok:true,json:async()=>[{...row,tenant_id:TENANTS.sales}]};}});
 await prepare(s);assert.equal((await s.submit(args)).state,'UNKNOWN');assert.equal(posts,0);s.close();assert.equal((await s.submit(args)).state,'SESSION_CLOSED');
 const sales=make({profile:'sales',env:env('sales')});assert.equal((await sales.submit(args)).state,'SALES_STAGING_WRITES_NOT_IMPLEMENTED');
});

test('Live transcript delta consent requires quiet completion and rejects partial yes followed by correction',async()=>{
 let time=1000,calls=0;const s=make({clock:()=>time,request:async()=>{calls++;throw Error();}});
 confirm(s);await s.submit(args);s.observe('yes',false);s.assess({reference:'SUP-049',confidence:1});
 assert.equal((await s.submit(args)).state,'CONFIRMATION_REQUIRED');
 s.observe(' but change the email',false);time+=2000;s.assess({reference:'SUP-049',confidence:1});
 assert.equal((await s.submit(args)).state,'CONFIRMATION_REQUIRED');assert.equal(calls,0);
});

test('Sales uses existing synthetic gateway, ignores model consent, and verifies tenant-bound lead readback',async()=>{
 let writes=0;const lead={id:row.id,tenant_id:TENANTS.sales,metadata:{synthetic:true,voice_demo_session_id:'a0000000-0000-4000-8000-000000000001',notificationsDisabled:true}};
 const s=make({profile:'sales',env:env('sales'),salesSubmit:async(payload:any)=>{writes++;assert.equal(payload.confirmed,true);assert.equal(payload.interactionId,lead.metadata.voice_demo_session_id);return {lead:{id:lead.id},testOnly:true,persisted:true,notificationSent:false};},request:async()=>({ok:true,json:async()=>writes?[lead]:[]})});
 const a={callerName:'Fictional Buyer',businessName:'Test only',email:'buyer@example.invalid',phone:'',serviceInterest:'Sales system',description:'Fictional request for a demo',confirmed:true};
 s.observe('Please capture my inquiry');s.assess({reference:'SAL-033',confidence:1});assert.equal((await s.submitSales(a)).state,'CONFIRMATION_REQUIRED');assert.equal(writes,0);
 s.observe('Yes');s.assess({reference:'SAL-033',confidence:1});const result=await s.submitSales(a);assert.equal(result.state,'COMPLETED');assert.equal(result.leadId,lead.id);assert.equal((await s.submitSales(a)).leadId,lead.id);assert.equal(writes,1);
});
test('runtime builder refuses absent or foreign signed route context',()=>{
 assert.throws(()=>make({trustedSession:null}),/TRUSTED_SPECIALIST/);
 assert.throws(()=>make({trustedSession:{call_sid:call,session_id:'a0000000-0000-4000-8000-000000000001',agentRoute:'sales-specialist'}}),/TRUSTED_SPECIALIST/);
});
