import type {NextApiRequest,NextApiResponse} from 'next';
import {pmaSession,privateResponse,result,fail} from '@/lib/propertyManagement/server';
import {intentArguments} from '@/lib/propertyManagement/intentCatalog';
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 try{const {db,tenantId}=await pmaSession(req),b=req.body??{};
 const prepared=intentArguments(b,{tenantId:tenantId!,propertyId:b.propertyId,contactId:b.contactId,unitId:b.unitId},b.channel);
 return res.json({classification:prepared.classification,result:result(await db.rpc('pm_catalog_turn',prepared.args)),transport:'sandbox',productionMessageSent:false});
 }catch(e){return fail(res,e);}
}
