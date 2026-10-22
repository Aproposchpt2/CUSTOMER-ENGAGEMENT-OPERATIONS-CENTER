import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import twilio from 'twilio';
import * as domain from '../lib/propertyManagement/domain.ts';
const base='https://pma-validation--ai4cc-staging.netlify.app';
function load(path:string,deps:Record<string,unknown>,env:Record<string,string>){
 const module={exports:{}};
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},URL,Date,Buffer,require:(name:string)=>{if(!(name in deps))throw Error('Unexpected import '+name);return deps[name];}});
 return module.exports as any;
}
function fixture(){
 const env={PMA_CHANNELS_ENABLED:'true',PMA_STAGING_BASE_URL:base,BRIDGE_HMAC_SECRET_STAGING:'synthetic-hmac',PMA_STAGING_BRIDGE_WS_URL:'wss://synthetic-staging.up.railway.app',TWILIO_AUTH_TOKEN:'synthetic-twilio',TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),PMA_STAGING_DID:'+17029351414',PMA_STAGING_TEST_CALLER:'+12025550199'};
 const server={stagingGate(){},result:(x:any)=>x,privateResponse(){},fail:(res:any,e:any)=>res.status(e.status??500).send(e.message)};
 const transport=load('lib/propertyManagement/transport.ts',{'@supabase/supabase-js':{},crypto,twilio,'./server':server,'./domain':domain,'./intentCatalog':{}},env);
 const handler=load('pages/api/twilio/pma-voice-staging.ts',{crypto,'@/lib/propertyManagement/transport':transport,'@/lib/propertyManagement/server':server,'@/lib/propertyManagement/domain':domain},env).default;
 function request(overrides:any={},signed=true){
  const body={AccountSid:env.TWILIO_ACCOUNT_SID,To:env.PMA_STAGING_DID,From:env.PMA_STAGING_TEST_CALLER,CallSid:'CA'+'2'.repeat(32),...overrides};
  const req={method:'POST',url:'/api/twilio/pma-voice-staging',body,headers:{'x-twilio-signature':signed?twilio.getExpectedTwilioSignature(env.TWILIO_AUTH_TOKEN,base+'/api/twilio/pma-voice-staging',body):'invalid'}};
  const res:any={statusCode:200,headers:{},status(n:number){this.statusCode=n;return this;},setHeader(k:string,v:string){this.headers[k]=v;},send(value:any){this.body=value;return this;}};
  handler(req,res);return res;
 }
 return {env,request};
}
test('signed dedicated PMA webhook emits the bridge route and a valid profile token',()=>{
 const {env,request}=fixture(),res=request();assert.equal(res.statusCode,200);assert.equal(res.headers['Content-Type'],'text/xml');
 const stream=res.body.match(/<Stream url="([^"]+)"/)[1];assert.equal(new URL(stream).pathname,'/ws/pma');
 const token=res.body.match(/name="bridge_token" value="([^"]+)"/)[1];
 const [profile,ts,nonce,sig]=token.split(':');assert.equal(profile,'pma');
 assert.equal(sig,crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET_STAGING).update([profile,ts,nonce].join(':')).digest('hex'));
 assert.ok(Math.abs(Date.now()/1000-Number(ts))<2);
});
test('unsigned, foreign caller, production DID and foreign account never receive a stream',()=>{
 const {request}=fixture();for(const res of [request({},false),request({From:'+12025550198'}),request({To:'+17253305102'}),request({AccountSid:'AC'+'3'.repeat(32)})]){assert.equal(res.statusCode,403);assert.doesNotMatch(res.body,/<Stream/);}
});
test('disabled staging channels fail closed before emitting a token',()=>{
 const {env,request}=fixture();env.PMA_CHANNELS_ENABLED='false';const res=request();assert.equal(res.statusCode,503);assert.doesNotMatch(res.body,/<Stream/);
});
