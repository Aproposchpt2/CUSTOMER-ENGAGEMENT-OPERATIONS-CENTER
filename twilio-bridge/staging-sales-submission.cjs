'use strict';
const {payloadForTrustedSession}=require('./sales-session-guard.cjs');
const STAGING_URL='https://hvzauakkhlivzeqatfqm.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function submitVerifiedSales({trustedSession,confirmedDetails,env=process.env,request=fetch}={}){
 if(env.STELLAR_BRIDGE_STAGING!=='true'||env.STELLAR_STAGING_SALES_WRITES_ENABLED!=='true') throw Error('SALES_STAGING_DISABLED');
 if(env.STAGING_SUPABASE_URL!==STAGING_URL||!env.STAGING_SUPABASE_SERVICE_ROLE_KEY)throw Error('SALES_STAGING_TARGET_REJECTED');
 const payload=payloadForTrustedSession(trustedSession,confirmedDetails);
 let response,result;
 try{
 response=await request(STAGING_URL+'/rest/v1/rpc/stellar_voice_demo_sales_submit_staging',{
 method:'POST',headers:{'content-type':'application/json',apikey:env.STAGING_SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.STAGING_SUPABASE_SERVICE_ROLE_KEY},
 body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('RPC_REJECTED');
 result=await response.json();
 }catch{throw Error('SALES_SAVE_NOT_CONFIRMED');}
 if(!result||!UUID.test(result.lead?.id||'')||result.testOnly!==true||result.persisted!==true||
    result.notificationSent!==false||typeof result.deduplicated!=='boolean')throw Error('SALES_SAVE_NOT_CONFIRMED');
 return {success:true,lead:{id:result.lead.id},testOnly:true,deduplicated:result.deduplicated,notificationSent:false};
}
module.exports={submitVerifiedSales};
