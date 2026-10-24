import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import {privateResponse,fail} from '@/lib/propertyManagement/server';
import {PmaError} from '@/lib/propertyManagement/domain';

function gate(env:NodeJS.ProcessEnv){
 if(env.PMA_ENVIRONMENT!=='staging')throw new PmaError('Staging only',403);
 if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_URL)throw new PmaError('Storage unavailable',503);
}

async function twilioMessages(accountSid:string,authToken:string,limit=5):Promise<any[]>{
 try{
  const url=`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?Limit=${limit}&Direction=outbound-api`;
  const r=await fetch(url,{headers:{Authorization:'Basic '+Buffer.from(`${accountSid}:${authToken}`).toString('base64')},signal:AbortSignal.timeout(6000)});
  if(!r.ok)return [];
  const data=await r.json();
  return (data.messages||[]).map((m:any)=>({sid:m.sid,to:m.to,from:m.from,status:m.status,body:m.body?.slice(0,120),dateSent:m.date_sent}));
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
  const auth=(req.query.testKey||req.headers['x-test-key']) as string;
  if(!secret||auth!==secret)throw new PmaError('Unauthorized',401);

  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});

  const [{data:incidents},{data:notifPrefs},smsLog]=await Promise.all([
   admin.from('platform_incidents')
    .select('id,incident_key,severity,status,title,summary,service,opened_at,metadata')
    .eq('service','pma-voice-staging')
    .order('created_at',{ascending:false})
    .limit(5),
   admin.from('pm_notification_preferences')
    .select('channel,destination,active,staging_override,event_type')
    .eq('entity_type','property')
    .eq('entity_id',process.env.PMA_STAGING_PROPERTY_ID||'')
    .eq('event_type','emergency_escalation'),
   twilioMessages(process.env.TWILIO_ACCOUNT_SID||'',process.env.TWILIO_AUTH_TOKEN||'',5),
  ]);

  return res.json({
   ts:Date.now(),
   incidents:incidents??[],
   notificationConfig:notifPrefs??[],
   recentSms:smsLog,
  });
 }catch(e){return fail(res,e);}
}
