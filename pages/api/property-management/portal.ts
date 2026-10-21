import type { NextApiRequest, NextApiResponse } from 'next';
import { pmaSession, privateResponse, result, fail } from '@/lib/propertyManagement/server';
import { classify, oneOf, PmaError, text, uuid } from '@/lib/propertyManagement/domain';

export default async function handler(req:NextApiRequest,res:NextApiResponse) {
  privateResponse(res);
  if(!['GET','POST'].includes(req.method??'')) return res.status(405).json({error:'GET or POST only'});
  try {
    const {db}=await pmaSession(req,true);
    if(req.method==='GET') {
      const data:Record<string,unknown>={};
      for(const table of ['pm_properties','pm_units','pm_occupancies','pm_maintenance_requests','pm_vendor_assignments','pm_maintenance_activity','pm_showings','ai4cc_knowledge_entries']) {
        data[table]=result(await db.from(table).select('*').order('created_at',{ascending:false}).limit(100));
      }
      data.availableProperties=result(await db.rpc('pm_available_properties'));
      data.prospectInterests=result(await db.from('pm_prospect_interests').select('*').limit(100));
      return res.json({data,environment:'staging'});
    }
    const b=req.body??{};
    if(b.action==='prospect_inquiry') return res.status(201).json({inquiry:result(await db.rpc('pm_prospect_inquiry',{p:uuid(b.propertyId),full_name:text(b.name,'name',160),msg:text(b.message,'inquiry',4000),at_time:b.showingAt?new Date(text(b.showingAt,'showing time',80)).toISOString():null}))});
    if(b.action==='vendor_response') return res.json({response:result(await db.rpc('pm_vendor_response',{a_id:uuid(b.assignmentId),response:oneOf(b.response,['accepted','declined','completed'],'response'),n:text(b.notes??'','notes',2000,false)}))});
    if(b.action==='maintenance') {
      const occupancy=result(await db.from('pm_occupancies').select('*').eq('id',uuid(b.occupancyId)).eq('status','active').single());
      const message=text(b.message,'issue',4000), classification=classify(message);
      const request={tenant_id:occupancy.tenant_id,property_id:occupancy.property_id,unit_id:occupancy.unit_id,contact_id:occupancy.contact_id,summary:message.slice(0,500),description:message,category:classification.category,priority:classification.priority,source_channel:'web',idempotency_key:text(b.operationKey,'operation key',200)};
      const r=await db.from('pm_maintenance_requests').insert(request).select().single();
      if(r.error?.code==='23505') {
        const prior=result(await db.from('pm_maintenance_requests').select('*').eq('tenant_id',occupancy.tenant_id).eq('idempotency_key',request.idempotency_key).single());
        if(prior.contact_id!==request.contact_id||prior.description!==message||prior.property_id!==request.property_id||prior.unit_id!==request.unit_id) throw new PmaError('Operation key conflict',409);
        return res.json({request:prior,replayed:true,notificationSent:false});
      }
      return res.status(201).json({request:result(r),classification,notificationSent:false});
    }
    throw new PmaError('Unknown portal action');
  }catch(e){return fail(res,e);}
}
