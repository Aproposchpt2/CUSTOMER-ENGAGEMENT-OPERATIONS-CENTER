'use strict';
const TENANTS=Object.freeze({sales:'5885a020-d363-4c27-910a-c035eda132f5',support_platform:'5885a020-d363-4c27-910a-c035eda132f5',support_hvac:'d7e80001-0000-4000-b000-000000000001'});
const STAGING='https://hvzauakkhlivzeqatfqm.supabase.co';
// Internal review only. Never wire this function to caller-facing knowledge tools.
async function readReviewSource({url,key,tenantId,scope,type,recordId,fetchImpl=fetch}) {
 if(url!==STAGING||!key||!Object.hasOwn(TENANTS,scope)||TENANTS[scope]!==tenantId)throw Error('SOURCE_SCOPE_BINDING_INVALID');
 if(!['knowledge','intent','test_bundle','guide','hvac_reference'].includes(type)||typeof recordId!=='string'||!recordId||recordId.length>100)throw Error('SOURCE_ARGUMENT_INVALID');
 const r=await fetchImpl(url+'/rest/v1/rpc/ai4cc_specialist_review_source_v1',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_tenant_id:tenantId,p_scope:scope,p_type:type,p_record_id:recordId}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('SOURCE_READ_FAILED');
 const rows=await r.json();
 if(!Array.isArray(rows)||rows.some(x=>x.review_state!=='draft'||x.caller_enabled!==false||x.record_id!==recordId))throw Error('SOURCE_RESPONSE_INVALID');
 return Object.freeze({purpose:'INTERNAL_REVIEW_ONLY',callerUsable:false,records:rows});
}
module.exports={readReviewSource,TENANTS};
