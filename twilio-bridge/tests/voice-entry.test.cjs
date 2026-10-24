'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {routes,makeRouteToken,verifyRouteToken,boundInstructions,createVoiceEntry}=require('../voice-entry.cjs');
const {processVoiceDemo}=require('../../lib/voiceDemo/gateway.cjs');
const secret='synthetic-signing-secret-only';
const session={session_id:'11111111-1111-4111-8111-111111111111',call_sid:'CA'+'a1'.repeat(16),caller_number:'+15555550123',account_sid:'AC'+'b1'.repeat(16),agentRoute:'support-specialist',start_time:new Date(Date.now()-1000).toISOString()};
const env={STELLAR_BRIDGE_STAGING:'true',PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:secret,TWILIO_ACCOUNT_SID:session.account_sid,TWILIO_AUTH_TOKEN:'synthetic-twilio-token',PMA_STAGING_DID:'+15555550100',PMA_STAGING_TEST_CALLER:session.caller_number};
const start={callSid:session.call_sid,accountSid:session.account_sid};
for(const [digit,r]of Object.entries(routes))test('digit '+digit+' binds only '+r.agent,()=>{
 const s={...session,agentRoute:r.agent};const token=makeRouteToken(s,secret);assert.equal(verifyRouteToken(token,secret,r.profile,start).agentRoute,r.agent);
 assert.equal(verifyRouteToken(token,secret,r.profile==='support'?'sales':'support',start),null);
});
test('route tokens reject tampering, expiry, other calls and accounts',()=>{
 const token=makeRouteToken(session,secret);assert.equal(verifyRouteToken(token+'0',secret,'support',start),null);
 assert.equal(verifyRouteToken(token,secret,'support',{...start,callSid:'CA'+'a2'.repeat(16)}),null);
 assert.equal(verifyRouteToken(token,secret,'support',{...start,accountSid:'AC'+'b2'.repeat(16)}),null);
 assert.equal(verifyRouteToken(token,secret,'support',start,Date.now()+121000),null);
 assert.throws(()=>makeRouteToken({...session,agentRoute:'constructor'},secret));
});
test('session agentRoute is immutable',()=>{
 const s=verifyRouteToken(makeRouteToken(session,secret),secret,'support',start);assert.throws(()=>{s.agentRoute='sales-specialist';});
});
test('wrong profile cannot load another agent assets',()=>{
 assert.throws(()=>boundInstructions('base',session,{agentRoute:'sales-specialist'}));
 const text=boundInstructions('base',session,{agentRoute:'support-specialist',knowledgeEntries:[]});assert.match(text,/Support KB/);assert.doesNotMatch(text,/"group":"sales"/);assert.match(text,/empty/);
});
test('disabled staging entry makes no gateway request',async()=>{
 let calls=0;const entry=createVoiceEntry({...env,VOICE_DEMO_IVR_ENABLED:'false'},async()=>{calls++;});let code;
 await entry.handle({method:'POST'}, {setHeader(){},status(n){code=n;return this;},send(){}},'entry');assert.equal(code,503);assert.equal(calls,0);
});
test('entry forwards original signature through authenticated gateway and emits bound stream',async()=>{
 let payload;const entry=createVoiceEntry(env,async(url,options)=>{assert.equal(url,env.PMA_STAGING_BASE_URL+'/api/intake/voice-demo-staging');const [ts,sig]=options.headers['x-bridge-signature'].split('.');assert.equal(sig,crypto.createHmac('sha256',secret).update(`pma-staging:${ts}:${options.body}`).digest('hex'));payload=JSON.parse(options.body);return{ok:true,json:async()=>({result:{session}})};});let response;
 await entry.handle({method:'POST',path:'/api/ivr/router',headers:{'x-twilio-signature':'original'},body:{Digits:'1'}},{setHeader(){},type(){return this;},send(s){response=s;}},'route');
 assert.equal(payload.twilioSignature,'original');assert.match(response,/wss:\/\/ai4-pma-bridge-staging.fly.dev\/support-stream/);assert.match(response,/bridge_token/);assert.match(response,/\/api\/intake\/voice-demo-status-staging/);
});
function request(digit='1'){return {action:'route',originalPath:'/api/ivr/router',twilioSignature:'valid',params:{AccountSid:session.account_sid,CallSid:session.call_sid,From:session.caller_number,To:env.PMA_STAGING_DID,Digits:digit}};}
function dependencies(extra={}){return {env,validateRequest:(_token,sig,url)=>sig==='valid'&&url==='https://ai4-pma-bridge-staging.fly.dev/api/ivr/router',record:async()=>({...session}),knowledge:async()=>[],...extra};}
test('forged provider signature and caller rejected before persistence',async()=>{
 let writes=0;const dep=dependencies({record:async()=>{writes++;return session;}});let b=request();b.twilioSignature='forged';await assert.rejects(processVoiceDemo(b,dep),/signature/);
 b=request();b.params.From='+15555550999';await assert.rejects(processVoiceDemo(b,dep),/caller/);assert.equal(writes,0);
});
test('foreign origins and production DIDs rejected',async()=>{
 const b=request();b.originalPath='https://attacker.test/api/ivr/router';await assert.rejects(processVoiceDemo(b,dependencies()),/signature/);
 await assert.rejects(processVoiceDemo(request(),dependencies({env:{...env,PMA_STAGING_DID:'+17253305102'}})),/caller/);
});
test('zero repeats and invalid digits do not select an agent; empty means timeout',async()=>{
 for(const [digit,event]of [['0','repeat'],['9','repeat'],['constructor','repeat'],['','timeout']]){
  let actual;await processVoiceDemo(request(digit),dependencies({record:async args=>{actual=args;return {...session,agentRoute:null};}}));assert.equal(actual.event,event);assert.equal(actual.agent_route,null);
 }
});
test('draft, private and cross-agent knowledge never reaches caller assets',async()=>{
 const good={id:'approved',title:'Approved FAQ',content:'Reference data',version_num:1,approved:true,publication_state:'published',visibility:'public',source_status:'VERIFIED',tags:['agent:support-specialist']};
 const entries=[good,{...good,id:'draft',publication_state:'draft'},{...good,id:'sales',tags:['agent:sales-specialist']},{...good,id:'staff',visibility:'staff'}];
 const result=await processVoiceDemo({action:'stream_start',call_sid:session.call_sid,session_id:session.session_id,agentRoute:session.agentRoute},dependencies({knowledge:async()=>entries}));assert.deepEqual(result.assets.knowledgeEntries.map(e=>e.id),['approved']);
});
test('Sales cannot invoke Support workflow even with valid session transport',async()=>{
 const sales={...session,agentRoute:'sales-specialist'};
 await assert.rejects(processVoiceDemo({action:'support_rpc',call_sid:sales.call_sid,session_id:sales.session_id,agentRoute:sales.agentRoute,args:{}},dependencies({env:{...env,VOICE_DEMO_WORKFLOWS_ENABLED:'true'},record:async()=>sales})),/Agent workflow mismatch/);
});
test('provider completion callback is signature checked',async()=>{
 let writes=0;const b={action:'status',originalPath:'/api/ivr/status',twilioSignature:'forged',params:{AccountSid:session.account_sid,CallSid:session.call_sid,StreamEvent:'stream-stopped'}};
 await assert.rejects(processVoiceDemo(b,dependencies({record:async()=>{writes++;}})),/signature/);assert.equal(writes,0);
});

test('PMA voice session includes only verified published public property facts without requiring legacy agent tags',async()=>{
 const pma={...session,agentRoute:'property-management-assistant'};
 const good={id:'property-fact',title:'Property FAQ',content:'Published staging property fact',version_num:1,approved:true,publication_state:'published',visibility:'public',source_status:'VERIFIED',tags:[]};
 const entries=[good,{...good,id:'staff-secret',visibility:'staff'},{...good,id:'resident-secret',visibility:'resident'},{...good,id:'draft',publication_state:'draft'},{...good,id:'expired',expires_at:'2020-01-01T00:00:00Z'},{...good,id:'unapproved',approved:false},{...good,id:'unverified',source_status:'REVIEW'}];
 const result=await processVoiceDemo({action:'stream_start',call_sid:pma.call_sid,session_id:pma.session_id,agentRoute:pma.agentRoute},dependencies({record:async()=>pma,knowledge:async route=>{assert.equal(route,pma.agentRoute);return entries;}}));
 assert.equal(result.assets.knowledgeAvailable,true);
 assert.deepEqual(result.assets.knowledgeEntries.map(e=>e.id),['property-fact']);
 const spoken=boundInstructions('PMA prompt',pma,result.assets);
 assert.match(spoken,/Published staging property fact/);
 for(const denied of ['staff-secret','resident-secret','unapproved','unverified'])assert.doesNotMatch(spoken,new RegExp(denied));
});
test('PMA with no published knowledge reports unavailable and cannot improvise property facts',async()=>{
 const pma={...session,agentRoute:'property-management-assistant'};
 const result=await processVoiceDemo({action:'stream_start',call_sid:pma.call_sid,session_id:pma.session_id,agentRoute:pma.agentRoute},dependencies({record:async()=>pma,knowledge:async()=>[]}));
 assert.equal(result.assets.knowledgeAvailable,false);
 assert.deepEqual(result.assets.knowledgeEntries,[]);
 assert.match(boundInstructions('PMA prompt',pma,result.assets),/cannot verify the answer/);
});

test('PMA availability uses only bound PMA session and rejects cross-agent calls',async()=>{
 const pma={...session,agentRoute:'property-management-assistant'};
 const body={action:'pma_availability',call_sid:pma.call_sid,session_id:pma.session_id,agentRoute:pma.agentRoute,args:{bedrooms:1}};
 const availability=async args=>{assert.equal(args.bedrooms,1);return {success:true,units:[{unit:'Synthetic 415',earliestRecordedDate:'2026-10-25'}]};};
 const deps=dependencies({env:{...env,VOICE_DEMO_WORKFLOWS_ENABLED:'true'},record:async()=>pma,availability});
 const ok=await processVoiceDemo(body,deps);
 assert.equal(ok.availability.units[0].unit,'Synthetic 415');
 await assert.rejects(processVoiceDemo({...body,agentRoute:'sales-specialist'},deps),/unavailable/);
 await assert.rejects(processVoiceDemo({...body,args:{bedrooms:-1}},deps),/Invalid availability filter/);
 await assert.rejects(processVoiceDemo({...body,args:{tenantId:'foreign'}},deps),/Invalid availability filter/);
 await assert.rejects(processVoiceDemo(body,dependencies({record:async()=>pma,availability})),/unavailable/);
});

test('INTERNAL ORCHESTRATION TRACE: PMA tool invokes signed gateway, executes inventory provider, returns original result',async()=>{
 const {createPmaAdapter}=require('../pma-adapter.cjs');
 const pma={...session,agentRoute:'property-management-assistant'};
 const trace=[];
 const activeEnv={...env,STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',VOICE_DEMO_WORKFLOWS_ENABLED:'true'};
 const adapter=createPmaAdapter(activeEnv,async (url,options)=>{
  trace.push('signed_bridge_request');
  assert.equal(url,env.PMA_STAGING_BASE_URL+'/api/intake/voice-demo-staging');
  const [ts,sig]=options.headers['x-bridge-signature'].split('.');
  assert.equal(sig,crypto.createHmac('sha256',secret).update('pma-staging:'+ts+':'+options.body).digest('hex'));
  const body=JSON.parse(options.body);
  assert.equal(body.action,'pma_availability');
  assert.equal(body.agentRoute,'property-management-assistant');
  const answer=await processVoiceDemo(body,dependencies({
   env:activeEnv,record:async()=>{trace.push('validated_session');return pma;},
   availability:async args=>{trace.push('inventory_query');assert.equal(args.bedrooms,1);return {success:true,state:'AVAILABLE',requestedBedrooms:1,availabilityMaxAgeHours:24,stagingOnly:true,units:[{unit:'Unit 415',bedrooms:1,recordUpdatedAt:new Date().toISOString(),earliestRecordedDate:'2026-10-25'}]};}
  }));
  trace.push('gateway_response');
  return {ok:true,json:async()=>({result:answer})};
 });
 assert.equal(adapter.enabled,true);
 assert.ok(adapter.tools.some(t=>t.name==='pma_check_availability'));
 trace.push('model_tool_call');
 const result=await adapter.checkAvailability({bedrooms:1},{callSid:pma.call_sid,sessionId:pma.session_id});
 trace.push('voice_tool_result');
 assert.deepEqual(trace,['model_tool_call','signed_bridge_request','validated_session','inventory_query','gateway_response','voice_tool_result']);
 assert.equal(result.success,true);
 assert.equal(result.units[0].unit,'Unit 415');
 assert.equal(result.units[0].earliestRecordedDate,'2026-10-25');
});

test('staging voice agents retain distinct departmental identities and acoustic voice settings',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 const adapter=require('../pma-adapter.cjs');
 const receptionist=require('../voice-receptionist.cjs');
 assert.match(receptionist.INSTRUCTIONS,/AI receptionist/);
 assert.match(server,/profile === 'pma' \? 'verse' : profile === 'sales' \? 'echo' : 'cedar'/);
 assert.match(server,/You have reached Desert Ridge Apartments\. How can I help you\?/);
 assert.match(server,/You have reached Summit Comfort Heating & Air\. How can I help you\?/);
 assert.match(adapter.createPmaAdapter({}).instructions,/You have reached Desert Ridge Apartments\. How can I help you\?/);
 assert.doesNotMatch(adapter.createPmaAdapter({}).instructions,/Start by saying: "Hello, this is the AI4Businesses/);
});

for(const [label,start_time]of [['missing',undefined],['invalid','invalid'],['expired',new Date(Date.now()-3*60*60*1000).toISOString()],['future',new Date(Date.now()+60000).toISOString()]])test('PMA rejects '+label+' session lifetime before knowledge or inventory access',async()=>{
 const pma={...session,agentRoute:'property-management-assistant',start_time};
 let reads=0;
 const deps=dependencies({env:{...env,VOICE_DEMO_WORKFLOWS_ENABLED:'true'},record:async()=>pma,knowledge:async()=>{reads++;return [];},availability:async()=>{reads++;return {};}});
 for(const action of ['stream_start','pma_availability'])await assert.rejects(processVoiceDemo({action,call_sid:pma.call_sid,session_id:pma.session_id,agentRoute:pma.agentRoute,args:{}},deps),/expired or missing lifetime/);
 assert.equal(reads,0);
});
