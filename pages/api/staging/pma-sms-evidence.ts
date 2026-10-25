import type {NextApiRequest,NextApiResponse} from 'next';
import {timingSafeEqual} from 'crypto';
import {createClient} from '@supabase/supabase-js';
import {smsEvidenceEnabled,recordSmsEvidence} from '@/lib/propertyManagement/stagingSmsEvidence';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
/** Protected read-only projection: no caller text, complete destination or ACK token. */
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='GET')return res.status(405).end();
 if(!smsEvidenceEnabled(process.env))return res.status(503).json({error:'Staging notification evidence disabled'});
 const key=req.headers['x-test-key'],secret=process.env.BRIDGE_HMAC_SECRET_STAGING;
 if(typeof key!=='string'||!secret||Buffer.byteLength(key)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(key),Buffer.from(secret)))return res.status(401).json({error:'Unauthorized'});
 try{const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});return res.status(200).json(await recordSmsEvidence(admin,{op:'inspect'}));}catch(e){return fail(res,e);}
}
