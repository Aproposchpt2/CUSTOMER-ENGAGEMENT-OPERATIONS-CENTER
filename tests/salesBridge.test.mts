import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../twilio-bridge/server.js', import.meta.url), 'utf8').replace(/start\(\);\s*$/, 'globalThis.handleCall = handleCall; globalThis.wsPool = wsPool;');
async function session(profile:string, failSave=false, warm=false, staging=false, supportSave:any=null) {
  const outbound:any[]=[], requests:any[]=[], sockets:any[]=[], phoneOutbound:any[]=[];
  class Socket extends EventEmitter {
    static OPEN=1; readyState=1;
    constructor(..._args:any[]){super();sockets.push(this);queueMicrotask(()=>this.emit('open'));}
    send(raw:string){outbound.push(JSON.parse(raw));}
    close(){this.readyState=3;}
  }
  const timers:any[]=[];
  const context:any={require:(n:string)=>n==='./staging-support-intake.cjs'?{readiness:()=>'STAGING_WRITES_DISABLED',submitStagingSupport:async()=>{if(supportSave)return supportSave();throw new Error('STAGING_WRITES_DISABLED');}}:n==='./safety-intents.cjs'?require('../twilio-bridge/safety-intents.cjs'):n==='./sales-intents.cjs'?require('../twilio-bridge/sales-intents.cjs'):n==='./support-intents.cjs'?require('../twilio-bridge/support-intents.cjs'):n==='express'?()=>({}):n==='ws'?{WebSocket:Socket,WebSocketServer:class{}}:require(n),console:{log(){},error(){}},process:{env:{OPENAI_API_KEY:'mock',BRIDGE_HMAC_SECRET:'mock',NETLIFY_BASE_URL:'https://staging.invalid',RAILWAY_ENVIRONMENT_NAME:staging?'staging':'test'}},Buffer,URL,AbortSignal,setTimeout:(fn:any,ms:number)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},setInterval:(fn:any,ms:number)=>{timers.push({fn,ms,interval:true});return timers.length;},clearInterval:(id:number)=>{if(timers[id-1])timers[id-1].cleared=true;},fetch:async(url:string,opts:any)=>{
    const body=JSON.parse(opts.body);requests.push(body);
    return {ok:true,json:async()=>body.action==='start'?{interactionId:'fictional-interaction',transferAllowed:'yes',knownCallerName:'Test'}:failSave?{}:{lead:{id:'fictional-lead'}}};
  }};
  vm.runInNewContext(source,context);
  const phone:any=new EventEmitter();phone.readyState=1;phone.send=(raw:string)=>phoneOutbound.push(JSON.parse(raw));phone.close=()=>{phone.readyState=3;};
  if(warm){const pooled:any=new Socket();pooled._poolReady=true;context.wsPool.push(pooled);}
  await context.handleCall(phone,profile,'+12025550199','TEST_CALL');
  phone.emit('message',Buffer.from(JSON.stringify({event:'start',start:{streamSid:'TEST_STREAM'}})));
  const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};await flush();
  const ws=sockets[0];
  const tool=async(id:string,name:string,args:any={},envelope=false)=>{const event=staging&&profile==='support'?{type:'response.output_item.done',item:{type:'function_call',call_id:id,name,arguments:JSON.stringify(args)}}:{type:'response.function_call_arguments.done',call_id:id,name,arguments:JSON.stringify(args)};ws.emit('message',Buffer.from(JSON.stringify(envelope?{type:'response.event',event}:event)));await flush();};
  return {outbound,requests,phone,ws,tool,timers,phoneOutbound,flush};
}
const oai=(s:any,e:any)=>s.ws.emit('message',Buffer.from(JSON.stringify(e)));
const phoneEvent=(s:any,e:any)=>s.phone.emit('message',Buffer.from(JSON.stringify(e)));
const GOOD_LEAD={callerName:'Test Caller',description:'Prospect called about Sales Specialist service. Interested in AI-powered inbound sales. Has 5 agents. Budget confirmed. Needs demo.'};

test('RUF-006: sales delegation instructions include the full intent catalog',async()=>{
  const s=await session('sales');
  const inst=s.outbound.find((x:any)=>x.type==='session.start').session.delegation.responses.instructions;
  assert.match(inst,/SALES INTENT CATALOG/);
  assert.match(inst,/SAL-001/);
  assert.match(inst,/SAL-040/);
  assert.match(inst,/SAL-065/);
  assert.match(inst,/SAL-081/);
});

test('RUF-009: callerName required — rejects missing callerName',async()=>{
  const s=await session('sales');
  await s.tool('save','submit_business_profile',{description:GOOD_LEAD.description});
  assert.match(s.outbound.find((x:any)=>x.item?.call_id==='save').item.output,/callerName is required/);
});

test('RUF-009: description length — rejects summaries under 50 characters',async()=>{
  const s=await session('sales');
  await s.tool('save','submit_business_profile',{callerName:'Test',description:'Too short'});
  assert.match(s.outbound.find((x:any)=>x.item?.call_id==='save').item.output,/50 characters/);
});

test('RUF-009: intentId optional — submit succeeds without intentId',async()=>{
  const s=await session('sales');
  await s.tool('save','submit_business_profile',{...GOOD_LEAD});
  assert.match(s.outbound.find((x:any)=>x.item?.call_id==='save').item.output,/fictional-lead/);
});

test('RUF-010: staging sales lead save returns synthetic ID without external HTTP call',async()=>{
  const s=await session('sales',false,false,true);
  await s.tool('save','submit_business_profile',{...GOOD_LEAD});
  const out=s.outbound.find((x:any)=>x.item?.call_id==='save').item.output;
  assert.match(out,/staging-lead-/);
  assert.equal(s.requests.filter((x:any)=>x.action==='submit').length,0,'no external HTTP on staging save');
});

test('RUF-010: idempotency — second submit_business_profile returns alreadySaved without re-submitting',async()=>{
  const s=await session('sales');
  await s.tool('first','submit_business_profile',{...GOOD_LEAD});
  await s.tool('second','submit_business_profile',{...GOOD_LEAD});
  assert.match(s.outbound.find((x:any)=>x.item?.call_id==='first').item.output,/fictional-lead/);
  assert.match(s.outbound.find((x:any)=>x.item?.call_id==='second').item.output,/alreadySaved/);
  assert.equal(s.requests.filter((x:any)=>x.action==='submit').length,1,'exactly one backend submit call');
});

test('RUF-008a: interrupt guard blocks response.cancel while lead submission is in flight',async()=>{
  const s=await session('sales');
  // Set greetingPlayed=true: send audio delta from OpenAI, then echo mark from Twilio
  oai(s,{type:'session.output_audio.delta',delta:'AQID'});
  await s.flush();
  phoneEvent(s,{event:'mark',streamSid:'TEST_STREAM',mark:{name:'stellar-greeting-start'}});
  await s.flush();
  // Emit tool call — executeTool sets leadSubmissionPending=true synchronously before first await
  s.ws.emit('message',Buffer.from(JSON.stringify({type:'response.function_call_arguments.done',call_id:'in-flight',name:'submit_business_profile',arguments:JSON.stringify(GOOD_LEAD)})));
  // Emit speech_started immediately (leadSubmissionPending is true; guard must NOT fire)
  s.ws.emit('message',Buffer.from(JSON.stringify({type:'input_audio_buffer.speech_started'})));
  await s.flush();
  assert.equal(s.outbound.filter((x:any)=>x.type==='response.cancel').length,0,'response.cancel must not fire while leadSubmissionPending');
});

test('RUF-008a: interrupt guard fires normally when no submission is pending',async()=>{
  const s=await session('sales');
  // Set greetingPlayed=true
  oai(s,{type:'session.output_audio.delta',delta:'AQID'});
  await s.flush();
  phoneEvent(s,{event:'mark',streamSid:'TEST_STREAM',mark:{name:'stellar-greeting-start'}});
  await s.flush();
  // No pending submission — speech_started SHOULD trigger response.cancel
  oai(s,{type:'input_audio_buffer.speech_started'});
  await s.flush();
  assert.ok(s.outbound.some((x:any)=>x.type==='response.cancel'),'response.cancel must fire when no lead is pending');
});
