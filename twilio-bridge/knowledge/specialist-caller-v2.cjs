'use strict';
const URL='https://hvzauakkhlivzeqatfqm.supabase.co';
const TENANTS={sales:'5885a020-d363-4c27-910a-c035eda132f5',support_platform:'5885a020-d363-4c27-910a-c035eda132f5',support_hvac:'d7e80001-0000-4000-b000-000000000001'};
async function readStagingKnowledgeV2({tenantId,scope,query,key,request=fetch,now=new Date()}){
 if(!Object.hasOwn(TENANTS,scope)||TENANTS[scope]!==tenantId||!key)throw Error('STAGING_KNOWLEDGE_BINDING');
 if(typeof query!=='string'||query.trim().length<3||query.length>240) return {status:'INVALID_QUERY',entries:[]};
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('STAGING_KNOWLEDGE_CLOCK');
 const r=await request(URL+'/rest/v1/rpc/ai4cc_specialist_staging_knowledge_v2',{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key},body:JSON.stringify({p_tenant_id:tenantId,p_scope:scope,p_query:query.trim(),p_limit:5}),signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('STAGING_KNOWLEDGE_UNAVAILABLE');const rows=await r.json();
 if(!Array.isArray(rows)||rows.length>5)throw Error('STAGING_KNOWLEDGE_RESPONSE');
 const eligible=rows.filter(x=>x.tenant_id===tenantId&&x.product_scope===scope&&x.test_only===true&&x.package_version==='scoped-v2'&&typeof x.id==='string'&&/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(x.id)&&typeof x.content==='string'&&x.content.trim()&&['VERIFIED_SOURCE_DERIVATION','VERIFIED_SYNTHETIC_SOURCE'].includes(x.source_status)&&Number.isFinite(Date.parse(x.effective_at))&&Date.parse(x.effective_at)<=now.getTime()&&Number.isFinite(Date.parse(x.expires_at))&&Date.parse(x.expires_at)>now.getTime());
 return {status:eligible.length?'FOUND':'NO_APPROVED_MATCH',tenantId,scope,packageVersion:'scoped-v2',testOnly:true,entries:eligible.map(({id,stable_id,title,content,source_status,execution_mode})=>({id,stable_id,title,content:content.slice(0,3500),source_status,execution_mode}))};
}
module.exports={readStagingKnowledgeV2};
