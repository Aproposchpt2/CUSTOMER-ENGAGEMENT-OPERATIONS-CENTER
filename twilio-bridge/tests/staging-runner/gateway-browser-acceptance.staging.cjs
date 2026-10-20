'use strict';
// Browser test coordinator only. Never exports authentication or operation tokens.
function createBrowserAcceptance({post,onEvidence=()=>{},now=()=>Date.now()}){
  let token=null,fixture=null;const checks=[];
  const need=(v,code)=>{if(!v)throw Error(code);};
  const evidence=()=>({scope:'GATEWAY_BROWSER_OBSERVATIONS_ONLY',fixture,checks:[...checks],databaseVerified:false,cleanupVerified:false,pending:['G02 foreign/inactive real user','G03 real capability expiry','G04 two-process first-submit race','G05 committed interruption recovery','G06 invalid persisted association','G07 independent database evidence and cleanup']});
  const save=()=>onEvidence(evidence());
  const submitBody=()=>({operationToken:token,confirmed:true,intake:fixture.intake});
  const verified=r=>need(r.status===200&&r.body.success===true&&r.body.state==='COMPLETED'&&/^[0-9a-f-]{36}$/i.test(r.body.caseId)&&/^[0-9a-f-]{36}$/i.test(r.body.customerId)&&r.body.testOnly===true&&r.body.notificationSent===false&&r.body.technicianFollowupConfirmed===false,'TICKET_NOT_CONFIRMED');
  return {
    evidence,
    async expired(){
      need(token&&fixture,'PREPARE_FIRST');
      need(!fixture.submissionAttempted,'EXPIRY_REQUIRES_UNSUBMITTED_FIXTURE');
      // Test the issued capability unchanged, against the actual server clock.
      // No shortened TTL, forged signature, synthetic clock or ticket submission.
      need(Number.isFinite(Date.parse(fixture.expiresAt))&&now()>=Date.parse(fixture.expiresAt)+2000,'WAIT_FOR_REAL_CAPABILITY_EXPIRY');
      const r=await post('status',{operationToken:token});
      need(r.status===403&&r.body?.error==='OPERATION_NOT_AUTHORIZED'&&!r.body.caseId&&!r.body.customerId&&!r.body.success,'EXPIRED_CAPABILITY_NOT_REJECTED');
      checks.push({test:'G03 real capability expiry',result:'EXPIRED_CAPABILITY_REJECTED',status:r.status,expiresAt:fixture.expiresAt,observedAt:new Date(now()).toISOString(),ticketSubmissionAttempted:false});save();return evidence();
    },
    async prepare(){
      need(!fixture,'FIXTURE_ALREADY_PREPARED');
      const runId='gateway-'+crypto.randomUUID();
      const intake={name:'Fictional staging customer',email:runId+'@example.invalid',phone:'',product:'Synthetic staging router',purchaseDate:'2026-10-01',issue:'Fictional staging gateway acceptance; no real customer or notification.',steps:runId,impact:'No real business affected',priority:'NORMAL'};
      const r=await post('begin',{confirmed:true,intake});need(r.status===201&&typeof r.body.operationToken==='string','CAPABILITY_NOT_ISSUED');
      const claims=JSON.parse(atob(r.body.operationToken.split('.')[0].replaceAll('-','+').replaceAll('_','/')));
      need(/^gateway:[0-9a-f-]{36}$/i.test(claims.operationId)&&/^phone-staging:CA[0-9a-f]{32}$/i.test(claims.sessionId),'MANIFEST_BINDING_INVALID');
      token=r.body.operationToken;fixture={runId,operationId:claims.operationId,session:claims.sessionId,email:intake.email,intake,expiresAt:r.body.expiresAt};save();return evidence();
    },
    async submit(){
      need(token,'PREPARE_FIRST');need(!fixture.submissionAttempted,'USE_RECOVERY_AFTER_UNCERTAIN_SUBMISSION');
      // Publish deterministic cleanup manifest and attempted flag BEFORE the one permitted initial write.
      fixture.submissionAttempted=true;save();
      const r=await post('submit',submitBody());
      if(r.status===202){checks.push({test:'initial submit',result:'UNKNOWN_OR_PENDING',state:r.body.state,caseId:null});save();return evidence();}
      verified(r);fixture.caseId=r.body.caseId;fixture.contactId=r.body.customerId;
      checks.push({test:'G01 HTTP ticket result',result:'CONFIRMED_DATABASE_CHECK_PENDING',caseId:fixture.caseId});save();return evidence();
    },
    async recover(){
      need(token,'PREPARE_FIRST');const r=await post('status',{operationToken:token});
      if(r.status===200){verified(r);need(!fixture.caseId||fixture.caseId===r.body.caseId,'RECOVERY_CASE_CHANGED');fixture.caseId=r.body.caseId;fixture.contactId=r.body.customerId;}
      else need(r.status===202&&r.body?.success===false&&['ACCEPTED','RUNNING','UNKNOWN'].includes(r.body.state)&&!Object.hasOwn(r.body,'caseId')&&!Object.hasOwn(r.body,'customerId')&&r.body.notificationSent===false&&r.body.technicianFollowupConfirmed===false,'RECOVERY_NOT_SAFE');
      // Export only verified, allowlisted response observations, never the token,
      // request headers, raw response, unexpected upstream fields or credentials.
      checks.push({test:'status recovery',result:r.status===200?'HTTP_CONFIRMED':'PENDING',state:r.body.state,status:r.status,observedAt:new Date(now()).toISOString(),responseChecks:{success:r.body.success,caseIdPresent:Object.hasOwn(r.body,'caseId'),customerIdPresent:Object.hasOwn(r.body,'customerId'),notificationSent:r.body.notificationSent,technicianFollowupConfirmed:r.body.technicianFollowupConfirmed}});save();return evidence();
    },
    async repeat(){
      need(token&&fixture.caseId,'CONFIRMED_TICKET_REQUIRED');const r=await post('submit',submitBody());verified(r);need(r.body.caseId===fixture.caseId,'DUPLICATE_CASE_CHANGED');checks.push({test:'G04 sequential duplicate HTTP result',result:'ORIGINAL_ID_RETURNED_DATABASE_COUNT_PENDING'});save();return evidence();
    },
    async negatives(){
      need(token,'PREPARE_FIRST');const body=submitBody();
      const forged=await post('submit',{...body,tenantId:'ffffffff-ffff-4fff-8fff-ffffffffffff'});need(forged.status===400&&!forged.body.caseId,'FORGED_IDENTITY_NOT_REJECTED');
      const changed=await post('submit',{...body,intake:{...body.intake,issue:'A different fictional request requiring a different confirmed operation.'}});need(changed.status===409&&!changed.body.caseId,'CHANGED_INTAKE_NOT_REJECTED');
      const tampered=await post('status',{operationToken:'invalid-operation-capability'});need(tampered.status===403&&!tampered.body.caseId,'TAMPERED_CAPABILITY_NOT_REJECTED');
      checks.push({test:'G03 HTTP negatives',result:'EXPECTED_REJECTIONS_OBSERVED',statuses:[forged.status,changed.status,tampered.status]});save();return evidence();
    },
    async missing(){
      need(token,'PREPARE_FIRST');
      // A new begin has no database write; do not submit this capability.
      const r=await post('begin',{confirmed:true,intake:fixture.intake});need(r.status===201,'MISSING_CAPABILITY_NOT_ISSUED');
      const missing=await post('status',{operationToken:r.body.operationToken});need(missing.status===202&&missing.body.state==='UNKNOWN'&&!missing.body.caseId&&!missing.body.success,'MISSING_CASE_FALSE_SUCCESS');checks.push({test:'G06 absent operation HTTP result',result:'UNKNOWN_WITHOUT_TICKET'});save();return evidence();
    },
  };
}
module.exports={createBrowserAcceptance};
