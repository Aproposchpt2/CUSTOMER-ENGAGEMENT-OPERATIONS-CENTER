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
  instructions:'For each result read the reply and state literally. INFORMATION is not a saved request. REQUESTED is pending staff confirmation, never booked. CONFIRMED capture is not resident authentication. No notification is delivered. Resident, vendor and owner work requires an authenticated portal. Cancel/reschedule requires staff. Prospect capture requires explicit consent and spelling/contact readback confirmation. Never promise a callback time.\nWhen callers ask about unit availability, vacant apartments, or specific bedroom counts, ALWAYS invoke pma_check_availability before answering. Never infer inventory from general leasing knowledge. Describe returned dates as recorded earliest dates in fictional staging data, not confirmed bookings, actual listings or guaranteed move-in. If lookup fails, say availability could not be verified and offer staff review. Do not call pma_property_workflow merely to read inventory.\nYou are in an isolated fictional property-management demonstration. Start by saying: "You have reached Desert Ridge Apartments. How can I help you?"\n'+profile.instructions+'\n'+knowledgeModel.runtimeInstructions+'\nIntent catalog v'+intents.config.version+': '+intents.config.intents.map(x=>x.intent).join(', ')+'. Give immediate safety guidance before collecting data or waiting for tools; safety and clarification turns may use confirmed=false. The server checks all model outputs, confidence thresholds, role, entity scope and permissions. Never act as an authenticated owner through a voice identity claim.',
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
   let proposal,decision;try{proposal=args.modelOutput??(args.intent&&typeof args.confidence==='number'?{intent:args.intent,confidence:args.confidence,entities:args.entities??{}}:undefined);const detail=typeof args.maintenance?.description==='string'?args.maintenance.description.slice(0,4000):null;const detailSafety=detail?.trim()?intents.classify(detail):null;decision=detailSafety?.safety_override?detailSafety:intents.classify(args.message,proposal);if(decision.confidence_source==='deterministic_safety')proposal=undefined;else if(proposal)proposal=intents.validateModel(proposal);}catch{return {success:false,state:'INVALID_CLASSIFICATION',persisted:false};}
   if(!args.recoverOperation&&args.confirmed!==true&&!decision.safety_override&&decision.confidence>=intents.config.thresholds.high&&!['greeting','help'].includes(decision.action))return {success:false,state:'NEEDS_CONFIRMATION',persisted:false};
   if(!/^[0-9a-f-]{36}$/i.test(context.sessionId||''))return {success:false,state:'AUTHORIZATION_REQUIRED',persisted:false};
   const body={message:args.message,confirmed:args.confirmed===true,call_sid:context.callSid,session_id:context.sessionId,agentRoute:'property-management-assistant',...(proposal?{modelOutput:proposal}:{}),...Object.fromEntries(['prospect','showingAt','maintenance','cancelOrReschedule','listTourSlots','recoverOperation'].filter(k=>args[k]!==undefined).map(k=>[k,args[k]]))};
   const payload=JSON.stringify(body),ts=String(Math.floor(Date.now()/1000));
   const sig=crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${payload}`).digest('hex');
   try{
    const response=await fetchImpl(BASE+'/api/intake/pma-staging',{method:'POST',headers:{'Content-Type':'application/json','x-bridge-signature':ts+'.'+sig},body:payload,signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok||!data.result||!['INFORMATION','CLARIFICATION_REQUIRED','AUTHORIZATION_REQUIRED','REQUESTED','CONFIRMED','CONFLICT','UNKNOWN','FAILED'].includes(data.result.state))return {success:false,state:'UNKNOWN',persisted:false};
    const result=data.result;
    const ref=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if(result.domainPersisted===true&&(typeof result.operationId!=='string'||!/^pma:v1:[0-9a-f-]{36}$/i.test(result.operationId)||![result.contactId,result.requestId,result.showingId].some(ref)))return {success:false,state:'UNKNOWN',persisted:false};
    if(result.state==='CONFIRMED'&&(result.domainPersisted!==true||!result.operationId||(!result.contactId&&!result.requestId)))return {success:false,state:'UNKNOWN',persisted:false};
    if(result.state==='REQUESTED'&&(result.domainPersisted!==true||!result.showingId||result.bookingConfirmed!==false))return {success:false,state:'UNKNOWN',persisted:false};
    return {...result,notificationSent:false};
   }catch{return {success:false,state:'UNKNOWN',persisted:false,recovery:'Repeat the original confirmed operation; never invent a reference.'};}
  }
 };
}
module.exports={createPmaAdapter,enabled};
