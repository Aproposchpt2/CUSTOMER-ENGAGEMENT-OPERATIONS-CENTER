import {createHmac} from 'node:crypto';
import {PmaError,uuid,text} from './domain';
import type {TrustedPmaCallScope} from './scheduling';
/** Run after HMAC/Twilio validation. The row must come from the server's DB lookup. */
export function pmaCallScope(row:Record<string,any>,binding:{tenantId:string;propertyId:string;sessionId:string;callSid:string;actorId:string}):TrustedPmaCallScope {
 const {tenantId,propertyId,sessionId,callSid,actorId}=binding;
 for(const id of [tenantId,propertyId,sessionId,actorId])uuid(id);
 if(!/^CA[0-9a-f]{32}$/i.test(callSid)||row.id!==sessionId||row.tenant_id!==tenantId||row.channel!=='voice'||row.ended_at||!['open','active'].includes(row.status)||row.metadata?.selected_route!=='property-management-assistant'||row.metadata?.property_id!==propertyId||row.metadata?.call_sid!==callSid||row.metadata?.synthetic!==true||row.metadata?.voice_demo!==true)throw new PmaError('Active trusted PMA call scope required',403);
 const capture=row.metadata?.pma_prospect_capture;
 const contactId=capture?.persisted===true?uuid(capture.contactId):null;
 return {tenantId,propertyId,sessionId,callSid,actorId,contactId,verifiedResidentUserId:null};
}
/** nonce is allocated and durably retained by the server for a single confirmed operation. */
export function pmaOperationId(scope:TrustedPmaCallScope,kind:'showing'|'prospect'|'maintenance',nonce:string,secret:string):string {
 if(!['showing','prospect','maintenance'].includes(kind)||secret.length<32)throw new PmaError('Operation signing unavailable',503);
 uuid(nonce,'server operation nonce');text(scope.callSid,'call SID',34);
 return 'pma:v1:'+createHmac('sha256',secret).update(JSON.stringify([scope.tenantId,scope.propertyId,scope.sessionId,scope.callSid,kind,nonce])).digest('hex');
}
