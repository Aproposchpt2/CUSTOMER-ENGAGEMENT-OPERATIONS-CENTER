import type {NextApiRequest,NextApiResponse} from 'next';
import {verifyPmaTwilio,trustedPmaTurn} from '@/lib/propertyManagement/transport';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
import {text} from '@/lib/propertyManagement/domain';
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).send('POST only');
 try{verifyPmaTwilio(req);await trustedPmaTurn({message:text(req.body.Body,'message',1600),operationKey:text(req.body.MessageSid,'message reference',80)},'sms');res.setHeader('Content-Type','text/xml');return res.send('<?xml version="1.0"?><Response/>');}catch(e){return fail(res,e);}
}
