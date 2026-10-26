import {intentDecision} from './intentCatalog';
import {PmaError,text,uuid} from './domain';
import {calendarDate} from './availability';
import {showingInstant} from './scheduling';
import {isEmergencyIntent,dispatchEmergency} from './emergencyDispatch';

export const voiceStates=['INFORMATION','CLARIFICATION_REQUIRED','AUTHORIZATION_REQUIRED','REQUESTED','CONFIRMED','CONFLICT','UNKNOWN','FAILED'] as const;
/** Model arguments carry facts/consent only. Identity and operation IDs never come from them. */
export function prepareVoiceTurn(body:Record<string,any>){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new PmaError('Invalid PMA turn');
 const message=text(body.message,'message',4000);
 const detailMessage=typeof body.maintenance?.description==='string'?body.maintenance.description.slice(0,4000):null;
 const detailSafety=detailMessage?intentDecision(detailMessage):null;
 const decision=detailSafety?.safety_override?detailSafety:intentDecision(message,body.modelOutput);
 const base={intent:decision.intent,confidence:decision.confidence,message,confirmed:body.confirmed===true};
 // Safety wins even when other model arguments are corrupt. Never send untrusted role fields to SQL.
 // Give the model/backend the safety override when no report payload is ready.
 // Once intake fields are present, persist the single tenant incident and then
 // dispatch through the dedicated emergency path below.
 const intake=body.maintenance;
 const completeIncident=intake&&typeof intake==='object'&&!Array.isArray(intake)
  &&typeof intake.reportedName==='string'&&typeof intake.reportedAddress==='string'
  &&typeof intake.reportedUnit==='string'&&typeof intake.description==='string';
 if(decision.safety_override&&!completeIncident)return {...base,message:detailSafety?.safety_override?detailMessage:message,action:'safety',safety:decision.intent};
 if(Object.keys(body).some(k=>!['message','modelOutput','confirmed','call_sid','session_id','agentRoute','prospect','showingAt','maintenance','contactPreference','observedCallerTurns','cancelOrReschedule','listTourSlots','recoverOperation'].includes(k)))throw new PmaError('Untrusted PMA fields');
 if(body.agentRoute!=='property-management-assistant')throw new PmaError('PMA route required',403);
 if(decision.intent==='MAINTENANCE_REQUEST'&&body.maintenance===undefined)return {...base,action:'maintenance'};
 if(body.maintenance&&typeof body.maintenance==='object'&&!Array.isArray(body.maintenance)&&Object.keys(body.maintenance).some(k=>!['reportedName','reportedAddress','reportedUnit','description'].includes(k)))throw new PmaError('Invalid incident report fields');
 if(body.maintenance!==undefined&&!completeIncident)return {...base,action:'clarify',clarification:'Please provide the caller-reported name, property address, unit when applicable, and exact incident description.'};
 if(decision.requires_clarification&&body.maintenance===undefined&&body.contactPreference===undefined)return {...base,action:'clarify'};
 if(body.recoverOperation!==undefined){if(!['prospect','showing'].includes(body.recoverOperation))throw new PmaError('Invalid recovery kind');return {...base,action:'recover',kind:body.recoverOperation};}
 if(body.contactPreference!==undefined){
  const d=body.contactPreference;
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['requestId','method','destination','consent'].includes(k)))throw new PmaError('Invalid contact preference');
  const requestId=uuid(d.requestId),method=text(d.method,'contact method',16),destination=text(d.destination,'contact destination',254);
  if(!['sms','email','phone'].includes(method)||d.consent!==true||body.confirmed!==true)throw new PmaError('Explicit contact consent required');
  if(method==='email'&&!/^[^ @]+@[^ @]+\.[^ @]+$/.test(destination))throw new PmaError('Valid email destination required');
  if((method==='sms'||method==='phone')&&!/^\+[1-9][0-9]{7,14}$/.test(destination))throw new PmaError('Valid phone destination required');
  return {...base,action:'contact_preference',details:{requestId,method,destination,consent:true}};
 }
 if(body.cancelOrReschedule===true||/\b(cancel|reschedule|change my (tour|showing))\b/i.test(message))return {...base,action:'staff'};
 if(body.prospect!==undefined){
  const d=body.prospect;
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!['name','email','phone','consent','confirmed','expectedVersion'].includes(k)))throw new PmaError('Invalid prospect details');
  if(d.consent!==true||d.confirmed!==true||body.confirmed!==true)return {...base,action:'clarify'};
  const name=text(d.name,'name',150);if(name.length<2)throw new PmaError('Full name required');
  const email=d.email==null?null:text(d.email,'email',254).toLowerCase();
  const phone=d.phone==null?null:text(d.phone,'phone',16);
  if((!email&&!phone)||(email&&!/^[^ @]+@[^ @]+\.[^ @]+$/.test(email))||(phone&&!/^\+[1-9][0-9]{7,14}$/.test(phone)))throw new PmaError('Validated contact method required');
  const expectedVersion=d.expectedVersion??0;if(!Number.isInteger(expectedVersion)||expectedVersion<0||expectedVersion>19)throw new PmaError('Invalid contact version');
  return {...base,action:'prospect',details:{name,email,phone,consent:true,confirmed:true,expectedVersion}};
 }
 if(body.listTourSlots===true)return {...base,action:'slots'};
 if(['OWNER_REQUEST','OWNER_OVERRIDE','VENDOR_RESPONSE','VENDOR_STATUS_UPDATE','MAINTENANCE_STATUS'].includes(decision.intent))return {...base,action:'authorization'};
 if(body.maintenance!==undefined||decision.intent==='MAINTENANCE_REQUEST'){
  const details=body.maintenance??{};
  if(!details||typeof details!=='object'||Array.isArray(details)||Object.keys(details).some(k=>!['reportedName','reportedAddress','reportedUnit','description'].includes(k)))throw new PmaError('Invalid incident report fields');
  const reportedName=text(details.reportedName,'tenant name',150),reportedAddress=text(details.reportedAddress,'reported address',300),reportedUnit=text(details.reportedUnit,'apartment number',80),description=text(details.description,'verbatim incident description',4000);
  if(reportedName.length<2||reportedAddress.length<5||reportedUnit.length<1)throw new PmaError('Name, property address and apartment number are required');
  const observed=body.observedCallerTurns;
  if(!Array.isArray(observed)||observed.length<1||observed.length>20||observed.some((v:any)=>typeof v!=='string'||v.length>4000))return {...base,action:'clarify',clarification:'I want to record your words accurately. Could you repeat the issue exactly as you would like it written in the report?'};
  if(!observed.some((v:string)=>v.trim()===description.trim()))return {...base,action:'clarify',clarification:'I want to capture your wording exactly. Could you repeat the issue once more so I can record it accurately?'};
  if(body.confirmed!==true)return {...base,action:'clarify',details:{reportedName,reportedAddress,reportedUnit,description}};
  return {...base,action:'incident_report',details:{reportedName,reportedAddress,reportedUnit,description},...(decision.safety_override?{safety:decision.intent}:{})};
 }
 if(decision.intent==='SHOWING_REQUEST'){
  if(body.confirmed!==true||!body.showingAt)return {...base,action:'clarify'};
  return {...base,action:'showing',requestedAt:showingInstant(body.showingAt),notes:message.slice(0,2000)};
 }
 if(decision.intent==='UNIT_AVAILABILITY')return {...base,action:'availability',bedrooms:decision.entities.bedrooms??null};
 if(['GENERAL_GREETING','HELP_REQUEST','UNKNOWN_QUESTION','PAYMENT_QUESTION','LEASE_QUESTION'].includes(decision.intent))return {...base,action:decision.intent==='UNKNOWN_QUESTION'?'staff':'information'};
 return {...base,action:'knowledge'};
}
/** Treat malformed/ambiguous transport results as UNKNOWN, never infer a write from an interaction. */
export function projectVoiceResult(raw:any){
 const unknown={success:false,state:'UNKNOWN',interactionPersisted:false,domainPersisted:false,persisted:false,notificationSent:false,reply:'The result is unconfirmed. I need to recover the original operation before confirming it.'};
 if(!raw||!voiceStates.includes(raw.state)||typeof raw.interactionPersisted!=='boolean'||typeof raw.domainPersisted!=='boolean'||typeof raw.reply!=='string')return unknown;
 const validReference=(id:any)=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
 if(raw.domainPersisted===true&&(typeof raw.operationId!=='string'||!/^pma:v1:[0-9a-f-]{36}$/i.test(raw.operationId)||![raw.contactId,raw.showingId,raw.requestId].some(validReference)))return unknown;
 if(raw.state==='CONFIRMED'&&raw.domainPersisted!==true)return unknown;
 if(raw.state==='REQUESTED'&&(raw.domainPersisted!==true||!raw.showingId||raw.bookingConfirmed!==false))return unknown;
 if(Array.isArray(raw.units))raw={...raw,units:raw.units.map((u:any)=>({...u,earliestRecordedDateLabel:calendarDate(u.earliestRecordedDate)}))};
 return {...raw,success:!['UNKNOWN','FAILED','CONFLICT'].includes(raw.state),persisted:raw.domainPersisted,notificationSent:false};
}
export async function executePmaVoice(body:Record<string,any>,admin:any,env:NodeJS.ProcessEnv=process.env){
 if(env.PMA_VOICE_INTEGRATION_ENABLED!=='true')throw new PmaError('PMA integration disabled',503);
 const tenant=uuid(env.AI4CC_VOICE_DEMO_TENANT_ID),property=uuid(env.PMA_STAGING_PROPERTY_ID);
 const session=uuid(body?.session_id);const call=text(body?.call_sid,'call SID',34);
 if(!/^CA[0-9a-f]{32}$/i.test(call))throw new PmaError('Invalid call',403);
 const prepared=prepareVoiceTurn(body);
 if(prepared.action==='incident_report'&&'details' in prepared){
  const response=await admin.rpc('pma_voice_incident_create_v1',{t:tenant,p:property,session_id:session,call_sid:call,incident:prepared.details});
  if(response.error){
   if(response.error.code==='42501')throw new PmaError('Active authorized PMA session required',403);
   const failed=projectVoiceResult(null);
   if('safety' in prepared&&isEmergencyIntent(String(prepared.safety))){
    const emergencyReceipt=await dispatchEmergency({tenantId:tenant,propertyId:property,callSid:call,sessionId:session,intent:String(prepared.safety),message:String(prepared.details.description),callerNumber:env.PMA_STAGING_TEST_CALLER},admin,env).catch(()=>({dispatched:false,incidentId:null,channels:[],state:'DISPATCH_UNCONFIRMED'}));
    return {...failed,emergencyDispatch:emergencyReceipt};
   }
   return failed;
  }
  const incidentResult=projectVoiceResult(response.data);
  if('safety' in prepared&&isEmergencyIntent(String(prepared.safety))){
   const emergencyReceipt=await dispatchEmergency({tenantId:tenant,propertyId:property,callSid:call,sessionId:session,intent:String(prepared.safety),message:String(prepared.details.description),callerNumber:env.PMA_STAGING_TEST_CALLER},admin,env).catch(()=>({dispatched:false,incidentId:null,channels:[],state:'DISPATCH_UNCONFIRMED'}));
   return {...incidentResult,emergencyDispatch:emergencyReceipt};
  }
  return incidentResult;
 }
 if(prepared.action==='clarify'&&body.maintenance!==undefined)return projectVoiceResult({state:'CLARIFICATION_REQUIRED',interactionPersisted:false,domainPersisted:false,reply:('clarification' in prepared?prepared.clarification:undefined)||'Please confirm your name, property address, apartment number and incident description before I create the report.',notificationSent:false});
 if(prepared.action==='contact_preference'&&'details' in prepared){
  const response=await admin.rpc('pma_voice_incident_preference_v1',{t:tenant,p:property,session_id:session,call_sid:call,request_id:prepared.details.requestId,method:prepared.details.method,destination:prepared.details.destination,consent:prepared.details.consent});
  if(response.error){if(response.error.code==='42501')throw new PmaError('Active authorized PMA session required',403);return projectVoiceResult(null);}
  return projectVoiceResult(response.data);
 }
 // DB config resolves actor; RPC has no arbitrary actor/contact/unit parameters.
 const response=await admin.rpc('pm_voice_turn_v1',{t:tenant,p:property,session_id:session,call_sid:call,turn:prepared});
 if(response.error){
  if(response.error.code==='42501')throw new PmaError('Active authorized PMA session required',403);
  if(response.error.code?.startsWith('23'))return projectVoiceResult({state:'CONFLICT',interactionPersisted:false,domainPersisted:false,reply:'The confirmed details conflict with the original operation. Staff review is needed.'});
  return projectVoiceResult(null);
 }
 // Await the bounded dispatch so serverless teardown cannot discard the alert.
 let emergencyReceipt=null;
 if(prepared.action==='safety'&&'safety' in prepared&&isEmergencyIntent(String(prepared.safety))){
  emergencyReceipt=await dispatchEmergency({tenantId:tenant,propertyId:property,callSid:call,sessionId:session,intent:String(prepared.safety),message:String(prepared.message),callerNumber:env.PMA_STAGING_TEST_CALLER},admin,env).catch(()=>({dispatched:false,incidentId:null,channels:[],state:'DISPATCH_UNCONFIRMED'}));
 }
 return {...projectVoiceResult(response.data),...(emergencyReceipt?{emergencyDispatch:emergencyReceipt}:{})};
}
