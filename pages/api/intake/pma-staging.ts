import type {NextApiRequest,NextApiResponse} from 'next';
import {verifyPmaBridge,trustedPmaTurn} from '@/lib/propertyManagement/transport';
import {fail,privateResponse} from '@/lib/propertyManagement/server';
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{verifyPmaBridge(req);return res.json({result:await trustedPmaTurn(req.body,'voice'),productionMessageSent:false});}catch(e){return fail(res,e);}
}
