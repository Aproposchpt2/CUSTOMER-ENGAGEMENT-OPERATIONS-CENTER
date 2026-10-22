import type {NextApiRequest,NextApiResponse} from 'next';
import {pmaSession,privateResponse,result,fail} from '@/lib/propertyManagement/server';
import {optionalUuid,oneOf,PmaError} from '@/lib/propertyManagement/domain';
import {knowledgeModel,knowledgeTemplate,foundationEntry} from '@/lib/propertyManagement/knowledge';
/** Templates are reference scaffolding, never an automatic publication action. */
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 privateResponse(res);
 try{
  const {db,tenantId,role}=await pmaSession(req);
  if(req.method==='GET')return res.json({model:knowledgeModel});
  if(req.method!=='POST')return res.status(405).json({error:'GET or POST only'});
  if(!['owner','admin'].includes(role??''))throw new PmaError('Owner access required',403);
  const b=req.body??{};
  if(b.action==='foundation'){
   const existing=result(await db.from('ai4cc_knowledge_entries').select('id').eq('tenant_id',tenantId!).eq('category','pma_agent_model_v1').maybeSingle());
   if(existing)return res.json({entry:existing,replayed:true});
   const inserted=await db.from('ai4cc_knowledge_entries').insert({...foundationEntry(),tenant_id:tenantId}).select().single();
   if(inserted.error?.code==='23505')return res.json({replayed:true});
   return res.status(201).json({entry:result(inserted)});
  }
  const section=oneOf(b.section,knowledgeModel.sections.filter(s=>s.fields.length>0&&s.defaultScope!=='platform').map(s=>s.key),'section');
  const p=optionalUuid(b.propertyId,'property'),u=optionalUuid(b.unitId,'unit');
  if(u&&!p)throw new PmaError('Choose a property for unit knowledge');
  // RLS and relational constraints validate the scope again in the database.
  const entry=result(await db.from('ai4cc_knowledge_entries').insert({...knowledgeTemplate(section),tenant_id:tenantId,property_id:p,unit_id:u}).select().single());
  return res.status(201).json({entry});
 }catch(e){return fail(res,e);}
}
