import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {createHmac} from 'node:crypto';
import vm from 'node:vm';
const require=createRequire(new URL('../twilio-bridge/server.js',import.meta.url));
function fixture(){
 const logs:string[]=[],opened:any[]=[],phones:any[]=[];const server:any=new EventEmitter();server.listen=()=>{};
 class Socket extends EventEmitter {static OPEN=1;static CLOSED=3;readyState=1;send(){}close(){this.readyState=3;}}
 class WSS {handleUpgrade(_req:any,_socket:any,_head:any,callback:any){const ws=new Socket();phones.push(ws);callback(ws);}}
 const app={use(){},all(){},get(){}};const express:any=()=>app;express.urlencoded=()=>()=>{};
 const env={OPENAI_API_KEY:'synthetic-key',BRIDGE_HMAC_SECRET:'synthetic-hmac-secret',STELLAR_BRIDGE_STAGING:'true',PMA_CHANNELS_ENABLED:'true',VOICE_DEMO_IVR_ENABLED:'true',PMA_STAGING_BASE_URL:'https://pma-validation--ai4cc-staging.netlify.app'};
 const context:any={require:(n:string)=>n==='express'?express:n==='http'?{createServer:()=>server}:n==='ws'?{WebSocket:Socket,WebSocketServer:WSS}:require(n),console:{log:(v:string)=>logs.push(v),error:(...v:any[])=>logs.push(v.join(' '))},process:{env,exit(){throw Error('unexpected process exit');}},Buffer,URL,AbortSignal,fetch:async()=>{throw Error('No network permitted');},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}};
 const source=readFileSync('twilio-bridge/server.js','utf8').replace(/start\(\);\s*$/,'globalThis.startTest=start;globalThis.setCallHandler=fn=>{handleCall=fn;};');
 vm.runInNewContext(source,context);context.setCallHandler((...args:any[])=>opened.push(args));context.startTest();
 const connect=(url:string)=>{const socket:any={destroyed:false,destroy(){this.destroyed=true;}};server.emit('upgrade',{url,headers:{host:'staging.invalid'},socket:{remoteAddress:'192.0.2.123'}},socket,Buffer.alloc(0));return {socket,phone:phones.at(-1)};};
 return {logs,opened,connect,env};
}
test('PMA R5: pre-authentication path and event values cannot leak private data',()=>{
 const f=fixture(),sensitive='PRIVATE-CUSTOMER-12025550199';
 const c=f.connect('/ws/pma/'+sensitive);
 c.phone?.emit('message',Buffer.from(JSON.stringify({event:sensitive})));
 assert.doesNotMatch(f.logs.join('\n'),/PRIVATE-CUSTOMER|12025550199|192\.0\.2\.123/);
 assert.equal(f.opened.length,0);
});
test('PMA R5: legacy profile-only token cannot bypass trusted PMA route/session binding',()=>{
 const f=fixture(),payload='pma:'+Math.floor(Date.now()/1000)+':synthetic-nonce';
 const token=payload+':'+createHmac('sha256',f.env.BRIDGE_HMAC_SECRET).update(payload).digest('hex');
 const c=f.connect('/ws/pma');c.phone.emit('message',Buffer.from(JSON.stringify({event:'start',start:{callSid:'CA'+'1'.repeat(32),customParameters:{bridge_token:token}}})));
 assert.equal(f.opened.length,0);assert.equal(c.phone.readyState,3);
});
test('PMA R5: trusted PMA routes and existing Sales/Support legacy entry remain functional',()=>{
 for(const url of ['/ws/pma','/pma-stream']){
  const f=fixture(),session={agentRoute:'property-management-assistant',session_id:'a0000000-0000-4000-8000-000000000001',call_sid:'CA'+'1'.repeat(32),account_sid:'AC'+'2'.repeat(32),caller_number:'+12025550199'};
  const token=require('./voice-entry.cjs').makeRouteToken(session,f.env.BRIDGE_HMAC_SECRET);
  const c=f.connect(url);c.phone.emit('message',Buffer.from(JSON.stringify({event:'start',start:{callSid:session.call_sid,accountSid:session.account_sid,customParameters:{bridge_token:token}}})));
  assert.equal(f.opened.length,1);assert.equal(f.opened[0][1],'pma');assert.equal(f.opened[0][3],session.call_sid);
 }
 for(const profile of ['sales','support']){
  const f=fixture(),payload=profile+':'+Math.floor(Date.now()/1000)+':synthetic-nonce';const token=payload+':'+createHmac('sha256',f.env.BRIDGE_HMAC_SECRET).update(payload).digest('hex');
  const c=f.connect('/ws/'+profile);c.phone.emit('message',Buffer.from(JSON.stringify({event:'start',start:{callSid:'CA'+'1'.repeat(32),customParameters:{bridge_token:token}}})));
  assert.equal(f.opened.length,1);assert.equal(f.opened[0][1],profile);
 }
});
