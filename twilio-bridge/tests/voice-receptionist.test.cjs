'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {makeRouteToken,verifyRouteToken,createVoiceEntry}=require('../voice-entry.cjs');
const {startReceptionist,INSTRUCTIONS}=require('../voice-receptionist.cjs');
const {processVoiceDemo}=require('../../lib/voiceDemo/gateway.cjs');
const s={session_id:'11111111-1111-4111-8111-111111111111',call_sid:'CA'+'a1'.repeat(16),caller_number:'+15555550123',account_sid:'AC'+'b1'.repeat(16),agentRoute:null,end_time:null};
const env={STELLAR_BRIDGE_STAGING:'true',PMA_ENVIRONMENT:'staging',VOICE_DEMO_IVR_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app',BRIDGE_HMAC_SECRET:'synthetic-key',TWILIO_ACCOUNT_SID:s.account_sid,PMA_STAGING_TEST_CALLER:s.caller_number};
const tick=()=>new Promise(r=>setImmediate(r));
class Socket extends EventEmitter{readyState=1;sent=[];send(x){this.sent.push(JSON.parse(x));}close(){this.readyState=3;this.emit('close');}message(x){this.emit('message',JSON.stringify(x));}}
function setup(overrides={}){
 const twilio=new Socket(),live=new Socket(),state={choices:[],ends:[],handoffs:[],release:0};
 const entry={reception:async(session,agent=null)=>{if(!agent)return s;state.choices.push(agent);return {...s,agentRoute:agent};},endReception:async(_,r)=>state.ends.push(r),...overrides};
 const controller=startReceptionist({twilioWs:twilio,session:s,startMessage:{event:'start',start:{streamSid:'MZtest',callSid:s.call_sid,accountSid:s.account_sid}},entry,openLive:()=>live,model:'existing-live',reasoningModel:'existing-reasoning',release:()=>state.release++,handoff:(profile,session)=>state.handoffs.push({profile,session})});
 return {twilio,live,state,controller};
}
test('reception token cannot authorize specialist or cross-call access',()=>{
 const start={callSid:s.call_sid,accountSid:s.account_sid},token=makeRouteToken(s,env.BRIDGE_HMAC_SECRET,Date.now(),true);
 assert.equal(verifyRouteToken(token,env.BRIDGE_HMAC_SECRET,'ivr',start).agentRoute,null);
 for(const profile of ['support','sales','pma'])assert.equal(verifyRouteToken(token,env.BRIDGE_HMAC_SECRET,profile,start),null);
 assert.equal(verifyRouteToken(token,env.BRIDGE_HMAC_SECRET,'ivr',{...start,callSid:'CA'+'00'.repeat(16)}),null);
 assert.equal(verifyRouteToken(token,env.BRIDGE_HMAC_SECRET,'ivr',start,Date.now()+121000),null);
});
test('verified entry connects directly to OpenAI receptionist without Twilio speech',async()=>{
 const entry=createVoiceEntry(env,async()=>({ok:true,json:async()=>({result:{session:s}})}));let xml;
 await entry.handle({method:'POST',path:'/api/ivr/main',headers:{},body:{}},{setHeader(){},type(){return this;},send(x){xml=x;}},'entry');
 assert.match(xml,/\/ivr-stream/);assert.match(xml,/ivr0\./);assert.doesNotMatch(xml,/<Say|Polly|<Gather/);
});
test('receptionist uses Marin, approved greeting and only one allowlisted routing tool',async()=>{
 const x=setup();await tick();const config=x.live.sent[0].session;
 assert.equal(config.audio.output.voice,'marin');assert.match(INSTRUCTIONS,/Thanks for calling the Apropos Group/);assert.match(INSTRUCTIONS,/ambiguous/);
 assert.deepEqual(config.delegation.responses.tools.map(t=>t.name),['select_agent']);x.controller.close('TEST_END');
});
for(const [digit,profile]of [['1','support'],['2','sales'],['3','pma']])test('keypad '+digit+' hands off once without ending parent call',async()=>{
 const x=setup();await tick();x.twilio.message({event:'dtmf',streamSid:'MZtest',dtmf:{digit}});x.twilio.message({event:'dtmf',streamSid:'MZtest',dtmf:{digit:'2'}});await tick();
 assert.equal(x.state.handoffs.length,1);assert.equal(x.state.handoffs[0].profile,profile);assert.equal(x.state.ends.length,0);assert.equal(x.twilio.readyState,1);assert.equal(x.state.release,1);assert.equal(Object.isFrozen(x.state.handoffs[0].session),true);
});
test('spoken selection uses completed OpenAI tool output and deduplicates',async()=>{
 const x=setup();await tick();const item={type:'function_call',call_id:'call_1',name:'select_agent',arguments:JSON.stringify({agentRoute:'sales-specialist'})};
 x.live.message({type:'response.event',event:{type:'response.output_item.done',item}});x.live.message({type:'response.output_item.done',item});await tick();
 assert.equal(x.state.handoffs.length,1);assert.equal(x.state.handoffs[0].profile,'sales');
});
test('invalid tool destination cannot route and stays conversational',async()=>{
 const x=setup();await tick();x.live.message({type:'response.output_item.done',item:{type:'function_call',call_id:'bad',name:'select_agent',arguments:'{"agentRoute":"https://attacker.test"}'}});await tick();
 assert.equal(x.state.handoffs.length,0);assert.ok(x.live.sent.some(m=>m.type==='response.item.create'));x.controller.close('TEST_END');
});
test('zero repeats; invalid key and foreign stream cannot select',async()=>{
 const x=setup();await tick();for(const digit of ['0','9'])x.twilio.message({event:'dtmf',streamSid:'MZtest',dtmf:{digit}});
 x.twilio.message({event:'dtmf',streamSid:'foreign',dtmf:{digit:'1'}});assert.equal(x.state.choices.length,0);assert.equal(x.live.sent.filter(m=>m.type==='session.instructions.append').length,2);x.controller.close('TEST_END');
});
test('reception lookup failure closes once and never exposes OpenAI',async()=>{
 const x=setup({reception:async()=>{throw Error('Rejected');}});await tick();assert.equal(x.live.sent.length,0);assert.equal(x.twilio.readyState,3);assert.equal(x.state.release,1);assert.equal(x.state.ends.length,1);
});
test('DTMF received during authorization is queued and cannot race initialization',async()=>{
 let resolve;const gate=new Promise(r=>resolve=r);const x=setup({reception:async(_,agent)=>{if(!agent){await gate;return s;}return {...s,agentRoute:agent};}});
 x.twilio.message({event:'dtmf',streamSid:'MZtest',dtmf:{digit:'3'}});assert.equal(x.state.handoffs.length,0);resolve();await tick();assert.equal(x.state.handoffs[0].profile,'pma');assert.equal(x.state.ends.length,0);
});
test('reception gateway rejects already selected sessions and foreign callers',async()=>{
 const body={action:'reception_start',session_id:s.session_id,call_sid:s.call_sid,caller_number:s.caller_number,agentRoute:null};
 const dep={env,record:async()=>({...s,agentRoute:'support-specialist'})};await assert.rejects(processVoiceDemo(body,dep),/already routed/);
 await assert.rejects(processVoiceDemo({...body,caller_number:'+15555550999'},dep),/binding/);
 await assert.rejects(processVoiceDemo({...body,action:'reception_choose',agentRoute:'other-agent'},dep),/destination/);
});
