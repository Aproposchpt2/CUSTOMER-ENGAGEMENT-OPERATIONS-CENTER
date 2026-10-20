'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {createNodeGatewayHandler,SITE,previewReady}=require('./staging-gateway-node-adapter.cjs');
const {createStagingGateway,URL,TENANT,ORIGIN,PREVIEW_ORIGIN,PREFIX}=require('./authenticated-support-gateway.staging.cjs');
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env=()=>({STELLAR_BRIDGE_STAGING:'true',STAGING_ORCHESTRATION_GATEWAY_ENABLED:'true',STAGING_SUPPORT_WRITES_ENABLED:'true',STAGING_ORCHESTRATION_SITE_ID:SITE,STAGING_ORCHESTRATION_ORIGIN:PREVIEW_ORIGIN,SUPABASE_URL:URL,NEXT_PUBLIC_SUPABASE_URL:URL,CSS_TENANT_ID:TENANT,SUPABASE_SERVICE_ROLE_KEY:'fictional-contract-test-private-key-only',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fictional-public-key',CONTEXT:'deploy-preview',REVIEW_ID:'77'});
const intake={name:'Fictional Customer',email:'adapter@example.invalid',phone:'',product:'Test router',purchaseDate:'2026-10-01',issue:'Fictional isolated support issue',steps:'No real action',impact:'None',priority:'NORMAL'};
async function fixture(t,patch={}){
 const settings={...env(),...patch};let cookieCalls=0,remoteCalls=0;
 const upstream=async(url)=>{remoteCalls++;return new Response(JSON.stringify(url===URL+'/auth/v1/user'?{id:user,is_anonymous:false}:url.includes('/tenant_users?')?[{user_id:user,tenant_id:TENANT,status:'ACTIVE',role:'OWNER'}]:{found:false}),{status:200});};
 const handler=createNodeGatewayHandler({env:settings,request:upstream,getCookieAccessToken:async()=>{cookieCalls++;return 'f'.repeat(30);}});
 const server=http.createServer((req,res)=>void handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const call=(action='begin',body={confirmed:true,intake},headers={},method='POST')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:PREFIX+action,method,headers:{host:new globalThis.URL(PREVIEW_ORIGIN).host,origin:PREVIEW_ORIGIN,'content-type':'application/json',...headers}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(method==='POST'?(typeof body==='string'?body:JSON.stringify(body)):undefined);});
 return {settings,call,upstream,cookieCalls:()=>cookieCalls,remoteCalls:()=>remoteCalls};
}
test('only the explicit private PR77 preview configuration can mount',()=>{
 assert.equal(previewReady(env()),true);for(const p of [{STAGING_ORCHESTRATION_SITE_ID:'other'},{STAGING_ORCHESTRATION_ORIGIN:ORIGIN},{CONTEXT:'production'},{REVIEW_ID:'73'},{NEXT_PUBLIC_SUPABASE_URL:'https://production.example'}])assert.equal(previewReady({...env(),...p}),false);
});
test('real local Node HTTP request streams through cookie bearer adapter',async t=>{
 const h=await fixture(t),r=await h.call();assert.equal(r.status,201);const b=await r.json();assert.equal(typeof b.operationToken,'string');assert.equal(h.cookieCalls(),1);assert.equal(h.remoteCalls(),2);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('disabled preview route touches neither cookies nor upstreams',async t=>{
 const h=await fixture(t,{STAGING_ORCHESTRATION_GATEWAY_ENABLED:'false'});assert.equal((await h.call()).status,503);assert.equal(h.cookieCalls(),0);assert.equal(h.remoteCalls(),0);
});
test('wrong host and forwarded-host spoof cannot reach authentication',async t=>{
 const h=await fixture(t);assert.equal((await h.call('begin',{}, {host:'stellaruc.com','x-forwarded-host':new globalThis.URL(PREVIEW_ORIGIN).host})).status,403);assert.equal(h.cookieCalls(),0);
});
test('wrong origin, GET and query parameters are rejected',async t=>{
 const h=await fixture(t);assert.equal((await h.call('begin',{}, {origin:'https://evil.example'})).status,403);assert.equal((await h.call('begin',{}, {},'GET')).status,405);assert.equal((await h.call('begin?x=1')).status,404);assert.equal(h.remoteCalls(),0);
});
test('explicit bearer does not invoke cookie fallback',async t=>{
 const h=await fixture(t);assert.equal((await h.call('begin',{confirmed:true,intake},{authorization:'Bearer '+'z'.repeat(30)})).status,201);assert.equal(h.cookieCalls(),0);assert.equal(h.remoteCalls(),2);
});
test('invalid explicit bearer never falls back to a valid cookie session',async t=>{
 const h=await fixture(t);assert.equal((await h.call('begin',{}, {authorization:'invalid'})).status,401);assert.equal(h.cookieCalls(),0);assert.equal(h.remoteCalls(),0);
});
test('stream limits and malformed JSON are enforced through the Node adapter',async t=>{
 const h=await fixture(t);assert.equal((await h.call('begin','a'.repeat(17000))).status,413);assert.equal((await h.call('begin','{')).status,400);assert.equal(h.remoteCalls(),0);
});
test('preview capability is not accepted on the existing private base host',async t=>{
 const h=await fixture(t),r=await h.call(),token=(await r.json()).operationToken;
 const base=createStagingGateway({env:{...h.settings,STAGING_ORCHESTRATION_ORIGIN:ORIGIN},request:h.upstream});
 const other=await base.handle(new Request(ORIGIN+PREFIX+'status',{method:'POST',headers:{origin:ORIGIN,authorization:'Bearer '+'f'.repeat(30),'content-type':'application/json'},body:JSON.stringify({operationToken:token})}));assert.equal(other.status,403);
});
test('unapproved preview origins are refused at construction',()=>{
 assert.throws(()=>createStagingGateway({env:{...env(),STAGING_ORCHESTRATION_ORIGIN:'https://unapproved.netlify.app'}}),/STAGING_ORIGIN_REJECTED/);
});
