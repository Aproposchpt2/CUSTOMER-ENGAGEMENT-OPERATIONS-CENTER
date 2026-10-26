'use strict';
// One database authority for creation; model arguments never choose scope or IDs.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALL=/^CA[0-9a-f]{32}$/i;
const ROUTE='property-management-assistant';
const fail=(code,status=400)=>{throw Object.assign(Error(code),{status});};
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))fail('INVALID_FIELDS');}
function str(v,max,min=1){if(typeof v!=='string'||v.trim().length<min||v.length>max)fail('INVALID_TEXT');return v.trim();}
function receipt(r,incident=false){
 if(!r||r.state!=='CONFIRMED'||r.domainPersisted!==true||r.interactionPersisted!==true||!UUID.test(r.requestId||'')||!/^pma:v1:[0-9a-f-]{36}$/i.test(r.operationId||'')||(incident&&!/^PMA-[A-Z0-9]{6,32}$/.test(r.caseNumber||'')))
  return {success:false,state:r?.state==='CONFLICT'?'CONFLICT':'UNKNOWN',notificationSent:false,reply:'The operation was not confirmed. Do not announce success or invent an incident number.'};
 return {success:true,state:'CONFIRMED',requestId:r.requestId,...(incident?{caseNumber:r.caseNumber}:{}),operationId:r.operationId,notificationSent:false,notificationState:'NOT_SENT',vendorAssigned:false,replayed:r.replayed===true};
}
async function processIntake(body,{env,rpc,claim,load}){
 if(env.PMA_SIP_ENABLED!=='true'||env.PMA_ENVIRONMENT!=='staging'||env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co')fail('SIP_STAGING_DISABLED',503);
 exact(body,['action','call_sid','sip_call_id','caller_number','session_id','args','observedCallerTurns']);
 if(!CALL.test(body.call_sid||'')||!/^[-a-zA-Z0-9_]{1,200}$/.test(body.sip_call_id||''))fail('INVALID_CALL',403);
 const t=env.AI4CC_VOICE_DEMO_TENANT_ID,p=env.PMA_STAGING_PROPERTY_ID,c=env.PMA_STAGING_CONTACT_ID;
 if(![t,p,c].every(x=>UUID.test(x||'')))fail('SCOPE_UNAVAILABLE',503);
 const common={t,p,c,call_sid:body.call_sid};
 if(body.action==='start'){
  if(body.caller_number!==env.PMA_STAGING_TEST_CALLER||!/^\+[1-9][0-9]{7,14}$/.test(body.caller_number||''))fail('UNAPPROVED_CALLER',403);
  const initial=await rpc('stellar_voice_demo_session_staging',{...common,event:'init',caller_number:body.caller_number});
  if(!initial||!UUID.test(initial.session_id||'')||initial.end_time||initial.call_sid!==body.call_sid)fail('SESSION_UNAVAILABLE',403);
  const claimed=await claim(initial.session_id,body.sip_call_id);
  if(!claimed)return {duplicate:true}; // Durable one-time claim; ambiguous/crashed setup needs operator recovery.
  const selected=await rpc('stellar_voice_demo_session_staging',{...common,event:'choose',caller_number:body.caller_number,session_id:initial.session_id,agent_route:ROUTE});
  if(selected?.agentRoute!==ROUTE)fail('ROUTE_MISMATCH',403);
  const active=await rpc('stellar_voice_demo_session_staging',{...common,event:'start',session_id:initial.session_id,agent_route:ROUTE});
  return {session_id:active.session_id,call_sid:body.call_sid,sip_call_id:body.sip_call_id};
 }
 if(!UUID.test(body.session_id||''))fail('INVALID_SESSION',403);
 const bound=await load(body.session_id);
 if(!bound||bound.tenant_id!==t||bound.metadata?.property_id!==p||bound.metadata?.call_sid!==body.call_sid||bound.metadata?.pma_sip_call_id!==body.sip_call_id||bound.metadata?.selected_route!==ROUTE||bound.ended_at||!['open','active'].includes(bound.status)||!Number.isFinite(Date.parse(bound.started_at))||Date.parse(bound.started_at)>Date.now()||Date.parse(bound.started_at)<Date.now()-2*60*60*1000)fail('SESSION_SCOPE_MISMATCH',403);
 const scope={t,p,session_id:body.session_id,call_sid:body.call_sid};
 if(body.action==='create_incident'){
  exact(body.args,['reportedName','reportedAddress','reportedUnit','description']);
  const incident={reportedName:str(body.args.reportedName,150,2),reportedAddress:str(body.args.reportedAddress,300,5),reportedUnit:str(body.args.reportedUnit,80),description:str(body.args.description,4000)};
  if(!Array.isArray(body.observedCallerTurns)||body.observedCallerTurns.length>200||!body.observedCallerTurns.some(x=>typeof x==='string'&&x.trim()===incident.description))fail('VERBATIM_DESCRIPTION_NOT_OBSERVED',422);
  return receipt(await rpc('pma_voice_incident_create_v1',{...scope,incident}),true);
 }
 if(body.action==='record_contact_preference'){
  exact(body.args,['method','destination','consent']);
  const method=body.args.method,destination=str(body.args.destination,254);
  if(!['sms','email','phone'].includes(method)||body.args.consent!==true)fail('EXPLICIT_CONSENT_REQUIRED',422);
  if(method==='email'?!/^[^ @]+@[^ @]+\.[^ @]+$/.test(destination):!/^\+[1-9][0-9]{7,14}$/.test(destination))fail('INVALID_DESTINATION',422);
  // Resolve the case on the server; no model-supplied request ID is accepted.
  const caseRow=await load(body.session_id,true);
  if(!caseRow||!UUID.test(caseRow.id||'')||caseRow.tenant_id!==t||caseRow.property_id!==p||caseRow.intake_details?.voiceSessionId!==body.session_id)fail('INCIDENT_REQUIRED',409);
  return receipt(await rpc('pma_voice_incident_preference_v1',{...scope,request_id:caseRow.id,method,destination,consent:true}));
 }
 if(body.action==='close')return rpc('stellar_voice_demo_session_staging',{...common,event:'end',session_id:body.session_id,agent_route:ROUTE,details:{reason:'CAROL_SIP_CALL_ENDED'}});
 fail('UNSUPPORTED_ACTION');
}
module.exports={processIntake,receipt};
