import {createHash} from 'crypto';
import {validateRequest} from 'twilio';
import {PmaError} from './domain';
const BASE='https://pma-validation--ai4cc-staging.netlify.app';
const TENANT='5885a020-d363-4c27-910a-c035eda132f5',PROPERTY='eead9ac5-b28b-4594-b75b-a9e9bbbd111f';
const SENDER='+17252010584',VENDOR='+17253305102';
const RECIPIENTS=['+17753508039',VENDOR,'+17027102622','+17029351414'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function smsEvidenceEnabled(env:NodeJS.ProcessEnv){return env.PMA_STAGING_NOTIFICATION_EVIDENCE_ENABLED==='true'&&env.PMA_CHANNELS_ENABLED==='true'&&env.PMA_ENVIRONMENT==='staging'&&env.NEXT_PUBLIC_SUPABASE_URL==='https://hvzauakkhlivzeqatfqm.supabase.co'&&env.AI4CC_VOICE_DEMO_TENANT_ID===TENANT&&env.PMA_STAGING_PROPERTY_ID===PROPERTY&&env.PMA_STAGING_SMS_FROM===SENDER;}
export function smsStatusCallback(attemptId:string){if(!uuid.test(attemptId))throw new PmaError('Invalid notification attempt',400);return BASE+'/api/twilio/pma-sms-status-staging?attempt_id='+attemptId;}
export async function recordSmsEvidence(admin:any,payload:Record<string,unknown>){
 const r=await admin.rpc('pm_staging_sms_evidence_v1',{t:TENANT,p:PROPERTY,payload});
 if(r.error)throw new PmaError('Staging notification evidence unavailable',503);
 return r.data;
}
/** Verify provider signature over the original URL and every provider parameter. */
export function stagingSmsEvent(req:{url?:string;body:any;headers:Record<string,any>},kind:'status'|'receive',env:NodeJS.ProcessEnv){
 if(!smsEvidenceEnabled(env))throw new PmaError('Staging notification evidence disabled',503);
 const body=req.body,signature=req.headers['x-twilio-signature'];
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length>100||Object.values(body).some(v=>typeof v!=='string'||v.length>4096))throw new PmaError('Invalid SMS event',400);
 const expectedPath=kind==='status'?'/api/twilio/pma-sms-status-staging':'/api/twilio/pma-sms-receive-staging';
 const url=new URL(req.url||'',BASE);
 if(url.origin!==BASE||url.pathname!==expectedPath||(kind==='receive'&&url.search!==''))throw new PmaError('Invalid SMS event URL',403);
 if(!env.TWILIO_AUTH_TOKEN||typeof signature!=='string'||!validateRequest(env.TWILIO_AUTH_TOKEN,signature,url.toString(),body)||!/^AC[0-9a-f]{32}$/i.test(env.TWILIO_ACCOUNT_SID||'')||body.AccountSid!==env.TWILIO_ACCOUNT_SID||!/^SM[0-9a-f]{32}$/i.test(body.MessageSid||''))throw new PmaError('Invalid Twilio SMS signature or account',403);
 if(kind==='status'){
  const ids=url.searchParams.getAll('attempt_id');
  if(ids.length!==1||Array.from(url.searchParams.keys()).some(k=>k!=='attempt_id')||!uuid.test(ids[0])||body.From!==SENDER||!RECIPIENTS.includes(body.To)||!['accepted','queued','sending','sent','delivered','undelivered','failed'].includes(body.MessageStatus)||body.ErrorCode&&!/^\d{1,8}$/.test(body.ErrorCode))throw new PmaError('Unapproved SMS status event',403);
  return {op:'status',attempt_id:ids[0],message_sid:body.MessageSid,status:body.MessageStatus,from:body.From,to:body.To,error_code:body.ErrorCode||null};
 }
 // Only notifications to owned test DIDs, or a test vendor reply to the sender.
 if(!((body.From===SENDER&&RECIPIENTS.slice(1).includes(body.To))||(body.From===VENDOR&&body.To===SENDER))||typeof body.Body!=='string')throw new PmaError('Unapproved staging SMS sender or destination',403);
 const match=/^ACK\s+([0-9a-f]{32})$/i.exec(body.Body.trim());
 return {op:'receive',message_sid:body.MessageSid,from:body.From,to:body.To,body_hash:createHash('sha256').update(body.Body).digest('hex'),ack_token:body.From===VENDOR&&body.To===SENDER&&match?match[1].toLowerCase():null};
}
