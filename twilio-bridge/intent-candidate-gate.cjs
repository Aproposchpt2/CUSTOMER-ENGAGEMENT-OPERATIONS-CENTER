'use strict';
// Server-side *candidate validation*, not a speech classifier or transaction authority.
// Model-proposed identifiers and confidence never grant permission to mutate records.
const source=require('./voice-agent-catalog.json');
const domains=Object.freeze({sales:'sales',support:'support'});
const shared=new Set(['universal','conversation_control']);
const ids=new Map(source.intents.map(x=>[x.reference,x]));
function assess({profile,reference,confidence,entities={},tenantId,safetyReference=null}={}){
 if(!Object.hasOwn(domains,profile))return {decision:'DENIED_PROFILE',mayExecute:false};
 const trustedTenant=profile==='sales'?'5885a020-d363-4c27-910a-c035eda132f5':'d7e80001-0000-4000-b000-000000000001';
 if(tenantId!==trustedTenant)return {decision:'DENIED_TENANT',mayExecute:false};
 if(safetyReference!==null){
  const event=ids.get(safetyReference);
  if(!event||event.group!=='safety')return {decision:'INVALID_SAFETY_SIGNAL',mayExecute:false};
  return {decision:'SAFETY_OVERRIDE',reference:event.reference,mayExecute:false,requiresEmergencyPolicy:true};
 }
 const intent=ids.get(reference);
 if(!intent||!(intent.group===domains[profile]||shared.has(intent.group)))
   return {decision:'UNKNOWN_INTENT',mayExecute:false};
 if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1)
   return {decision:'CLARIFY',mayExecute:false};
 if(confidence<0.70)return {decision:'UNKNOWN_INTENT',mayExecute:false};
 if(confidence<0.90)return {decision:'CLARIFY',reference,mayExecute:false};
 if(!entities||typeof entities!=='object'||Array.isArray(entities))return {decision:'INVALID_ENTITIES',mayExecute:false};
 return {decision:'CANDIDATE_RECOGNIZED',reference,group:intent.group,mayExecute:false,
   requiresServerAuthorization:true,
   advisory:'Candidate only. Tenant, required entities, user consent, safety and workflow authorization must be checked independently.'};
}
module.exports={assess};
