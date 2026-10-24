import type {NextApiRequest,NextApiResponse} from 'next';
import {randomBytes} from 'crypto';
import {createClient} from '@supabase/supabase-js';
import {dispatchEmergency} from '@/lib/propertyManagement/emergencyDispatch';
import {privateResponse,fail} from '@/lib/propertyManagement/server';
import {PmaError} from '@/lib/propertyManagement/domain';

const SCENARIOS:Record<string,{intent:string;message:string}>={
 gas:{intent:'GAS_EMERGENCY',message:'I smell gas coming from the stove area in my apartment.'},
 fire:{intent:'FIRE_EMERGENCY',message:'There is smoke and I can see flames in the hallway.'},
 flood:{intent:'FLOOD_EMERGENCY',message:'Water is pouring in from the ceiling and flooding my unit.'},
 security:{intent:'SECURITY_EMERGENCY',message:'Someone is trying to break into my apartment right now.'},
 medical:{intent:'PERSONAL_SAFETY_THREAT',message:'My roommate collapsed and is not responding, I cannot breathe.'},
};

function gate(env:NodeJS.ProcessEnv){
 if(env.PMA_ENVIRONMENT!=='staging')throw new PmaError('Staging only',403);
 if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_URL)throw new PmaError('Storage unavailable',503);
 if(env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co')throw new PmaError('Wrong project',503);
}

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type,x-test-key');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  gate(process.env);
  const secret=process.env.BRIDGE_HMAC_SECRET_STAGING;
  const auth=req.headers['x-test-key'];
  if(!secret||auth!==secret)throw new PmaError('Unauthorized',401);

  const scenario=typeof req.body?.scenario==='string'?req.body.scenario.toLowerCase():'gas';
  const sc=SCENARIOS[scenario];
  if(!sc)throw new PmaError(`Unknown scenario. Valid: ${Object.keys(SCENARIOS).join(', ')}`,400);

  const tenantId=process.env.AI4CC_VOICE_DEMO_TENANT_ID!;
  const propertyId=process.env.PMA_STAGING_PROPERTY_ID!;
  if(!/^[0-9a-f-]{36}$/i.test(tenantId)||!/^[0-9a-f-]{36}$/i.test(propertyId))throw new PmaError('Env binding unavailable',503);

  const fakeCallSid='CA'+randomBytes(16).toString('hex');
  const fakeSessionId='00000000-0000-4000-8000-000000000000';

  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const t0=Date.now();
  const receipt=await dispatchEmergency({
   tenantId,propertyId,testMode:true,
   callSid:fakeCallSid,sessionId:fakeSessionId,
   intent:sc.intent,message:sc.message,
   callerNumber:process.env.PMA_STAGING_TEST_CALLER,
  },admin,process.env);

  return res.json({ok:receipt.dispatched,scenario,intent:sc.intent,incidentId:receipt.incidentId,channels:receipt.channels,elapsedMs:Date.now()-t0});
 }catch(e){return fail(res,e);}
}
