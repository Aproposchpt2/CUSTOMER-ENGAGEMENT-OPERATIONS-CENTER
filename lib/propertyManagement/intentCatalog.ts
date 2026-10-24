import runtime from '../../twilio-bridge/pma-intents.cjs';
import {PmaError,text,optionalUuid,oneOf,futureTime} from './domain';
export const intentCatalog=runtime.config;
export function intentDecision(message:unknown,proposal?:unknown){try{return runtime.classify(text(message,'message',4000),proposal);}catch(e){throw new PmaError((e as Error).message);}}
export function intentArguments(body:Record<string,any>,context:{tenantId:string;propertyId?:string|null;contactId?:string|null;unitId?:string|null},channel:unknown){
 const decision=intentDecision(body.message,body.modelOutput);
 const input=decision.safety_override?{}:body.workflowData??{};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['action','requestId','vendorId','assignmentId','response','status','version','scheduledAt','resolution','priority'].includes(k)))throw new PmaError('Invalid workflow data');
 const w:Record<string,unknown>={};
 for(const key of ['requestId','vendorId','assignmentId'])if(input[key])w[key]=optionalUuid(input[key],key);
 if(input.action)w.action=oneOf(input.action,['assign','priority','transition'],'owner action');
 if(input.response)w.response=oneOf(input.response,['accepted','declined','completed','information_requested'],'response');
 if(input.status)w.status=oneOf(input.status,['scheduled','in_progress','completed','New','Assigned','Scheduled','In Progress','Completed','Closed'],'status');
 if(input.priority)w.priority=oneOf(input.priority,['low','normal','high','emergency'],'priority');
 if(input.version!==undefined){if(!Number.isInteger(input.version)||input.version<1)throw new PmaError('Invalid request version');w.version=input.version;}
 if(input.scheduledAt)w.scheduledAt=futureTime(input.scheduledAt);
 if(input.resolution)w.resolution=text(input.resolution,'resolution',4000);
 return {classification:decision,args:{t:context.tenantId,p:optionalUuid(context.propertyId,'property'),c:optionalUuid(context.contactId,'contact'),u:optionalUuid(context.unitId,'unit'),k:text(body.operationKey,'operation key',160),ch:oneOf(channel,['chat','voice','sms'],'channel'),msg:text(body.message,'message',4000),d:{intent:decision.intent,confidence:decision.confidence,confidence_source:decision.confidence_source,entities:decision.entities},confirmed:body.confirmed===true,show_at:body.showingAt?futureTime(body.showingAt):null,request_id:optionalUuid(body.requestId,'request'),w}};
}
