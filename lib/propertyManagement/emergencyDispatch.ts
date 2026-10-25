// Restricted staging recipients. Phone numbers are explicitly approved for controlled tests.
const PMA_STAGING_TEST_ROLES:Readonly<Record<string,'owner'|'vendor'|'tenant'|'owner_backup'>>=Object.freeze({
 '+17753508039':'owner',
 '+17253305102':'vendor',
 '+17027102622':'tenant',
 '+17029351414':'owner_backup',
});
const EMERGENCY_INTENTS=new Set(['FIRE_EMERGENCY','FLOOD_EMERGENCY','GAS_EMERGENCY','SECURITY_EMERGENCY','PERSONAL_SAFETY_THREAT']);
// The deployed voice/SQL catalog uses these names. Keep that catalog identity
// intact, and translate only at the restricted incident dispatcher boundary.
const VOICE_EMERGENCY_ALIASES:Record<string,string>={FIRE_OR_SMOKE:'FIRE_EMERGENCY',SUSPECTED_GAS_LEAK:'GAS_EMERGENCY',MAJOR_FLOODING:'FLOOD_EMERGENCY',ELECTRICAL_HAZARD:'PERSONAL_SAFETY_THREAT'};
export function emergencyDispatchIntent(intent:string):string|null{
 return EMERGENCY_INTENTS.has(intent)?intent:Object.hasOwn(VOICE_EMERGENCY_ALIASES,intent)?VOICE_EMERGENCY_ALIASES[intent]:null;
}

export function isEmergencyIntent(intent:string):boolean{return emergencyDispatchIntent(intent)!==null;}

interface DispatchCtx{tenantId:string;propertyId:string;callSid:string;sessionId:string;intent:string;message:string;callerNumber?:string;testMode?:boolean;}
export interface DispatchReceipt{dispatched:boolean;channels:string[];incidentId:string|null;attempts?:{channel:string;state:'SUBMITTED'|'FAILED'|'NOT_CONFIGURED';destinationSuffix?:string;recipientRole?:string}[];state?:'SUBMITTED'|'FAILED'|'NOT_CONFIGURED'|'NOT_REQUIRED';}

async function twilioSms(accountSid:string,authToken:string,from:string,to:string,body:string):Promise<void>{
 const url=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
 const r=await fetch(url,{
  method:'POST',
  headers:{Authorization:'Basic '+Buffer.from(`${accountSid}:${authToken}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({From:from,To:to,Body:body}).toString(),
  signal:AbortSignal.timeout(8000),
 });
 if(!r.ok)throw new Error(`Twilio ${r.status}`);
}

export async function dispatchEmergency(ctx:DispatchCtx,admin:any,env:NodeJS.ProcessEnv):Promise<DispatchReceipt>{
 const channels:string[]=[];const attempts:NonNullable<DispatchReceipt['attempts']>=[];let incidentId:string|null=null;
 const dispatchIntent=emergencyDispatchIntent(ctx.intent);
 if(env.PMA_ENVIRONMENT!=='staging'||env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co'||!dispatchIntent)return {dispatched:false,channels,incidentId};
 const label=ctx.intent.replace(/_/g,' ');

 // The tables deliberately deny service_role direct access. Use the narrow,
 // staging-only operation instead of broad table grants or swallowed DB errors.
 const prepared=await admin.rpc('pm_staging_emergency_prepare_v1',{
  t:ctx.tenantId,p:ctx.propertyId,call_sid:ctx.callSid,session_id:ctx.sessionId,
  intent:dispatchIntent,message:ctx.message.slice(0,500),test_mode:ctx.testMode===true,
 });
 if(prepared.error)throw new Error('EMERGENCY_PREPARE_FAILED:'+String(prepared.error.code||'UNKNOWN'));
 const data=prepared.data;
 if(!data||typeof data.incidentId!=='string'||!Array.isArray(data.preferences))throw new Error('EMERGENCY_PREPARE_INVALID');
 incidentId=data.incidentId;
 if(data.notify!==true)return {dispatched:false,channels,incidentId,attempts,state:'NOT_REQUIRED'};
 const prefs=data.preferences;
 const {TWILIO_ACCOUNT_SID:sid,TWILIO_AUTH_TOKEN:tok}=env;
 // An approved SMS sender can differ from the inbound IVR DID.
 const from=env.PMA_STAGING_SMS_FROM||env.PMA_STAGING_DID;
 const incRef=incidentId?incidentId.slice(0,8):'—';
 const callerRef=ctx.callerNumber?`Caller: ${ctx.callerNumber}`:'Caller: unknown';
 for(const pref of prefs){
  const destination=typeof pref.destination==='string'?pref.destination:'';
  const role=Object.hasOwn(PMA_STAGING_TEST_ROLES,destination)?PMA_STAGING_TEST_ROLES[destination]:null;
  if(pref.channel==='sms'&&!role){
   attempts.push({channel:'sms',state:'NOT_CONFIGURED'});
   continue;
  }
  if(pref.channel==='sms'&&sid&&tok&&from){
   const action=role==='vendor'?'Maintenance vendor notification — please acknowledge through the authorized workflow.':role==='tenant'?'Tenant incident notice — follow emergency safety instructions.':role==='owner_backup'?'Property owner backup action may be required.':'Owner action required.';
   const body=`[PMA STAGING] ${label} at Desert Ridge. ${callerRef}. Call ID: ${ctx.callSid.slice(0,16)}… Incident: ${incRef}. ${action} This is a staging test.`;
   try{await twilioSms(sid,tok,from,destination,body);channels.push('sms:…'+pref.destination.slice(-4));attempts.push({channel:'sms',state:'SUBMITTED',destinationSuffix:destination.slice(-4),recipientRole:role||undefined});}catch{attempts.push({channel:'sms',state:'FAILED',destinationSuffix:destination.slice(-4),recipientRole:role||undefined});}
  }else if(pref.channel==='sms'){
   attempts.push({channel:'sms',state:'NOT_CONFIGURED',destinationSuffix:destination.slice(-4),recipientRole:role||undefined});
  }else if(pref.channel==='email'){
   // No email transport exists here: do not mistake metadata for submission.
   attempts.push({channel:'email',state:'NOT_CONFIGURED'});
  }else{attempts.push({channel:String(pref.channel||'unknown'),state:'NOT_CONFIGURED'});}
 }
 const dispatched=!!incidentId&&attempts.some(a=>a.state==='SUBMITTED');
 const state=dispatched?'SUBMITTED':attempts.some(a=>a.state==='FAILED')?'FAILED':'NOT_CONFIGURED';
 // SUBMITTED means Twilio accepted a request; it does not prove delivery or vendor acknowledgment.
 return {dispatched,channels,incidentId,attempts,state};
}
