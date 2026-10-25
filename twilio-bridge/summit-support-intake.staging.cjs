'use strict';
// Summit Comfort staging-only adapter. No customer routing, production, or notification writes.
const {readiness: legacyReadiness,submitStagingSupport: legacySubmit}=require('./staging-support-intake.cjs');
const STAGING_URL='https://hvzauakkhlivzeqatfqm.supabase.co';
const SUMMIT_TENANT='d7e80001-0000-4000-b000-000000000001';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SID=/^CA[0-9a-f]{32}$/i;
const REQUIRED=['name','email','phone','product','purchaseDate','issue','steps','impact','priority'];
const MAX=Object.freeze({name:150,email:254,phone:40,product:160,purchaseDate:10,issue:2000,steps:2000,impact:2000,priority:10});
function isSummitMode(env=process.env){
  return env.STELLAR_SUMMIT_HVAC_SUPPORT_MODE==='true';
}
function readiness(env=process.env){
  if(!isSummitMode(env))return legacyReadiness(env);
  if(env.STELLAR_BRIDGE_STAGING!=='true')return 'NOT_STAGING';
  if(env.STAGING_SUPPORT_WRITES_ENABLED!=='true')return 'STAGING_WRITES_DISABLED';
  if(env.CSS_TENANT_ID!==SUMMIT_TENANT||env.STAGING_SUPABASE_URL!==STAGING_URL)return 'STAGING_TARGET_REJECTED';
  if(!env.STAGING_SUPABASE_SERVICE_ROLE_KEY)return 'STAGING_DATABASE_CREDENTIAL_MISSING';
  return 'READY';
}
async function submit(args,callSid,env=process.env,request=fetch){
  if(!isSummitMode(env))return legacySubmit(args,callSid,env,request);
  const ready=readiness(env);
  if(ready!=='READY')throw new Error(ready);
  if(typeof callSid!=='string'||!SID.test(callSid))throw new Error('INVALID_STAGING_CALL_ID');
  if(!args||typeof args!=='object'||Array.isArray(args)||
     Object.keys(args).some(key=>!Object.hasOwn(MAX,key)) ||
     REQUIRED.some(key=>typeof args[key]!=='string'||args[key].length>MAX[key]))
    throw new Error('INVALID_SUPPORT_ARGUMENTS');
  const clean=Object.fromEntries(REQUIRED.map(key=>[key,args[key].trim()]));
  if(clean.name.length<2||clean.product.length<2||clean.issue.length<10||
     (!clean.email&&!clean.phone)||!['LOW','NORMAL','HIGH','URGENT'].includes(clean.priority)||
     !/^\d{4}-\d{2}-\d{2}$/.test(clean.purchaseDate)||
     Number.isNaN(Date.parse(clean.purchaseDate))||
     new Date(clean.purchaseDate).toISOString().slice(0,10)!==clean.purchaseDate)
    throw new Error('INVALID_SUPPORT_ARGUMENTS');
  const payload={p_tenant_id:SUMMIT_TENANT,p_session_id:'phone-staging:'+callSid,
    p_name:clean.name,p_email:clean.email,p_phone:clean.phone,p_product:clean.product,
    p_purchase_date:clean.purchaseDate,p_issue:clean.issue,p_steps:clean.steps,p_impact:clean.impact,
    p_priority:clean.priority};
  let response,rows;
  try{
    response=await request(STAGING_URL+'/rest/v1/rpc/stellar_create_hvac_demo_support_intake',{
      method:'POST',headers:{'content-type':'application/json',apikey:env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
        authorization:'Bearer '+env.STAGING_SUPABASE_SERVICE_ROLE_KEY},
      body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)throw Error('RPC_UNCONFIRMED');
    rows=await response.json();
  }catch{throw new Error('STAGING_SAVE_NOT_CONFIRMED');}
  const row=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(!row||!UUID.test(row.customer_id)||!UUID.test(row.case_id)||typeof row.created_new!=='boolean')
    throw new Error('STAGING_SAVE_NOT_CONFIRMED');
  return {success:true,customerId:row.customer_id,caseId:row.case_id,createdNew:row.created_new,
    testOnly:true,notificationSent:false,technicianFollowupConfirmed:false};
}
module.exports={readiness,submitStagingSupport:submit,SUMMIT_TENANT,isSummitMode};
