/** Configuration-only diagnostics. This module never invokes a workflow or a transport. */
export function emergencyRuntimeReadiness(env:NodeJS.ProcessEnv){
 const requiredFlags=['PMA_CHANNELS_ENABLED','PMA_VOICE_INTEGRATION_ENABLED','VOICE_DEMO_IVR_ENABLED','VOICE_DEMO_WORKFLOWS_ENABLED','VOICE_DEMO_REUSABLE_DIDS_ENABLED'];
 const checks:Record<string,boolean>={
  stagingEnvironment:env.PMA_ENVIRONMENT==='staging',
  stagingProject:env.NEXT_PUBLIC_SUPABASE_URL==='https://hvzauakkhlivzeqatfqm.supabase.co',
  stagingTenant:env.AI4CC_VOICE_DEMO_TENANT_ID==='5885a020-d363-4c27-910a-c035eda132f5',
  stagingProperty:env.PMA_STAGING_PROPERTY_ID==='eead9ac5-b28b-4594-b75b-a9e9bbbd111f',
  bridgeTarget:env.PMA_STAGING_BASE_URL==='https://pma-validation--ai4cc-staging.netlify.app',
  smsSender:env.PMA_STAGING_SMS_FROM==='+17252010584',
 };
 for(const name of requiredFlags)checks[name]=env[name]==='true';
 for(const name of ['SUPABASE_SERVICE_ROLE_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','BRIDGE_HMAC_SECRET_STAGING'])checks[name+'Present']=!!env[name];
 return {
  scope:'configuration-only',configurationReady:Object.values(checks).every(Boolean),checks,
  blockers:Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name),
  revision:env.COMMIT_REF||null,deployId:env.DEPLOY_ID||null,context:env.CONTEXT||null,
  releaseDecision:'NOT_EVALUATED',liveSmsAttempted:false,
 };
}
