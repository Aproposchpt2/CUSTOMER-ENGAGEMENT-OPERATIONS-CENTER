'use strict';
const crypto=require('crypto');
const profile=require('./pma-profile.json');
const knowledgeModel=require('./pma-knowledge-v1.json');
const intents=require('./pma-intents.cjs');
const {failedAvailability,verifiedAvailability}=require('./pma-availability.cjs');
const BASE='https://pma-validation--ai4cc-staging.netlify.app';
function enabled(env){return env.STELLAR_BRIDGE_STAGING==='true'&&env.PMA_CHANNELS_ENABLED==='true'&&env.PMA_STAGING_BASE_URL===BASE&&!!env.BRIDGE_HMAC_SECRET;}
function createPmaAdapter(env,fetchImpl=fetch){
 return {
  enabled:enabled(env),
  instructions:'Follow the Desert Ridge Tenant Care script in the PMA profile. Introduce yourself as Carol and collect the caller-reported name, property address and unit number when applicable; when no unit applies, record “Not applicable.” Ask how you can help and preserve the reported problem verbatim. For routine reports, tell the caller you are creating an incident report, then call pma_property_workflow with MAINTENANCE_REQUEST and the exact maintenance fields. Read the generated incident number twice only after CONFIRMED and domainPersisted=true, pausing to let the caller get ready before reading it. Explain that the number is the case reference. The staging resident portal does not yet support tenant case-number lookup, so do not say it can currently be used to access or track the case. Ask for text, email or phone preference, confirm destination and explicit consent, then save contactPreference. Say the preference was recorded, but no update message was sent and future updates are not guaranteed by this staging flow.\nFor fire, smoke, suspected gas leak, carbon monoxide, electrical hazard or immediate danger, immediately interrupt with the approved calm 911/leave-area guidance, then continue gathering the report. Preserve the caller’s exact wording and do not use a cheerful tone. Submit the complete incident once through the dedicated emergency intent/path after collecting intake fields; the server persists the case then invokes the staging emergency dispatcher. Do not send a second emergency workflow call for the same report. Only say an alert was sent when the verified dispatch result confirms it; otherwise say notification could not be confirmed. Do not repeat a write after UNKNOWN; recover the original operation. Do not claim vendor assignment, notification, delivery, acceptance or repair unless the backend confirms that specific result.\nWhen callers ask about availability, use pma_check_availability and read the result accurately. Do not infer inventory, policies or capabilities.\nYou are in the staging property-management service.\n'+profile.instructions+'\n'+knowledgeModel.runtimeInstructions+'\nIntent catalog v'+intents.config.version+': '+intents.config.intents.map(x=>x.intent).join(', ')+'. The server enforces trusted call/session scope, configured property authority and operation idempotency. Never treat spoken identity as authenticated occupancy or use model output as permission.',
  tools:[profile.tool,{type:'function',name:'pma_check_availability',description:'Supply the caller\'s exact bedroom count. For any size or an unspecified bedroom count, omit bedrooms entirely; never use 0 as an unfiltered lookup. Zero means studio only. Read the returned reply literally. AVAILABLE means verified fictional records only. NO_VERIFIED_MATCH means lookup succeeded but no verified match, not proof none exist. UNAVAILABLE_UNITS means matching fresh records are occupied or unavailable. INVENTORY_STALE means out-of-date records cannot confirm availability. INVALID_INVENTORY means necessary data is missing or invalid. LOOKUP_FAILED means unknown after a failed lookup, never no availability. INVALID_FILTER requires clarification. Never substitute a one- or three-bedroom for two bedrooms. Do not announce availability without a successful tool result. This does not reserve or guarantee an apartment.',parameters:{type:'object',properties:{bedrooms:{type:'integer',minimum:0,maximum:30}},additionalProperties:false}}],
  async checkAvailability(args,context){
   if(!enabled(env)||!/^CA[0-9a-f]{32}$/i.test(context?.callSid||'')||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context?.sessionId||''))return failedAvailability('UNAVAILABLE');
   if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>k!=='bedrooms')||(args.bedrooms!==undefined&&(!Number.isInteger(args.bedrooms)||args.bedrooms<0||args.bedrooms>30)))return failedAvailability('INVALID_FILTER');
   const body={action:'pma_availability',call_sid:context.callSid,session_id:context.sessionId,agentRoute:'property-management-assistant',args};
   const payload=JSON.stringify(body),ts=String(Math.floor(Date.now()/1000));
   const sig=crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${payload}`).digest('hex');
   try{const r=await fetchImpl(BASE+'/api/intake/voice-demo-staging',{method:'POST',headers:{'Content-Type':'application/json','x-bridge-signature':ts+'.'+sig},body:payload,signal:AbortSignal.timeout(10000)});if(!r.ok)return failedAvailability();const data=await r.json();return verifiedAvailability(data.result?.availability,args.bedrooms);}catch{return failedAvailability();}
  },
  async submit(args,context){
   if(!enabled(env))return {success:false,state:'DISABLED',persisted:false};
   if(!context?.callSid||!/^CA[0-9a-f]{32}$/i.test(context.callSid))return {success:false,state:'UNAUTHORIZED',persisted:false};
   if(!args||typeof args.message!=='string'||!args.message.trim()||args.message.length>4000)return {success:false,state:'NEEDS_CONFIRMATION',persisted:false};
   let proposal,decision;try{proposal=args.modelOutput??(args.intent&&typeof args.confidence==='number'?{intent:args.intent,confidence:args.confidence,entities:args.entities??{}}:undefined);const detail=typeof args.maintenance?.description==='string'?args.maintenance.description.slice(0,4000):null;const detailSafety=detail?.trim()?intents.classify(detail):null;decision=detailSafety?.safety_override?detailSafety:intents.classify(args.message,proposal);if(decision.confidence_source==='deterministic_safety')proposal=undefined;else if(proposal)proposal=intents.validateModel(proposal);}catch{return {success:false,state:'INVALID_CLASSIFICATION',persisted:false};}
   if(!args.recoverOperation&&args.confirmed!==true&&!decision.safety_override&&decision.confidence>=intents.config.thresholds.high&&!['greeting','help'].includes(decision.action))return {success:false,state:'NEEDS_CONFIRMATION',persisted:false};
   if(!/^[0-9a-f-]{36}$/i.test(context.sessionId||''))return {success:false,state:'AUTHORIZATION_REQUIRED',persisted:false};
   const body={message:args.message,confirmed:args.confirmed===true,call_sid:context.callSid,session_id:context.sessionId,agentRoute:'property-management-assistant',...(proposal?{modelOutput:proposal}:{}),...(Array.isArray(context.observedCallerTurns)?{observedCallerTurns:context.observedCallerTurns}:{}),...Object.fromEntries(['prospect','showingAt','maintenance','contactPreference','cancelOrReschedule','listTourSlots','recoverOperation'].filter(k=>args[k]!==undefined).map(k=>[k,args[k]]))};
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
  },
  async saveTranscript(transcript,context){
   if(!enabled(env)||!/^CA[0-9a-f]{32}$/i.test(context?.callSid||'')||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context?.sessionId||''))return {success:false,state:'DISABLED'};
   if(!Array.isArray(transcript)||transcript.length<1||transcript.length>200||transcript.some(x=>!x||!['customer','agent'].includes(x.speaker)||typeof x.content!=='string'||!x.content.trim()||x.content.length>4000))return {success:false,state:'INVALID_TRANSCRIPT'};
   const body={call_sid:context.callSid,session_id:context.sessionId,agentRoute:'property-management-assistant',transcript};
   const payload=JSON.stringify(body),ts=String(Math.floor(Date.now()/1000));
   const sig=crypto.createHmac('sha256',env.BRIDGE_HMAC_SECRET).update(`pma-staging:${ts}:${payload}`).digest('hex');
   try{
    const response=await fetchImpl(BASE+'/api/intake/pma-transcript-staging',{method:'POST',headers:{'Content-Type':'application/json','x-bridge-signature':ts+'.'+sig},body:payload,signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok||data.result?.state!=='CONFIRMED'||data.result?.domainPersisted!==true)return {success:false,state:'UNKNOWN'};
    return {success:true,state:'CONFIRMED',transcriptTurns:data.result.transcriptTurns};
   }catch{return {success:false,state:'UNKNOWN'};}
  }
 };
}
module.exports={createPmaAdapter,enabled};
