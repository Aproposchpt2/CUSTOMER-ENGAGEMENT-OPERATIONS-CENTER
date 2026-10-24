import {intentDecision} from './intentCatalog';
import {PmaError,text,uuid} from './domain';
import {calendarDate} from './availability';
import {showingInstant} from './scheduling';

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
 if(decision.safety_override)return {...base,message:detailSafety?.safety_override?detailMessage:message,action:'safety',safety:decision.intent};
 if(Object.keys(body).some(k=>!['message','modelOutput','confirmed','call_sid','session_id','agentRoute','prospect','showingAt','maintenance','cancelOrReschedule','listTourSlots','recoverOperation'].includes(k)))throw new PmaError('Untrusted PMA fields');
 if(body.agentRoute!=='property-management-assistant')throw new PmaError('PMA route required',403);
 if(decision.requires_clarification)return {...base,action:'clarify'};
 if(body.recoverOperation!==undefined){if(!['prospect','showing'].includes(body.recoverOperation))throw new PmaError('Invalid recovery kind');return {...base,action:'recover',kind:body.recoverOperation};}
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
 if(decision.intent==='MAINTENANCE_REQUEST'){
  // A spoken name, caller ID or captured prospect is never an authenticated resident.
  const details=body.maintenance??{};
  if(!details||typeof details!=='object'||Array.isArray(details)||Object.keys(details).some(k=>!['category','description','impact','urgency','safetyIndicators','preferredContactMethod','photos'].includes(k)))throw new PmaError('Invalid maintenance fields');
  for(const k of ['category','description','impact','urgency','preferredContactMethod'])if(details[k]!==undefined)text(details[k],k,k==='description'?4000:2000);
  for(const k of ['safetyIndicators','photos'])if(details[k]!==undefined&&(!Array.isArray(details[k])||details[k].length>(k==='photos'?5:10)||details[k].some((v:any)=>typeof v!=='string'||v.length>(k==='photos'?500:200))))throw new PmaError('Invalid optional maintenance evidence');
  return {...base,action:'maintenance',details};
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
 // DB config resolves actor; RPC has no arbitrary actor/contact/unit parameters.
 const response=await admin.rpc('pm_voice_turn_v1',{t:tenant,p:property,session_id:session,call_sid:call,turn:prepared});
 if(response.error){
  if(response.error.code==='42501')throw new PmaError('Active authorized PMA session required',403);
  if(response.error.code?.startsWith('23'))return projectVoiceResult({state:'CONFLICT',interactionPersisted:false,domainPersisted:false,reply:'The confirmed details conflict with the original operation. Staff review is needed.'});
  return projectVoiceResult(null);
 }
 return projectVoiceResult(response.data);
}
