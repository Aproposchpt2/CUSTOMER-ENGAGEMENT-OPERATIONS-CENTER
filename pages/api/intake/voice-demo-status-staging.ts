import type {NextApiRequest,NextApiResponse} from 'next';
import {executeVoiceDemoBody} from './voice-demo-staging';
import {privateResponse,fail} from '@/lib/propertyManagement/server';
// Independent of Fly availability; the shared core verifies the provider signature,
// fixed callback URL, account and existing synthetic session before updating its end.
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).send('POST only');
 try{
  await executeVoiceDemoBody({action:'gateway_status',originalPath:'/api/intake/voice-demo-status-staging',twilioSignature:req.headers['x-twilio-signature'],params:req.body});
  return res.status(204).end();
 }catch(e){return fail(res,e);}
}
