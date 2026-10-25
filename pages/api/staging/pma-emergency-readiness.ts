import type {NextApiRequest,NextApiResponse} from 'next';
import {timingSafeEqual} from 'crypto';
import {emergencyRuntimeReadiness} from '@/lib/propertyManagement/emergencyReadiness';
/** GET only; no database client, Twilio client, dispatch or workflow execution. */
export default function handler(req:NextApiRequest,res:NextApiResponse){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const env=process.env;
 if(env.PMA_ENVIRONMENT!=='staging'||env.NEXT_PUBLIC_SUPABASE_URL!=='https://hvzauakkhlivzeqatfqm.supabase.co')return res.status(403).json({error:'Staging only'});
 const key=req.headers['x-test-key'],secret=env.BRIDGE_HMAC_SECRET_STAGING;
 if(typeof key!=='string'||!secret||Buffer.byteLength(key)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(key),Buffer.from(secret)))return res.status(401).json({error:'Unauthorized'});
 return res.status(200).json(emergencyRuntimeReadiness(env));
}
