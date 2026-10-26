import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import {verifyPmaBridge} from '@/lib/propertyManagement/transport';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
import {PmaError} from '@/lib/propertyManagement/domain';

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  verifyPmaBridge(req);
  if(process.env.PMA_VOICE_INTEGRATION_ENABLED!=='true'||process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co'||!process.env.SUPABASE_SERVICE_ROLE_KEY)
   throw new PmaError('Staging transcript storage unavailable',503);
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['call_sid','session_id','agentRoute','transcript'].includes(k))||body.agentRoute!=='property-management-assistant')
   throw new PmaError('Invalid transcript request');
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.rpc('pma_voice_transcript_save_v1',{
   t:process.env.AI4CC_VOICE_DEMO_TENANT_ID,p:process.env.PMA_STAGING_PROPERTY_ID,
   session_id:body.session_id,call_sid:body.call_sid,transcript:body.transcript
  });
  if(error){if(error.code==='42501')throw new PmaError('Active authorized PMA session required',403);throw new PmaError('Staging transcript could not be saved',500);}
  return res.json({result:data});
 }catch(error){return fail(res,error);}
}
