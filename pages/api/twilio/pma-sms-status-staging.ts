import type {NextApiRequest,NextApiResponse} from 'next';
import {createClient} from '@supabase/supabase-js';
import {stagingSmsEvent,recordSmsEvidence} from '@/lib/propertyManagement/stagingSmsEvidence';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).end();
 try{const payload=stagingSmsEvent(req,'status',process.env);const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});await recordSmsEvidence(admin,payload);return res.status(200).end();}catch(e){return fail(res,e);}
}
