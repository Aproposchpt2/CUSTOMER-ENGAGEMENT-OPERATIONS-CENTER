'use strict';
// Startup-only configuration checks. No network, secret output or permission changes.
const GATEWAY='https://pma-validation--ai4cc-staging.netlify.app';
const DATABASE='https://hvzauakkhlivzeqatfqm.supabase.co';
const SALES='5885a020-d363-4c27-910a-c035eda132f5';
const SUPPORT='d7e80001-0000-4000-b000-000000000001';
function validateStagingRuntime(env){
 const staging=env.STELLAR_BRIDGE_STAGING==='true'||env.RAILWAY_ENVIRONMENT_NAME==='staging';
 const specialists=env.SS_STAGING_INTELLIGENCE_ENABLED==='true';
 const writes=env.SS_STAGING_HVAC_WRITES_ENABLED==='true'||env.SS_STAGING_SALES_WRITES_ENABLED==='true';
 if((specialists||writes)&&env.STELLAR_BRIDGE_STAGING!=='true')throw Error('SPECIALIST_EXPLICIT_STAGING_REQUIRED');
 if(writes&&!specialists)throw Error('SPECIALIST_INTELLIGENCE_REQUIRED_FOR_WRITES');
 // The server's ordinary fallback is a business production origin. It is never
 // an acceptable destination for a staging call, even with specialist mode off.
 if(staging&&env.NETLIFY_BASE_URL?.replace(/\/$/,'')!==GATEWAY)throw Error('STAGING_GATEWAY_BINDING_REQUIRED');
 if(staging&&env.PMA_CHANNELS_ENABLED==='true'&&env.PMA_STAGING_BASE_URL!==GATEWAY)throw Error('PMA_STAGING_GATEWAY_BINDING_REQUIRED');
 if(specialists){
  if(env.STAGING_SUPABASE_URL!==DATABASE)throw Error('SPECIALIST_STAGING_DATABASE_REQUIRED');
  if(env.SS_STAGING_SALES_TENANT_ID!==SALES||env.SS_STAGING_SUPPORT_TENANT_ID!==SUPPORT)throw Error('SPECIALIST_TENANT_BINDINGS_REQUIRED');
  if(typeof env.STAGING_SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.STAGING_SUPABASE_SERVICE_ROLE_KEY.trim())throw Error('SPECIALIST_BACKEND_CREDENTIAL_REQUIRED');
 }
 return {staging,specialists};
}
module.exports={validateStagingRuntime};
