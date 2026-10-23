import type {NextApiRequest,NextApiResponse} from 'next';
import {verifyPmaBridge} from '@/lib/propertyManagement/transport';
import {createClient} from '@supabase/supabase-js';
import {executePmaVoice} from '@/lib/propertyManagement/voiceOrchestration';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{verifyPmaBridge(req);const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});return res.json({result:await executePmaVoice(req.body,admin),productionMessageSent:false});}catch(e){return fail(res,e);}
}
