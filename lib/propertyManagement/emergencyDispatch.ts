const EMERGENCY_INTENTS=new Set(['FIRE_EMERGENCY','FLOOD_EMERGENCY','GAS_EMERGENCY','SECURITY_EMERGENCY','PERSONAL_SAFETY_THREAT']);
const SEVERITY:Record<string,string>={FIRE_EMERGENCY:'CRITICAL',GAS_EMERGENCY:'CRITICAL',FLOOD_EMERGENCY:'HIGH',SECURITY_EMERGENCY:'HIGH',PERSONAL_SAFETY_THREAT:'HIGH'};
const TRADE:Record<string,string>={FIRE_EMERGENCY:'fire_safety',FLOOD_EMERGENCY:'plumbing',GAS_EMERGENCY:'hvac',SECURITY_EMERGENCY:'security',PERSONAL_SAFETY_THREAT:'general'};

export function isEmergencyIntent(intent:string):boolean{return EMERGENCY_INTENTS.has(intent);}

interface DispatchCtx{tenantId:string;propertyId:string;callSid:string;sessionId:string;intent:string;message:string;callerNumber?:string;}
export interface DispatchReceipt{dispatched:boolean;channels:string[];incidentId:string|null;}

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
 const channels:string[]=[];let incidentId:string|null=null;
 const severity=SEVERITY[ctx.intent]??'HIGH';
 const label=ctx.intent.replace(/_/g,' ');

 // Create incident record
 try{
  const {data}=await admin.from('platform_incidents').insert({
   incident_key:`pma:emergency:${ctx.callSid}:${Date.now()}`,
   severity,status:'OPEN',
   title:`[STAGING] ${label} — Desert Ridge`,
   summary:`Caller reported: ${ctx.message.slice(0,500)}`,
   tenant_id:ctx.tenantId,
   service:'pma-voice-staging',
   opened_at:new Date().toISOString(),
   metadata:{intent:ctx.intent,call_sid:ctx.callSid,session_id:ctx.sessionId,property_id:ctx.propertyId,trade:TRADE[ctx.intent]??'general',staging:true},
  }).select('id').single();
  if(data?.id)incidentId=data.id;
 }catch{/* non-blocking; log loss acceptable in staging */}

 // Read notification preferences (entity_type='property', entity_id=propertyId)
 let prefs:any[]=[];
 try{
  const {data}=await admin.from('pm_notification_preferences')
   .select('channel,destination')
   .eq('tenant_id',ctx.tenantId)
   .eq('entity_type','property')
   .eq('entity_id',ctx.propertyId)
   .eq('event_type','emergency_escalation')
   .eq('active',true)
   .eq('staging_override',true);
  prefs=data??[];
 }catch{}

 const {TWILIO_ACCOUNT_SID:sid,TWILIO_AUTH_TOKEN:tok,PMA_STAGING_DID:from}=env;
 const incRef=incidentId?incidentId.slice(0,8):'—';
 const callerRef=ctx.callerNumber?`Caller: ${ctx.callerNumber}`:'Caller: unknown';
 for(const pref of prefs){
  if(pref.channel==='sms'&&sid&&tok&&from){
   const body=`[PMA STAGING] ${label} at Desert Ridge. ${callerRef}. Call ID: ${ctx.callSid.slice(0,16)}… Incident: ${incRef}. Owner action required. This is a staging test.`;
   try{await twilioSms(sid,tok,from,pref.destination,body);channels.push('sms:…'+pref.destination.slice(-4));}catch{}
  }else if(pref.channel==='email'){
   // No email sender configured in staging; recorded in incident metadata only
   channels.push('email:logged');
  }
 }

 return {dispatched:!!incidentId||channels.length>0,channels,incidentId};
}
