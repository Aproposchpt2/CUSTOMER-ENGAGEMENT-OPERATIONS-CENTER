'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {routes,makeRouteToken,verifyRouteToken,boundInstructions,createVoiceEntry}=require('../voice-entry.cjs');
const {processVoiceDemo}=require('../../lib/voiceDemo/gateway.cjs');
const secret='synthetic-signing-secret-only';
const session={session_id:'11111111-1111-4111-8111-111111111111',call_sid:'CA'+'a1'.repeat(16),caller_number:'+15555550123',account_sid:'AC'+'b1'.repeat(16),agentRoute:'support-specialist'};
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
