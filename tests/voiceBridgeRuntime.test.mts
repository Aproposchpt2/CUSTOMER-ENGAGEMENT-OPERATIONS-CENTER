import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../twilio-bridge/server.js', import.meta.url), 'utf8').replace(/start\(\);\s*$/, 'globalThis.handleCall = handleCall;');
async function session(profile, failSave = false) {
  const outbound:any[] = [], requests:any[] = [], sockets:any[] = [];
  class Socket extends EventEmitter {
    static OPEN = 1; readyState = 1;
    constructor(..._args:any[]) { super(); sockets.push(this); queueMicrotask(()=>this.emit('open')); }
    send(raw:string) { outbound.push(JSON.parse(raw)); }
    close() { this.readyState=3; }
  }
  const timers:any[]=[];
  const context:any = { require:(n:string)=>n==='express'?()=>({}):n==='ws'?{WebSocket:Socket,WebSocketServer:class{}}:require(n), console:{log(){},error(){}}, process:{env:{OPENAI_API_KEY:'mock',BRIDGE_HMAC_SECRET:'mock',NETLIFY_BASE_URL:'https://staging.invalid'}}, Buffer, URL, AbortSignal, setTimeout:(fn:any,ms:number)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},fetch:async(url:string,opts:any)=>{
    const body=JSON.parse(opts.body); requests.push(body);
    return {ok:true,json:async()=>body.action==='start'?{interactionId:'fictional-interaction',transferAllowed:'yes',knownCallerName:'Test'}:failSave?{}:{lead:{id:'fictional-lead'}}};
  }};
  vm.runInNewContext(source,context);
  const phone:any=new EventEmitter(); phone.readyState=1;phone.send=()=>{};phone.close=()=>{phone.readyState=3;};
  await context.handleCall(phone,profile,'+12025550199','TEST_CALL');
  phone.emit('message',Buffer.from(JSON.stringify({event:'start',start:{streamSid:'TEST_STREAM'}})));
  const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();}; await flush();
  const ws=sockets[0];
  const tool=async(id:string,name:string,args:any={})=>{ws.emit('message',Buffer.from(JSON.stringify({type:'response.function_call_arguments.done',call_id:id,name,arguments:JSON.stringify(args)})));await flush();};
  return {outbound,requests,phone,ws,tool,timers};
}
test('sales transport registers sales tools and initializes the interaction',async()=>{
 const s=await session('sales'); const start=s.outbound.find(x=>x.type==='session.start');
 assert.ok(start.session.delegation.responses.tools.some((x:any)=>x.name==='submit_business_profile'));
 assert.ok(!start.session.delegation.responses.tools.some((x:any)=>x.name==='submit_support_intake'));
 assert.equal(s.requests[0].action,'start');
 await s.tool('early','transfer_to_specialist');
 assert.match(s.outbound.find(x=>x.item?.call_id==='early').item.output,/not been saved/);
 await s.tool('save','submit_business_profile',{description:'Fictional inquiry'});
 assert.match(s.outbound.find(x=>x.item?.call_id==='save').item.output,/fictional-lead/);
 await s.tool('repeat','submit_business_profile');
 assert.equal(s.requests.filter(x=>x.action==='submit').length,1);
 await s.tool('transfer','transfer_to_specialist');
 assert.deepEqual(JSON.parse(s.outbound.find(x=>x.item?.call_id==='transfer').item.output),{success:true});
});
test('unconfirmed persistence never authorizes a transfer',async()=>{
 const s=await session('sales',true); await s.tool('save','submit_business_profile');await s.tool('transfer','transfer_to_specialist');
 assert.match(s.outbound.find(x=>x.item?.call_id==='save').item.output,/not confirmed/);
 assert.match(s.outbound.find(x=>x.item?.call_id==='transfer').item.output,/not been saved/);
});
test('support transport retains its support tools and disconnect cleanup',async()=>{
 const s=await session('support');assert.equal(s.requests.length,0);
 assert.ok(s.outbound.find(x=>x.type==='session.start').session.delegation.responses.tools.some((x:any)=>x.name==='submit_support_intake'));
 s.phone.emit('message',Buffer.from(JSON.stringify({event:'stop'})));assert.equal(s.ws.readyState,3);
});
