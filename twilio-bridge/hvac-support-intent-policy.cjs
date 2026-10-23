'use strict';
/**
 * Summit Comfort HVAC Support — canonical intent policy core.
 * Pure decision layer. This module DOES NOT perform speech recognition, model
 * classification, tenant resolution, DB writes or deploy itself.
 * Full catalog source is retained in docs/hvac-knowledge/source/.
 */
const catalog = require('../docs/hvac-knowledge/source/HVAC-SUPPORT-master-intents-source.json');
const groupByRef = new Map(catalog.intents.map(x => [x.reference_id, x.group]));
const SUPPORT_GROUPS = new Set(['support','hvac','universal','conversation_control']);
const SAFETY = new Set(catalog.intents.filter(x => x.group === 'safety').map(x => x.reference_id));
const TENANT_ID = 'd7e80001-0000-4000-b000-000000000001';
function classifyCandidate({referenceId,confidence,scannerSafetyId=null,tenantId} = {}) {
  if (tenantId !== TENANT_ID) return {decision:'DENY_TENANT',mayExecute:false};
  // Scanner safety events must be authenticated by the server; never pass model
  // output as scannerSafetyId.
  if (scannerSafetyId !== null) {
    if (!SAFETY.has(scannerSafetyId)) return {decision:'INVALID_SAFETY_EVENT',mayExecute:false};
    return {decision:'SAFETY_OVERRIDE',referenceId:scannerSafetyId,mayExecute:false,immediateEscalation:true};
  }
  const group=groupByRef.get(referenceId);
  if (!SUPPORT_GROUPS.has(group)) return {decision:'UNKNOWN_INTENT',mayExecute:false};
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence<0 || confidence>1) return {decision:'ASK_CLARIFICATION',mayExecute:false};
  if (confidence < 0.70) return {decision:'UNKNOWN_INTENT',mayExecute:false};
  if (confidence < 0.90) return {decision:'ASK_CLARIFICATION',referenceId,mayExecute:false};
  return {decision:'RECOGNIZED',referenceId,group,mayExecute:false,requiresServerAuthorization:true};
}
module.exports={classifyCandidate,TENANT_ID,SAFETY};
