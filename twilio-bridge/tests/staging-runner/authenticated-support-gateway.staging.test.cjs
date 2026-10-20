'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createStagingGateway,TENANT,URL,ORIGIN,PREFIX}=require('./authenticated-support-gateway.staging.cjs');
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',OTHER='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const WF='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',CASE='cccccccc-cccc-4ccc-8ccc-cccccccccccc',CONTACT='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const AUTH='Bearer '+'a'.repeat(30),SECOND_AUTH='Bearer '+'b'.repeat(30);
// Fictional placeholders only; no live credentials or database access in this suite.
const env=()=>({STELLAR_BRIDGE_STAGING:'true',STAGING_ORCHESTRATION_GATEWAY_ENABLED:'true',STAGING_SUPPORT_WRITES_ENABLED:'true',SUPABASE_URL:URL,CSS_TENANT_ID:TENANT,SUPABASE_SERVICE_ROLE_KEY:'fictional-private-key-for-contract-tests-only',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fictional-publishable-key'});
const intake={name:'Fictional User',email:'test@example.invalid',phone:'',product:'Test router',purchaseDate:'2026-10-01',issue:'Fictional technical problem',steps:'Synthetic',impact:'None',priority:'NORMAL'};
function backend(){
  const s={calls:[],writes:0,rows:new Map(),role:'OWNER',active:true,anonymous:false,authenticated:true,timeout:false,loseCompletion:false,rejectCase:false};
  s.fetch=async(url,init)=>{
    assert.ok(url.startsWith(URL+'/'));assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
    s.calls.push({url,method:init.method,headers:init.headers,body:init.body});
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
    if(s.timeout)return new Promise(()=>{});
    const who=init.headers.authorization===SECOND_AUTH?OTHER:USER;
    if(url===URL+'/auth/v1/user')return s.authenticated?json({id:who,is_anonymous:s.anonymous,user_metadata:{role:'OWNER'}}):json({message:'DO_NOT_LEAK'},401);
    if(url.startsWith(URL+'/rest/v1/tenant_users?')){
      assert.equal(init.headers.apikey,'fictional-publishable-key');assert.ok([AUTH,SECOND_AUTH].includes(init.headers.authorization));
      const q=new globalThis.URL(url).searchParams;assert.equal(q.get('user_id'),'eq.'+who);assert.equal(q.get('tenant_id'),'eq.'+TENANT);
      return json([{user_id:who,tenant_id:s.foreign?OTHER:TENANT,role:s.role,status:s.active?'ACTIVE':'SUSPENDED'}]);
    }
    assert.equal(init.headers.apikey,'fictional-private-key-for-contract-tests-only');
    const args=JSON.parse(init.body),name=url.split('/').at(-1);
    if(name==='stellar_orch_lookup_staging'){const row=s.rows.get(args.p_operation_id);return json(row?{found:true,...row,...s.lookupOverride}:{found:false});}
    if(name==='stellar_orch_accept_staging'){
      const old=s.rows.get(args.p_tool_call_id);if(old)return json([{workflow_id:old.workflowId,deduplicated:true}]);
      const row={workflowId:WF,tenantId:TENANT,operationId:args.p_tool_call_id,sessionId:args.p_session_id,state:'ACCEPTED',verifiedCompleted:false};s.rows.set(row.operationId,row);return json([{workflow_id:WF,deduplicated:false}]);
    }
    const row=[...s.rows.values()].find(x=>x.workflowId===args.p_workflow_id);
    if(name==='stellar_orch_transition_staging'){if(row.state!==args.p_from)return json(false);row.state=args.p_to;return json(true);}
    if(name==='stellar_create_phone_support_test_intake'){
      s.writes++;if(s.rejectCase)return json({message:'PRIVATE_BACKEND_DIAGNOSTIC'},503);
      const original=[...s.rows.values()].find(x=>x.sessionId===args.p_session_id);original.persisted=true;
      if(s.holdCase)await s.holdCase;
      return json([{case_id:CASE,customer_id:CONTACT,created_new:true}]);
    }
    if(name==='stellar_orch_reconcile_case_staging'){
      Object.assign(row,row.persisted?{state:'COMPLETED',verifiedCompleted:true,testOnly:true,caseId:CASE,customerId:CONTACT}:{state:'UNKNOWN'});
      if(s.loseCompletion){s.loseCompletion=false;throw Error('PRIVATE_RAW_ERROR');}return json([{workflow_state:row.state}]);
    }
    throw Error('UNEXPECTED_RPC');
  };return s;
}
function setup(options={}){const settings=env(),b=backend();let time=Date.parse('2026-10-20T02:00:00Z');const g=createStagingGateway({env:settings,request:b.fetch,now:()=>time,...options});
 const req=(action,body,headers={},method='POST')=>new Request(ORIGIN+PREFIX+action,{method,headers:{origin:ORIGIN,authorization:AUTH,'content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 const call=async(action,body,headers,method)=>{const r=await g.handle(req(action,body,headers,method));return {status:r.status,headers:r.headers,body:await r.json()};};
 const begin=async()=>{const r=await call('begin',{confirmed:true,intake});assert.equal(r.status,201);return r.body.operationToken;};
 return {g,b,settings,req,call,begin,advance:ms=>{time+=ms;}};
}
test('feature flags and exact staging target fail closed',async()=>{
 for(const flag of ['STELLAR_BRIDGE_STAGING','STAGING_ORCHESTRATION_GATEWAY_ENABLED','STAGING_SUPPORT_WRITES_ENABLED']){const h=setup();h.settings[flag]='false';assert.equal((await h.call('begin',{})).body.error,'GATEWAY_DISABLED');assert.equal(h.b.calls.length,0);}
 assert.throws(()=>createStagingGateway({env:{...env(),SUPABASE_URL:'https://production.example'}}),/STAGING_TARGET_REJECTED/);
 assert.throws(()=>createStagingGateway({env:{...env(),SUPABASE_SERVICE_ROLE_KEY:''}}),/CREDENTIALS_NOT_CONFIGURED/);
 assert.throws(()=>createStagingGateway({env:{...env(),NODE_TLS_REJECT_UNAUTHORIZED:'0'}}),/TLS_VERIFICATION_REQUIRED/);
});
test('strict route, origin and method are rejected before upstream calls',async()=>{
 const h=setup();assert.equal((await h.call('begin',{}, {origin:'https://evil.example'})).status,403);
 assert.equal((await h.call('begin',{}, {},'GET')).status,405);assert.equal((await h.call('begin?x=1',{})).status,404);
 assert.equal((await h.call('other',{})).status,404);assert.equal(h.b.calls.length,0);
});
test('begin verifies remote user and active admin membership but performs no RPC',async()=>{
 const h=setup(),token=await h.begin();assert.match(token,/^[\w-]+\.[\w-]+$/);assert.equal(h.b.calls.length,2);assert.equal(h.b.writes,0);
 assert.ok(h.b.calls[0].url.endsWith('/auth/v1/user'));assert.ok(h.b.calls[1].url.includes('/tenant_users?'));
});
test('missing, invalid and anonymous sessions cannot get a capability',async()=>{
 const h=setup();assert.equal((await h.call('begin',{}, {authorization:''})).status,401);assert.equal(h.b.calls.length,0);
 h.b.authenticated=false;const invalid=await h.call('begin',{});assert.equal(invalid.status,401);assert.equal(JSON.stringify(invalid.body).includes('DO_NOT_LEAK'),false);
 h.b.authenticated=true;h.b.anonymous=true;assert.equal((await h.call('begin',{})).status,401);assert.equal(h.b.writes,0);
});
test('untrusted user metadata does not grant role, tenant or active membership',async()=>{
 for(const patch of [{role:'AGENT'},{foreign:true},{active:false}]){const h=setup();Object.assign(h.b,patch);assert.equal((await h.call('begin',{})).status,403);assert.equal(h.b.writes,0);}
});
test('membership is checked afresh on each submit',async()=>{
 const h=setup(),token=await h.begin();h.b.active=false;assert.equal((await h.call('submit',{operationToken:token,confirmed:true,intake})).status,403);assert.equal(h.b.writes,0);
});
test('capability cannot be used by a different authenticated user',async()=>{
 const h=setup(),token=await h.begin();assert.equal((await h.call('status',{operationToken:token},{authorization:SECOND_AUTH})).status,403);assert.equal(h.b.writes,0);
});
test('tampered and expired capabilities fail without database RPC',async()=>{
 const h=setup(),token=await h.begin(),[p,s]=token.split('.');
 assert.equal((await h.call('status',{operationToken:p+'.'+(s[0]==='a'?'b':'a')+s.slice(1)})).status,403);
 h.advance(900001);assert.equal((await h.call('status',{operationToken:token})).status,403);assert.equal(h.b.calls.filter(x=>x.url.includes('/rpc/')).length,0);
});
test('body cannot supply tenant, session, operation, case or authorization flags',async()=>{
 const h=setup(),token=await h.begin();for(const field of ['tenantId','sessionId','operationId','caseId','authenticated','operationAuthorized'])assert.equal((await h.call('submit',{operationToken:token,confirmed:true,intake,[field]:'forged'})).status,400);assert.equal(h.b.writes,0);
});
test('explicit confirmation and valid intake are required before ticket RPC',async()=>{
 const h=setup(),token=await h.begin();assert.equal((await h.call('submit',{operationToken:token,confirmed:false,intake})).status,400);
 assert.equal((await h.call('submit',{operationToken:token,confirmed:true,intake:{...intake,priority:'FAKE'}})).status,400);assert.equal(h.b.writes,0);
});
test('capability binds confirmed intake; changed valid data is rejected without a write',async()=>{
 const h=setup(),token=await h.begin();const r=await h.call('submit',{operationToken:token,confirmed:true,intake:{...intake,issue:'A completely different fictional issue'}});assert.equal(r.status,409);assert.equal(r.body.error,'CONFIRMED_INTAKE_CHANGED');assert.equal(h.b.writes,0);
});
test('bounded body reader rejects oversized, malformed and non-JSON requests',async()=>{
 const h=setup();assert.equal((await h.call('begin','x'.repeat(16385))).status,413);assert.equal((await h.call('begin','{')).status,400);
 assert.equal((await h.call('begin',{}, {'content-type':'text/plain'})).status,415);assert.equal(h.b.calls.length,0);
});
test('verified success is whitelisted, private and does not assert delivery',async()=>{
 const h=setup(),token=await h.begin(),r=await h.call('submit',{operationToken:token,confirmed:true,intake});
 assert.equal(r.status,200);assert.deepEqual(r.body,{success:true,state:'COMPLETED',caseId:CASE,customerId:CONTACT,testOnly:true,notificationSent:false,technicianFollowupConfirmed:false});
 assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('access-control-allow-origin'),null);assert.equal(h.b.writes,1);
 assert.ok(!JSON.stringify(r.body).includes(h.settings.SUPABASE_SERVICE_ROLE_KEY));
});
test('duplicate submit and status recover the original operation without new write',async()=>{
 const h=setup(),token=await h.begin();await h.call('submit',{operationToken:token,confirmed:true,intake});
 const duplicate=await h.call('submit',{operationToken:token,confirmed:true,intake}),status=await h.call('status',{operationToken:token});
 assert.equal(duplicate.body.caseId,CASE);assert.equal(status.body.caseId,CASE);assert.equal(h.b.writes,1);
});
test('two overlapping same-instance submits coalesce and preserve one write',async()=>{
 const h=setup(),token=await h.begin();let release;h.b.holdCase=new Promise(r=>{release=r;});
 const a=h.call('submit',{operationToken:token,confirmed:true,intake});
 while(!h.b.writes)await new Promise(r=>setImmediate(r));
 const b=h.call('submit',{operationToken:token,confirmed:true,intake});release();
 const results=await Promise.all([a,b]);assert.ok(results.every(x=>x.body.caseId===CASE));assert.equal(h.b.writes,1);
});
test('invalid duplicate intake cannot bypass validation through in-flight coalescing',async()=>{
 const h=setup(),token=await h.begin();let release;h.b.holdCase=new Promise(r=>{release=r;});
 const first=h.call('submit',{operationToken:token,confirmed:true,intake});while(!h.b.writes)await new Promise(r=>setImmediate(r));
 const invalid=await h.call('submit',{operationToken:token,confirmed:true,intake:{...intake,priority:'INVALID'}});assert.equal(invalid.status,400);release();assert.equal((await first).status,200);assert.equal(h.b.writes,1);
});
test('separate gateway instances reuse signed capability after restart',async()=>{
 const h=setup(),token=await h.begin();await h.call('submit',{operationToken:token,confirmed:true,intake});
 const fresh=createStagingGateway({env:h.settings,request:h.b.fetch,now:()=>Date.parse('2026-10-20T02:01:00Z')});
 const r=await fresh.handle(h.req('status',{operationToken:token}));assert.equal((await r.json()).caseId,CASE);assert.equal(h.b.writes,1);
});
test('credential rotation rejects old capability without using another key',async()=>{
 const h=setup(),token=await h.begin();const fresh=createStagingGateway({env:{...h.settings,SUPABASE_SERVICE_ROLE_KEY:'rotated-fictional-key-never-a-live-credential'},request:h.b.fetch,now:()=>Date.parse('2026-10-20T02:01:00Z')});
 assert.equal((await fresh.handle(h.req('status',{operationToken:token}))).status,403);assert.equal(h.b.writes,0);
});
test('lost completion response resolves through canonical lookup',async()=>{
 const h=setup(),token=await h.begin();h.b.loseCompletion=true;
 const r=await h.call('submit',{operationToken:token,confirmed:true,intake});assert.equal(r.body.caseId,CASE);assert.equal(h.b.writes,1);
});
test('uncertain case failure stays UNKNOWN and never retries ticket submission',async()=>{
 const h=setup(),token=await h.begin();h.b.rejectCase=true;
 const body={operationToken:token,confirmed:true,intake};const first=await h.call('submit',body),second=await h.call('submit',body);
 for(const r of [first,second]){assert.equal(r.status,202);assert.equal(r.body.success,false);assert.equal(r.body.state,'UNKNOWN');assert.equal(r.body.caseId,undefined);assert.equal(r.headers.get('retry-after'),'2');}
 assert.equal(h.b.writes,1);
});
test('ACCEPTED workflow from interrupted start does not trigger automatic write',async()=>{
 const h=setup(),token=await h.begin(),claims=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString());
 h.b.rows.set(claims.operationId,{workflowId:WF,tenantId:TENANT,operationId:claims.operationId,sessionId:claims.sessionId,state:'ACCEPTED'});
 const r=await h.call('submit',{operationToken:token,confirmed:true,intake});assert.equal(r.status,202);assert.equal(r.body.state,'ACCEPTED');assert.equal(h.b.writes,0);
});
test('foreign canonical session cannot become a verified gateway ticket',async()=>{
 const h=setup(),token=await h.begin();await h.call('submit',{operationToken:token,confirmed:true,intake});h.b.lookupOverride={sessionId:'phone-staging:CA'+'0'.repeat(32)};
 const r=await h.call('status',{operationToken:token});assert.notEqual(r.status,200);assert.equal(r.body.caseId,undefined);assert.equal(h.b.writes,1);
});
test('upstream deadlines are bounded and do not expose raw error details',async()=>{
 const h=setup({deadlineMs:30});h.b.timeout=true;const start=Date.now(),r=await h.call('begin',{});assert.equal(r.status,503);assert.ok(Date.now()-start<1000);assert.equal(h.b.writes,0);
});
test('timeout after write begins returns UNKNOWN; fresh status recovers original case',async()=>{
 const h=setup({deadlineMs:30}),token=await h.begin();h.b.holdCase=new Promise(()=>{});
 const r=await h.call('submit',{operationToken:token,confirmed:true,intake});assert.equal(r.status,202);assert.equal(r.body.state,'UNKNOWN');assert.equal(r.body.caseId,undefined);
 h.b.holdCase=null;const recovered=await h.call('status',{operationToken:token});assert.equal(recovered.body.caseId,CASE);assert.equal(h.b.writes,1);
});
test('request abort before authentication performs no upstream operation',async()=>{
 const h=setup(),controller=new AbortController();controller.abort();const original=h.req('begin',{});
 const req=new Request(original,{signal:controller.signal});const r=await h.g.handle(req);assert.equal(r.status,503);assert.equal(h.b.calls.length,0);
});
