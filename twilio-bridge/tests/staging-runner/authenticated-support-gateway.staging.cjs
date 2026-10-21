'use strict';
// Review-only staging module. No listener, Next route or voice-bridge import.
const {createHmac,randomUUID,timingSafeEqual}=require('node:crypto');
const {createSupportIntegration,intake:validateIntake}=require('./support-orchestration-integration.staging.cjs');
const URL='https://hvzauakkhlivzeqatfqm.supabase.co';
const TENANT='5885a020-d363-4c27-910a-c035eda132f5';
const ORIGIN='https://stellaruc-private-voice-poc.netlify.app';
const PREVIEW_ORIGIN='https://deploy-preview-77--stellaruc-private-voice-poc.netlify.app';
const PREFIX='/api/staging-orchestration/';
const AUD='stellar-staging-support-gateway:v1';
const TTL=900,MAX_BODY=16384;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RPCS=new Set(['stellar_orch_lookup_staging','stellar_orch_accept_staging','stellar_orch_transition_staging','stellar_orch_reconcile_case_staging','stellar_create_phone_support_test_intake']);
function fail(status,code){const e=Error(code);e.status=status;e.safeCode=code;throw e;}
const exact=(x,keys)=>x&&Object.getPrototypeOf(x)===Object.prototype&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const response=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(status===202?{'retry-after':'2'}:{})}});
async function readBody(req,signal){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers.get('content-type')||''))fail(415,'JSON_REQUIRED');
  if(Number(req.headers.get('content-length')||0)>MAX_BODY)fail(413,'BODY_TOO_LARGE');
  const reader=req.body?.getReader();if(!reader)fail(400,'INVALID_REQUEST');
  const chunks=[];let size=0;
  try{for(;;){const r=await bounded(reader.read(),signal);if(r.done)break;size+=r.value.byteLength;if(size>MAX_BODY)fail(413,'BODY_TOO_LARGE');chunks.push(r.value);}}
  catch(e){void reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'INVALID_REQUEST');}
}
function bounded(promise,signal){
  if(signal.aborted)return Promise.reject(Object.assign(Error('REQUEST_DEADLINE'),{safeCode:'REQUEST_DEADLINE',status:503}));
  return new Promise((resolve,reject)=>{const abort=()=>reject(Object.assign(Error('REQUEST_DEADLINE'),{safeCode:'REQUEST_DEADLINE',status:503}));signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
}
function createStagingGateway({env=process.env,request=fetch,now=()=>Date.now(),deadlineMs=5000}={}){
  // Snapshot target/credentials; kill switches are checked per request.
  if(env.SUPABASE_URL!==URL||env.CSS_TENANT_ID!==TENANT)fail(503,'STAGING_TARGET_REJECTED');
  const origin=env.STAGING_ORCHESTRATION_ORIGIN||ORIGIN;
  if(![ORIGIN,PREVIEW_ORIGIN].includes(origin))fail(503,'STAGING_ORIGIN_REJECTED');
  const audience=AUD+':'+origin;
  if(env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')fail(503,'TLS_VERIFICATION_REQUIRED');
  const key=env.SUPABASE_SERVICE_ROLE_KEY,publicKey=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(typeof key!=='string'||key.length<32||typeof publicKey!=='string'||!publicKey)fail(503,'CREDENTIALS_NOT_CONFIGURED');
  if(!Number.isInteger(deadlineMs)||deadlineMs<20||deadlineMs>10000)fail(503,'INVALID_DEADLINE');
  // Domain-separated capability key, never the database credential itself in a token.
  // Rotation invalidates outstanding capabilities; no fallback issuer/key is accepted.
  const signingKey=createHmac('sha256',key).update(AUD+':capability-key').digest();
  const inFlight=new Map();
  const intakeHash=clean=>createHmac('sha256',signingKey).update('confirmed-intake:'+JSON.stringify(clean)).digest('hex');
  function sign(claims){const p=Buffer.from(JSON.stringify(claims)).toString('base64url');return p+'.'+createHmac('sha256',signingKey).update(p).digest('base64url');}
  function verify(token,userId){
    if(typeof token!=='string'||token.length>2048||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]{43}$/.test(token))fail(403,'OPERATION_NOT_AUTHORIZED');
    const [payload,sig]=token.split('.'),expected=createHmac('sha256',signingKey).update(payload).digest();
    const supplied=Buffer.from(sig,'base64url');if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))fail(403,'OPERATION_NOT_AUTHORIZED');
    let c;try{c=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{fail(403,'OPERATION_NOT_AUTHORIZED');}
    const t=Math.floor(now()/1000);
    if(!exact(c,['v','aud','sub','tenantId','operationId','callId','sessionId','intakeHash','iat','exp'])||c.v!==1||c.aud!==audience||c.sub!==userId||c.tenantId!==TENANT||!/^gateway:[0-9a-f-]{36}$/.test(c.operationId)||!UUID.test(c.operationId.slice(8))||!/^CA[0-9a-f]{32}$/.test(c.callId)||c.sessionId!=='phone-staging:'+c.callId||!/^[0-9a-f]{64}$/.test(c.intakeHash)||!Number.isInteger(c.iat)||!Number.isInteger(c.exp)||c.exp-c.iat!==TTL||c.iat>t||c.exp<=t)fail(403,'OPERATION_NOT_AUTHORIZED');
    return c;
  }
  async function json(path,init,signal){
    if(signal.aborted)fail(503,'REQUEST_DEADLINE');
    let r;try{r=await bounded(request(URL+path,{...init,redirect:'error',signal,cache:'no-store'}),signal);}catch{fail(503,'STAGING_UPSTREAM_UNAVAILABLE');}
    let data;try{data=await bounded(r.json(),signal);}catch{fail(503,'STAGING_UPSTREAM_UNAVAILABLE');}
    if(!r.ok){if(path==='/auth/v1/user'&&(r.status===401||r.status===403))fail(401,'SIGN_IN_REQUIRED');fail(503,'STAGING_UPSTREAM_UNAVAILABLE');}
    return data;
  }
  async function authenticate(req,signal){
    const auth=req.headers.get('authorization')||'';
    if(!/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(auth))fail(401,'SIGN_IN_REQUIRED');
    // Remote Auth validation; never decode user-supplied JWT metadata for authorization.
    const headers={apikey:publicKey,authorization:auth};
    const user=await json('/auth/v1/user',{method:'GET',headers},signal);
    if(!UUID.test(user?.id)||user.is_anonymous!==false)fail(401,'SIGN_IN_REQUIRED');
    // User-scoped bearer and publishable key preserve RLS for membership reads.
    const params=new URLSearchParams({select:'user_id,tenant_id,role,status',user_id:'eq.'+user.id,tenant_id:'eq.'+TENANT,status:'eq.ACTIVE',role:'in.(OWNER,ADMIN)',limit:'2'});
    const rows=await json('/rest/v1/tenant_users?'+params,{method:'GET',headers},signal);
    if(!Array.isArray(rows)||rows.length!==1||rows[0].user_id!==user.id||rows[0].tenant_id!==TENANT||rows[0].status!=='ACTIVE'||!['OWNER','ADMIN'].includes(rows[0].role))fail(403,'STAGING_ACCESS_DENIED');
    return user.id;
  }
  const unknown=()=>({success:false,state:'UNKNOWN',notificationSent:false,technicianFollowupConfirmed:false});
  function toolResult(r,c){
    if(!r||r.operationId!==c.operationId||!['ACCEPTED','RUNNING','UNKNOWN','FAILED','COMPLETED'].includes(r.state))fail(503,'RESULT_NOT_VERIFIED');
    if(r.success===true){if(r.state!=='COMPLETED'||r.testOnly!==true||!UUID.test(r.caseId)||!UUID.test(r.customerId)||r.sessionId!==c.sessionId||!UUID.test(r.workflowId)||r.notificationSent!==false||r.technicianFollowupConfirmed!==false)fail(503,'RESULT_NOT_VERIFIED');return {success:true,state:'COMPLETED',caseId:r.caseId,customerId:r.customerId,testOnly:true,notificationSent:false,technicianFollowupConfirmed:false};}
    if(r.state==='COMPLETED'||r.caseId||r.customerId)fail(503,'RESULT_NOT_VERIFIED');
    return {success:false,state:r.state,notificationSent:false,technicianFollowupConfirmed:false};
  }
  return {async handle(req){
    let timer,writeMayHaveStarted=false;
    try{
      if(env.STELLAR_BRIDGE_STAGING!=='true'||env.STAGING_ORCHESTRATION_GATEWAY_ENABLED!=='true'||env.STAGING_SUPPORT_WRITES_ENABLED!=='true')fail(503,'GATEWAY_DISABLED');
      const url=new globalThis.URL(req.url),action=url.pathname.startsWith(PREFIX)?url.pathname.slice(PREFIX.length):'';
      if(!['begin','submit','status'].includes(action)||url.search)fail(404,'NOT_FOUND');
      if(req.method!=='POST')fail(405,'POST_REQUIRED');
      if(url.origin!==origin||req.headers.get('origin')!==origin)fail(403,'ORIGIN_REJECTED');
      const controller=new AbortController();timer=setTimeout(()=>controller.abort(),deadlineMs);
      const signal=AbortSignal.any([controller.signal,req.signal]),body=await readBody(req,signal),userId=await authenticate(req,signal);
      if(action==='begin'){
        if(!exact(body,['confirmed','intake']))fail(400,'INVALID_REQUEST');
        if(body.confirmed!==true)fail(400,'CONFIRMATION_REQUIRED');
        const clean=validateIntake(body.intake);
        const t=Math.floor(now()/1000),callId='CA'+randomUUID().replaceAll('-','');
        const claims={v:1,aud:audience,sub:userId,tenantId:TENANT,operationId:'gateway:'+randomUUID(),callId,sessionId:'phone-staging:'+callId,intakeHash:intakeHash(clean),iat:t,exp:t+TTL};
        return response(201,{operationToken:sign(claims),expiresAt:new Date(claims.exp*1000).toISOString(),testOnly:true});
      }
      if(!exact(body,action==='submit'?['operationToken','confirmed','intake']:['operationToken']))fail(400,'INVALID_REQUEST');
      const claims=verify(body.operationToken,userId);
      if(action==='submit'&&body.confirmed!==true)fail(400,'CONFIRMATION_REQUIRED');
      const cleanIntake=action==='submit'?validateIntake(body.intake):null;
      if(action==='submit'&&intakeHash(cleanIntake)!==claims.intakeHash)fail(409,'CONFIRMED_INTAKE_CHANGED');
      const rpc=async(name,args)=>{
        if(!RPCS.has(name))fail(503,'RPC_NOT_ALLOWED');
        // No retry. A timeout or lost response can follow a committed database write.
        if(name!=='stellar_orch_lookup_staging')writeMayHaveStarted=true;
        return json('/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(args)},signal);
      };
      const service=createSupportIntegration({rpc,staging:true});
      const context={authenticated:true,operationAuthorized:true,tenantId:TENANT,operationId:claims.operationId,sessionId:claims.sessionId,callId:claims.callId};
      let result;
      if(action==='submit'){
        // Coalesce overlap in this instance; database CAS/idempotency remain authoritative across instances.
        const existing=inFlight.get(claims.operationId);
        if(existing){writeMayHaveStarted=true;result=await bounded(existing,signal);}else{
          const pending=service.submit({context,request:{workflowType:'support_ticket_creation',confirmed:true,intake:cleanIntake}});
          inFlight.set(claims.operationId,pending);
          try{result=await bounded(pending,signal);}finally{if(inFlight.get(claims.operationId)===pending)inFlight.delete(claims.operationId);}
        }
      }else{result=await bounded(service.recover(context),signal);}
      const safe=toolResult(result,claims);
      return response(safe.success?200:safe.state==='FAILED'?409:202,safe);
    }catch(e){
      if(writeMayHaveStarted)return response(202,unknown());
      const inputCodes=new Set(['INVALID_SUPPORT_ARGUMENTS','CONFIRMED_SUPPORT_REQUEST_REQUIRED']);
      const status=inputCodes.has(e.safeCode)?400:e.status||503;
      return response(status,{error:e.safeCode||'STAGING_UPSTREAM_UNAVAILABLE'});
    }finally{clearTimeout(timer);}
  }};
}
module.exports={createStagingGateway,TENANT,URL,ORIGIN,PREVIEW_ORIGIN,PREFIX};
