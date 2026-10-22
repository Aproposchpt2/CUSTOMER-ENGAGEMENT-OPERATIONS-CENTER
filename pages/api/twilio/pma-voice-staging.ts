import type {NextApiRequest,NextApiResponse} from 'next';
import {randomBytes,createHmac} from 'crypto';
import {verifyPmaTwilio} from '@/lib/propertyManagement/transport';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
import {PmaError} from '@/lib/propertyManagement/domain';
export default function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).send('POST only');
 try{
  verifyPmaTwilio(req);
  const secret=process.env.BRIDGE_HMAC_SECRET_STAGING,url=new URL(process.env.PMA_STAGING_BRIDGE_WS_URL??'');
  const allowedHosts=new Set(['stellaruc-voice-bridge-staging-staging.up.railway.app','ai4-pma-bridge-staging.fly.dev']);
  if(!secret||url.protocol!=='wss:'||!allowedHosts.has(url.hostname)||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new PmaError('Staging bridge unavailable',503);
  const data=`pma:${Math.floor(Date.now()/1000)}:${randomBytes(8).toString('hex')}`;
  const token=`${data}:${createHmac('sha256',secret).update(data).digest('hex')}`;
  res.setHeader('Content-Type','text/xml');
  return res.send(`<?xml version="1.0"?><Response><Connect><Stream url="${url.origin}/ws/pma"><Parameter name="bridge_token" value="${token}"/></Stream></Connect><Hangup/></Response>`);
 }catch(e){return fail(res,e);}
}
