'use strict';
// STAGING-ONLY prototype; not attached to the approved voice bridge.
// The authenticated gateway derives tenant/session identity from the bridge, never model arguments.
const crypto = require('node:crypto');
function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_'+field.toUpperCase());
  return value.trim();
}
function createGateway({executeTicket, verifyTicket, onEvent, now = () => Date.now()}) {
  if (![executeTicket,verifyTicket,onEvent].every(fn=>typeof fn==='function')) throw new Error('DEPENDENCY_MISSING');
  const ledger = new Map();
  function event(transaction, state, detail={}) {
    const record={workflowId:transaction.workflowId,tenantId:transaction.tenantId,sessionId:transaction.sessionId,callId:transaction.callId,state,at:now(),...detail};
    transaction.events.push(record);
    Promise.resolve().then(()=>onEvent(record)).catch(()=>{ transaction.deliveryPending=true; });
    return record;
  }
  function initiate({context,request}) {
    const tenantId=requiredString(context?.tenantId,'tenant');
    const sessionId=requiredString(context?.sessionId,'session');
    const callId=requiredString(context?.callId,'call');
    const callToolId=requiredString(context?.callToolId,'tool_call_id');
    if(request?.workflowType!=='support_ticket_creation') throw new Error('WORKFLOW_NOT_ALLOWED');
    if(!request?.confirmed) throw new Error('INTAKE_NOT_CONFIRMED');
    const key=[tenantId,sessionId,callToolId].join(':');
    if(ledger.has(key)) return {state:ledger.get(key).state,workflowId:ledger.get(key).workflowId,deduplicated:true};
    const transaction={tenantId,sessionId,callId,workflowId:crypto.randomUUID(),key,state:'ACCEPTED',events:[],deliveryPending:false};
    ledger.set(key,transaction);
    event(transaction,'ACCEPTED');
    transaction.promise=(async()=>{
      transaction.state='RUNNING';event(transaction,'RUNNING');
      try {
        const submitted=await executeTicket(request.intake,{tenantId,sessionId,callId,idempotencyKey:key});
        const ticket=await verifyTicket(submitted,{tenantId,sessionId,callId});
        if(typeof ticket?.caseId!=='string'||!ticket.caseId.trim()) throw new Error('VERIFICATION_MISSING');
        transaction.state='COMPLETED';event(transaction,'COMPLETED',{caseId:ticket.caseId});
      } catch(error) {
        transaction.state=error?.outcomeUnknown?'UNKNOWN':'FAILED';
        event(transaction,transaction.state,{reason:transaction.state==='UNKNOWN'?'RECONCILIATION_REQUIRED':'TICKET_NOT_CONFIRMED'});
      }
    })();
    return {state:'ACCEPTED',workflowId:transaction.workflowId,deduplicated:false};
  }
  function status({tenantId,sessionId,callToolId}) {
    const key=[tenantId,sessionId,callToolId].join(':');
    const txn=ledger.get(key);
    return txn?{state:txn.state,workflowId:txn.workflowId,deliveryPending:txn.deliveryPending,events:[...txn.events]}:null;
  }
  return {initiate,status};
}
module.exports={createGateway};
