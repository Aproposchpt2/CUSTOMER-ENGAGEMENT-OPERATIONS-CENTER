import type {NextApiRequest} from 'next';
import {createClient} from '@supabase/supabase-js';
import {createHmac,timingSafeEqual} from 'crypto';
import {validateRequest} from 'twilio';
import {stagingGate,result} from './server';
import {classify,optionalUuid,text,uuid,PmaError} from './domain';

export function stagingTransportGate(){
 stagingGate();
 if(process.env.PMA_CHANNELS_ENABLED!=='true')throw new PmaError('PMA staging channels are disabled',503);
 const base=new URL(process.env.PMA_STAGING_BASE_URL??'');
 if(base.protocol!=='https:'||base.hostname!=='pma-validation--ai4cc-staging.netlify.app')throw new PmaError('Unapproved staging transport host',503);
 return base;
}
export function verifyPmaBridge(req:NextApiRequest){
 stagingTransportGate();
 const secret=process.env.BRIDGE_HMAC_SECRET_STAGING,signature=req.headers['x-bridge-signature'];
 if(!secret||typeof signature!=='string')throw new PmaError('Unauthorized bridge',401);
 const [ts,sig]=signature.split('.');
 if(!/^\d+$/.test(ts??'')||Math.abs(Date.now()/1000-Number(ts))>60||!/^[0-9a-f]{64}$/.test(sig??''))throw new PmaError('Unauthorized bridge',401);
 const expected=createHmac('sha256',secret).update(`pma-staging:${ts}:${JSON.stringify(req.body)}`).digest();
 if(!timingSafeEqual(expected,Buffer.from(sig,'hex')))throw new PmaError('Unauthorized bridge',401);
}
export function verifyPmaTwilio(req:NextApiRequest){
 const base=stagingTransportGate(),token=process.env.TWILIO_AUTH_TOKEN;
 const body=req.body??{},signature=req.headers['x-twilio-signature'];
 if(!token||typeof signature!=='string'||!validateRequest(token,signature,new URL(req.url??'',base).toString(),body))throw new PmaError('Invalid Twilio signature',403);
 const did=process.env.PMA_STAGING_DID,caller=process.env.PMA_STAGING_TEST_CALLER;
 if(!did||!caller||['+17253305102','+17027102622'].includes(did)||body.To!==did||body.From!==caller||body.AccountSid!==process.env.TWILIO_ACCOUNT_SID)throw new PmaError('Unapproved staging test call or message',403);
}
export async function trustedPmaTurn(body:Record<string,unknown>,channel:'voice'|'sms'){
 stagingTransportGate();
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new PmaError('Staging storage unavailable',503);
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const propertyId=uuid(process.env.PMA_STAGING_PROPERTY_ID),contactId=uuid(process.env.PMA_STAGING_CONTACT_ID),actor=uuid(process.env.PMA_CHANNEL_ACTOR_USER_ID);
 const property=result(await admin.from('pm_properties').select('id,tenant_id').eq('id',propertyId).single());
 if(!property)throw new PmaError('Staging property unavailable',503);
 const contact=result(await admin.from('ai4cc_contacts').select('id,metadata').eq('tenant_id',property.tenant_id).eq('id',contactId).single());
 if(!contact||contact.metadata?.synthetic!==true)throw new PmaError('Only synthetic staging contacts are allowed',403);
 const classification=classify(body.message);
 return result(await admin.rpc('pm_trusted_channel_turn',{actor,t:property.tenant_id,p:propertyId,c:contactId,u:optionalUuid(process.env.PMA_STAGING_UNIT_ID,'staging unit'),k:text(body.operationKey,'operation key',160),ch:channel,msg:text(body.message,'message',4000),intent:classification.intent,category:classification.category,priority:classification.priority,show_at:body.showingAt??null,request_id:optionalUuid(body.requestId,'request')}));
}
