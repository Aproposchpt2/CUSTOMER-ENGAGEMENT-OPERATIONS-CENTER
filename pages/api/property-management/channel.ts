import type { NextApiRequest,NextApiResponse } from 'next';
import {pmaSession,privateResponse,result,fail} from '@/lib/propertyManagement/server';
import {classify,futureTime,oneOf,optionalUuid,text,uuid,PmaError} from '@/lib/propertyManagement/domain';

/** Authenticated sandbox entry into the same canonical workflow for all channels.
 * Transport adapters must supply trusted property/contact bindings, never model claims. */
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const {db,tenantId}=await pmaSession(req),b=req.body??{};
  const classification=classify(b.message);
  if(b.confirmed!==true)throw new PmaError('Confirm the property, contact and inquiry details before submitting');
  const saved=result(await db.rpc('pm_record_channel_turn',{
   t:tenantId,p:uuid(b.propertyId),c:uuid(b.contactId),u:optionalUuid(b.unitId,'unit'),k:text(b.operationKey,'operation key',160),
   ch:oneOf(b.channel,['voice','sms','chat'],'channel'),msg:text(b.message,'message',4000),intent:classification.intent,category:classification.category,priority:classification.priority,
   show_at:b.showingAt?futureTime(b.showingAt):null,request_id:optionalUuid(b.requestId,'request'),
  }));
  return res.json({classification,result:saved,transport:'sandbox',productionMessageSent:false});
 }catch(e){return fail(res,e);}
}
