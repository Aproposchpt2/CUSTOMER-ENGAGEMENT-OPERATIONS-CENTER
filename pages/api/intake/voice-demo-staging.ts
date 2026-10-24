import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import {validateRequest} from 'twilio';
import {verifyPmaBridge} from '@/lib/propertyManagement/transport';
import {privateResponse,fail,result} from '@/lib/propertyManagement/server';
import {inventorySnapshot} from '@/lib/propertyManagement/availability';
import {PmaError} from '@/lib/propertyManagement/domain';
// The bridge sends the original Twilio signature; validation stays server-side here.
const {processVoiceDemo}=require('@/lib/voiceDemo/gateway.cjs');
export async function executeVoiceDemoBody(body:Record<string,unknown>){
  if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co'||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new PmaError('Staging storage unavailable',503);
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const record=async(args:Record<string,unknown>)=>result(await admin.rpc('stellar_voice_demo_session_staging',{t:process.env.AI4CC_VOICE_DEMO_TENANT_ID,p:process.env.PMA_STAGING_PROPERTY_ID,c:process.env.PMA_STAGING_CONTACT_ID,...args}));
  const knowledge=async(agentRoute:string)=>{
    // PMA public knowledge must be scoped to the configured staging property.
    // Never load resident, staff, unit-private, unreviewed, or draft material into a shared voice prompt.
    if(agentRoute==='property-management-assistant'){
      if(!process.env.PMA_STAGING_PROPERTY_ID)throw new PmaError('Property binding unavailable',503);
      return result(await admin.rpc('pm_public_voice_knowledge_v1',{t:process.env.AI4CC_VOICE_DEMO_TENANT_ID,p:process.env.PMA_STAGING_PROPERTY_ID}))??[];
    }
    const query=admin.from('ai4cc_knowledge_entries')
      .select('id,title,content,tags,approved,publication_state,visibility,source_status,version_num,valid_until,effective_at,expires_at')
      .eq('tenant_id',process.env.AI4CC_VOICE_DEMO_TENANT_ID)
      .is('unit_id',null)
      .eq('approved',true)
      .eq('publication_state','published')
      .eq('visibility','public')
      .eq('source_status','VERIFIED');
    return result(await query.is('property_id',null).contains('tags',['agent:'+agentRoute]).limit(12))??[];
  };
  const availability=async(args:{bedrooms?:number},session:{agentRoute:string})=>{
    if(session.agentRoute!=='property-management-assistant'||!process.env.PMA_STAGING_PROPERTY_ID||!process.env.AI4CC_VOICE_DEMO_TENANT_ID)throw new PmaError('Availability scope unavailable',503);
    const property=result(await admin.from('pm_properties').select('name,status,accepts_inquiries,timezone').eq('tenant_id',process.env.AI4CC_VOICE_DEMO_TENANT_ID).eq('id',process.env.PMA_STAGING_PROPERTY_ID).single());
    if(!property||property.status!=='active'||property.accepts_inquiries!==true||property.timezone!=='America/Los_Angeles')throw new PmaError('Current property inventory unavailable',503);
    const now=new Date();
    let query=admin.from('pm_units').select('label,bedrooms,bathrooms,status,availability_date,updated_at')
      .eq('tenant_id',process.env.AI4CC_VOICE_DEMO_TENANT_ID)
      .eq('property_id',process.env.PMA_STAGING_PROPERTY_ID)
      // Inspect stale/occupied matching rows internally, never expose them as availability.
      // The extra row detects truncation rather than announcing an incomplete negative.
      .order('id',{ascending:true}).limit(201);
    if(args.bedrooms!==undefined)query=query.eq('bedrooms',args.bedrooms);
    const units=result(await query);
    if(!Array.isArray(units))throw new PmaError('Inventory lookup returned invalid data',503);
    if(units.length>200)throw new PmaError('Inventory lookup incomplete; staff review required',503);
    return {...inventorySnapshot(units,now,args.bedrooms),property:property.name};
  };
  const workflow=async(body:{action:string;operation?:string;operationId?:string;args:Record<string,unknown>},session:{call_sid:string;session_id:string})=>{
   const tenant=process.env.AI4CC_VOICE_DEMO_TENANT_ID;
   if(body.action==='sales_submit')return result(await admin.rpc('stellar_voice_demo_sales_submit_staging',{t:tenant,p:process.env.PMA_STAGING_PROPERTY_ID,c:process.env.PMA_STAGING_CONTACT_ID,actor:process.env.PMA_CHANNEL_ACTOR_USER_ID,session_id:session.session_id,payload:body.args}));
   const allowed=new Set(['stellar_orch_lookup_staging','stellar_orch_accept_staging','stellar_orch_transition_staging','stellar_orch_reconcile_case_staging','stellar_create_phone_support_test_intake']);
   if(!body.operation||!allowed.has(body.operation))throw new PmaError('Workflow unavailable',403);
   const args=body.args,expected='phone-staging:'+session.call_sid;
   if(!/^voice:[0-9a-f]{64}$/.test(body.operationId??''))throw new PmaError('Trusted operation binding required',403);
   if(args.p_tenant_id!==undefined&&args.p_tenant_id!==tenant)throw new PmaError('Workflow tenant mismatch',403);
   if(args.p_session_id!==undefined&&args.p_session_id!==expected)throw new PmaError('Workflow session mismatch',403);
   if(args.p_call_id!==undefined&&args.p_call_id!==session.call_sid)throw new PmaError('Workflow call mismatch',403);
   if(body.operation==='stellar_orch_lookup_staging'&&args.p_operation_id!==body.operationId)throw new PmaError('Operation mismatch',403);
   if(body.operation==='stellar_orch_accept_staging'&&args.p_tool_call_id!==body.operationId)throw new PmaError('Operation mismatch',403);
   if(!['stellar_orch_lookup_staging','stellar_orch_accept_staging'].includes(body.operation)){
    const row=result(await admin.rpc('stellar_orch_lookup_staging',{p_tenant_id:tenant,p_operation_id:body.operationId}));
    if(!row?.found||row.tenantId!==tenant||row.sessionId!==expected||(args.p_workflow_id!==undefined&&row.workflowId!==args.p_workflow_id))throw new PmaError('Workflow ownership mismatch',403);
    if(body.operation==='stellar_orch_transition_staging'&&(args.p_from!=='ACCEPTED'||args.p_to!=='RUNNING'||args.p_case_id!==null))throw new PmaError('Unsupported workflow transition',403);
    if(body.operation==='stellar_create_phone_support_test_intake'&&!['RUNNING','UNKNOWN'].includes(row.state))throw new PmaError('Workflow not running',403);
   }
   const outcome=result(await admin.rpc(body.operation,args));
   if(body.operation==='stellar_orch_lookup_staging'&&outcome?.found&&(outcome.tenantId!==tenant||outcome.sessionId!==expected))throw new PmaError('Workflow ownership mismatch',403);
   return outcome;
  };
  try{return await processVoiceDemo(body,{env:process.env,validateRequest,record,knowledge,workflow,availability});}
  catch(e){if(e instanceof Error&&'status' in e)throw new PmaError(e.message,Number(e.status));throw e;}
}
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  verifyPmaBridge(req);
  return res.json({result:await executeVoiceDemoBody(req.body),productionMessageSent:false});
 }catch(e){return fail(res,e);}
}
