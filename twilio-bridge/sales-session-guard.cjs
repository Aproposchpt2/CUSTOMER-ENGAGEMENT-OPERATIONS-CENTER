'use strict';
const TENANT='5885a020-d363-4c27-910a-c035eda132f5';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validSession(ctx){return Boolean(ctx&&ctx.tenantId===TENANT&&ctx.synthetic===true&&ctx.voiceDemo===true&&ctx.selectedRoute==='sales-specialist'&&['propertyId','contactId','actorId','sessionId'].every(key=>UUID.test(ctx[key]||'')));}
function payloadForTrustedSession(ctx,details){
 if(!validSession(ctx))throw Error('TRUSTED_SALES_SESSION_REQUIRED');
 if(!details||details.confirmed!==true||typeof details.callerName!=='string'||details.callerName.trim().length<2||typeof details.description!=='string'||details.description.trim().length<10||(!details.email&&!details.phone))throw Error('CONFIRMED_DETAILS_REQUIRED');
 const fields=['callerName','businessName','email','phone','serviceInterest','description','confirmed'];
 if(Object.keys(details).some(key=>!fields.includes(key)))throw Error('UNTRUSTED_FIELD');
 return {t:TENANT,p:ctx.propertyId,c:ctx.contactId,actor:ctx.actorId,session_id:ctx.sessionId,payload:{...details,interactionId:ctx.sessionId}};
}
module.exports={validSession,payloadForTrustedSession,TENANT};
