'use strict';
const crypto=require('crypto');
const profile=require('./pma-profile.json');
const BASE='https://pma-validation--ai4cc-staging.netlify.app';
function enabled(env){return env.STELLAR_BRIDGE_STAGING==='true'&&env.PMA_CHANNELS_ENABLED==='true'&&env.PMA_STAGING_BASE_URL===BASE&&!!env.BRIDGE_HMAC_SECRET;}
function createPmaAdapter(env,fetchImpl=fetch){
 return {
  enabled:enabled(env),
  instructions:'You are in an isolated fictional property-management demonstration. Start by saying: "Hello, this is the AI4Businesses Property Management Assistant staging demonstration. How can I help with your property today?"\n'+profile.instructions,
  tools:[profile.tool],
  async submit(args,context){
   if(!enabled(env))return {success:false,state:'DISABLED',persisted:false};
   if(!context?.callSid||!/^CA[0-9a-f]{32}$/i.test(context.callSid))return {success:false,state:'UNAUTHORIZED',persisted:false};
   if(!args||args.confirmed!==true||typeof args.message!=='string'||!args.message.trim()||args.message.length>4000)return {success:false,state:'NEEDS_CONFIRMATION',persisted:false};
   // Stable business key survives tool re-emission and a bridge reconnect.
   const operationKey='voice:'+context.callSid+':'+crypto.createHash('sha256').update(JSON.stringify([args.message,args.requestId||null,args.showingAt||null])).digest('hex');
   const body={message:args.message,confirmed:true,operationKey,...(args.requestId?{requestId:args.requestId}:{}),...(args.showingAt?{showingAt:args.showingAt}:{})};
   const payload=JSON.stringify(body),ts=String(Math.floor(Date.now()/1000));
   const sig=crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${payload}`).digest('hex');
   try{
    const response=await fetchImpl(BASE+'/api/intake/pma-staging',{method:'POST',headers:{'Content-Type':'application/json','x-bridge-signature':ts+'.'+sig},body:payload,signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok||data.result?.persisted!==true||typeof data.result.interactionId!=='string')return {success:false,state:'UNCONFIRMED',persisted:false};
    return {success:true,...data.result,notificationSent:false};
   }catch{return {success:false,state:'UNKNOWN',persisted:false,recovery:'Repeat the original confirmed operation; never invent a reference.'};}
  }
 };
}
module.exports={createPmaAdapter,enabled};
