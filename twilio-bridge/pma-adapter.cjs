'use strict';
const crypto=require('crypto');
const profile=require('./pma-profile.json');
const knowledgeModel=require('./pma-knowledge-v1.json');
const intents=require('./pma-intents.cjs');
const BASE='https://pma-validation--ai4cc-staging.netlify.app';
function enabled(env){return env.STELLAR_BRIDGE_STAGING==='true'&&env.PMA_CHANNELS_ENABLED==='true'&&env.PMA_STAGING_BASE_URL===BASE&&!!env.BRIDGE_HMAC_SECRET;}
function createPmaAdapter(env,fetchImpl=fetch){
 return {
  enabled:enabled(env),
  instructions:'When callers ask about unit availability, vacant apartments, or specific bedroom counts, ALWAYS invoke pma_check_availability before answering. Never infer inventory from general leasing knowledge. Describe returned dates as recorded earliest dates in fictional staging data, not confirmed bookings, actual listings or guaranteed move-in. If lookup fails, say availability could not be verified and offer staff review. Do not call pma_property_workflow merely to read inventory.\nYou are in an isolated fictional property-management demonstration. Start by saying: "You have reached Desert Ridge Apartments. How can I help you?"\n'+profile.instructions+'\n'+knowledgeModel.runtimeInstructions+'\nIntent catalog v'+intents.config.version+': '+intents.config.intents.map(x=>x.intent).join(', ')+'. Give immediate safety guidance before collecting data or waiting for tools; safety and clarification turns may use confirmed=false. The server checks all model outputs, confidence thresholds, role, entity scope and permissions. Never act as an authenticated owner through a voice identity claim.',
  tools:[profile.tool,{type:'function',name:'pma_check_availability',description:'Read fictional staging inventory for the configured property, filtered by bedrooms. This does not reserve or guarantee an apartment.',parameters:{type:'object',properties:{bedrooms:{type:'integer',minimum:0,maximum:30}},additionalProperties:false}}],
  async checkAvailability(args,context){
   if(!enabled(env)||!/^CA[0-9a-f]{32}$/i.test(context?.callSid||'')||!context?.sessionId)return {success:false,state:'UNAVAILABLE'};
   if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>k!=='bedrooms')||(args.bedrooms!==undefined&&(!Number.isInteger(args.bedrooms)||args.bedrooms<0||args.bedrooms>30)))return {success:false,state:'INVALID_FILTER'};
   const body={action:'pma_availability',call_sid:context.callSid,session_id:context.sessionId,agentRoute:'property-management-assistant',args};
   const payload=JSON.stringify(body),ts=String(Math.floor(Date.now()/1000));
   const sig=crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${payload}`).digest('hex');
   try{const r=await fetchImpl(BASE+'/api/intake/voice-demo-staging',{method:'POST',headers:{'Content-Type':'application/json','x-bridge-signature':ts+'.'+sig},body:payload,signal:AbortSignal.timeout(10000)});if(!r.ok)return {success:false,state:'UNAVAILABLE'};const data=await r.json();return data.result?.availability??{success:false,state:'UNAVAILABLE'};}catch{return {success:false,state:'UNKNOWN'};}
  },
  async submit(args,context){
   if(!enabled(env))return {success:false,state:'DISABLED',persisted:false};
   if(!context?.callSid||!/^CA[0-9a-f]{32}$/i.test(context.callSid))return {success:false,state:'UNAUTHORIZED',persisted:false};
   if(!args||typeof args.message!=='string'||!args.message.trim()||args.message.length>4000)return {success:false,state:'NEEDS_CONFIRMATION',persisted:false};
   let proposal,decision;try{proposal=args.modelOutput??(args.intent&&typeof args.confidence==='number'?{intent:args.intent,confidence:args.confidence,entities:args.entities??{}}:undefined);decision=intents.classify(args.message,proposal);if(decision.confidence_source==='deterministic_safety')proposal=undefined;else if(proposal)proposal=intents.validateModel(proposal);}catch{return {success:false,state:'INVALID_CLASSIFICATION',persisted:false};}
   if(args.confirmed!==true&&!decision.safety_override&&decision.confidence>=intents.config.thresholds.high&&!['greeting','help'].includes(decision.action))return {success:false,state:'NEEDS_CONFIRMATION',persisted:false};
   // Stable business key survives tool re-emission and a bridge reconnect.
   const operationKey='voice:'+context.callSid+':'+crypto.createHash('sha256').update(JSON.stringify([args.message,args.requestId||null,args.showingAt||null,args.confirmed===true,proposal??null])).digest('hex');
   const body={message:args.message,confirmed:args.confirmed===true,operationKey,...(proposal?{modelOutput:proposal}:{}),...(args.requestId?{requestId:args.requestId}:{}),...(args.showingAt?{showingAt:args.showingAt}:{})};
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
