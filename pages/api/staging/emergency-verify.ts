import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import twilio from 'twilio';
import {privateResponse,fail} from '@/lib/propertyManagement/server';
import {PmaError} from '@/lib/propertyManagement/domain';

function gate(env:NodeJS.ProcessEnv){
 if(env.PMA_ENVIRONMENT!=='staging')throw new PmaError('Staging only',403);
 if(env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co')throw new PmaError('Wrong project',503);
 if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_URL)throw new PmaError('Storage unavailable',503);
}

async function twilioMessages(accountSid:string,authToken:string,limit=5):Promise<any[]>{
 try{
  const messages=await twilio(accountSid,authToken,{timeout:6000}).messages.list({to:'+17753508039',limit});
  return messages.map(m=>({sid:m.sid,to:m.to,from:m.from,status:m.status,dateSent:m.dateSent}));
 }catch{return [];}
}

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type,x-test-key');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 try{
  gate(process.env);
  const secret=process.env.BRIDGE_HMAC_SECRET_STAGING;
  const auth=req.headers['x-test-key'];
  if(!secret||auth!==secret)throw new PmaError('Unauthorized',401);

  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});

  const prepared=await admin.rpc('pm_staging_emergency_verify_v1',{
   t:process.env.AI4CC_VOICE_DEMO_TENANT_ID,p:process.env.PMA_STAGING_PROPERTY_ID,
  });
  if(prepared.error)throw new PmaError('Staging emergency verification unavailable',503);
  const incidents=prepared.data?.incidents??[],notifPrefs=prepared.data?.notificationConfig??[];
  const smsLog=await twilioMessages(process.env.TWILIO_ACCOUNT_SID||'',process.env.TWILIO_AUTH_TOKEN||'',5);

  return res.json({
   ts:Date.now(),
   incidents:incidents??[],
   notificationConfig:notifPrefs??[],
   recentSms:smsLog,
  });
 }catch(e){return fail(res,e);}
}
