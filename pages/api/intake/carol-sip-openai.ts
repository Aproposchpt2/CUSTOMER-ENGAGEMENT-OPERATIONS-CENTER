import type {NextApiRequest,NextApiResponse} from 'next';
import {privateResponse} from '@/lib/propertyManagement/server';
const {createService,signControl}=require('@/twilio-bridge/carol-sip-server.cjs');

async function rawBody(req:NextApiRequest){
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){const part=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=part.length;if(size>65536)throw new Error('PAYLOAD_TOO_LARGE');chunks.push(part);}
 return Buffer.concat(chunks);
}

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{
  const service=createService({env:process.env,log:(event:string)=>console.info(JSON.stringify({event})),dispatchControl:async(binding:Record<string,unknown>)=>{
   const body=JSON.stringify(binding),signature=signControl(body,process.env.PMA_SIP_CONTROL_SECRET);
   const response=await fetch(process.env.PMA_STAGING_BASE_URL+'/.netlify/functions/carol-sip-control-background',{method:'POST',headers:{'content-type':'application/json','x-carol-control-signature':signature},body,signal:AbortSignal.timeout(5000)});
   if(response.status!==202)throw new Error('CONTROL_NOT_ACCEPTED');
  }});
  const result=await service.handle(await rawBody(req),req.headers);return res.status(result.status).json(result.body);
 }catch{console.error(JSON.stringify({event:'sip_webhook_handler_failed'}));return res.status(503).json({error:'SIP setup unavailable'});}
}
export const config={api:{bodyParser:false}};
