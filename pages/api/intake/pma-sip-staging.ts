import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import {verifyPmaBridge} from '@/lib/propertyManagement/transport';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
import {PmaError} from '@/lib/propertyManagement/domain';
const {processIntake}=require('@/lib/pmaSip/intake.cjs');
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  verifyPmaBridge(req);
  if(process.env.PMA_SIP_ENABLED!=='true'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co'||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new PmaError('SIP staging unavailable',503);
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const tenant=process.env.AI4CC_VOICE_DEMO_TENANT_ID!;
  const rpc=async(name:string,args:Record<string,unknown>)=>{const r=await admin.rpc(name,args);if(r.error)throw new PmaError('SIP persistence unconfirmed',r.error.code==='42501'?403:503);return r.data;};
  const load=async(id:string,incident=false)=>{
   const q=incident?admin.from('pm_maintenance_requests').select('id,tenant_id,property_id,intake_details').eq('intake_details->>voiceSessionId',id).eq('property_id',process.env.PMA_STAGING_PROPERTY_ID!):admin.from('ai4cc_interactions').select('id,tenant_id,metadata,status,started_at,ended_at').eq('id',id);
   const r=await q.eq('tenant_id',tenant).maybeSingle();if(r.error)throw new PmaError('SIP lookup unavailable',503);return r.data;
  };
  const claim=async(id:string,callId:string)=>{
   const prior=await load(id);if(!prior||prior.metadata?.pma_sip_call_id)return false;
   const r=await admin.from('ai4cc_interactions').update({metadata:{...prior.metadata,pma_sip_call_id:callId,pma_sip_claimed_at:new Date().toISOString()}}).eq('id',id).eq('tenant_id',tenant).is('metadata->>pma_sip_call_id',null).select('id');
   if(r.error)throw new PmaError('SIP binding unavailable',503);return r.data?.length===1;
  };
  return res.json({result:await processIntake(req.body,{env:process.env,rpc,claim,load})});
 }catch(e){if(e&&typeof e==='object'&&'status' in e&&!(e instanceof PmaError))return res.status(Number(e.status)).json({error:'SIP operation rejected'});return fail(res,e);}
}
export const config={api:{bodyParser:{sizeLimit:'64kb'}}};
