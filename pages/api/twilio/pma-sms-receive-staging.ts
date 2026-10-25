import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import {stagingSmsEvent,recordSmsEvidence} from '@/lib/propertyManagement/stagingSmsEvidence';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
/** Records a signed owned-number test message; deliberately emits no reply SMS. */
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).end();
 try{const payload=stagingSmsEvent(req,'receive',process.env);const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});await recordSmsEvidence(admin,payload);res.setHeader('Content-Type','text/xml');return res.status(200).send('<?xml version="1.0"?><Response/>');}catch(e){return fail(res,e);}
}
