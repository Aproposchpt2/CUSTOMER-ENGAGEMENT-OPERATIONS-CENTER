import type { NextApiRequest, NextApiResponse } from 'next';
import { pmaSession, privateResponse, result, fail } from '@/lib/propertyManagement/server';
import { resources } from '@/lib/propertyManagement/resources';

export default async function handler(req:NextApiRequest,res:NextApiResponse) {
  privateResponse(res);
  if(req.method!=='GET') return res.status(405).json({error:'GET only'});
  try {
    const {db,admin,tenantId,role}=await pmaSession(req);
    const data:Record<string,unknown>={}, totals:Record<string,number>={};
    await Promise.all(Object.entries(resources).map(async([kind,table])=>{
      const r=await db.from(table).select('*',{count:'exact'}).eq('tenant_id',tenantId!).order('created_at',{ascending:false}).limit(100);
      data[kind]=result(r)??[]; totals[kind]=r.count??0;
    }));
    const counts=result(await db.rpc('pm_dashboard_counts',{t:tenantId}));
    let contactQuery=admin!.from('ai4cc_contacts').select('id,display_name,first_name,last_name,email,phone').eq('tenant_id',tenantId!);
    if(!['owner','admin'].includes(role??'')) {
      const occ=data.occupancies as {contact_id:string}[];
      const shows=data.showings as {contact_id:string}[];
      const ids=Array.from(new Set([...occ,...shows].map(r=>r.contact_id)));
      contactQuery=contactQuery.in('id',ids);
    }
    data.contacts=result(await contactQuery.order('created_at',{ascending:false}).limit(500));
    const notifications=['owner','admin'].includes(role??'') ? result(await admin!.from('automation_tasks').select('id,status,payload,created_at,last_error').eq('tenant_id',tenantId!).eq('task_code','PMA_NOTIFICATION').order('created_at',{ascending:false}).limit(100)) : [];
    return res.json({data,totals,metrics:counts,notifications,role,tenantId,environment:'staging',refreshedAt:new Date().toISOString(),channels:{voice:'adapter acceptance pending',sms:'adapter acceptance pending',chat:'sandbox workflow'}});
  }catch(e){return fail(res,e);}
}
