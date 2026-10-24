import {intentArguments} from '@/lib/propertyManagement/intentCatalog';
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
    if(b.action==='vendor_response') {
      const assignment=result(await db.from('pm_vendor_assignments').select('*').eq('id',uuid(b.assignmentId)).single());
      const vendor=result(await db.from('pm_vendors').select('contact_id').eq('tenant_id',assignment.tenant_id).eq('id',assignment.vendor_id).single());
      if(!vendor)throw new PmaError('Vendor unavailable',403);
      const response=oneOf(b.response,['accepted','declined','completed'],'response'), notes=text(b.notes??'','notes',2000,false);
      const isCompletion=response==='completed';
      const prepared=intentArguments({message:`Vendor ${response}: ${notes}`,confirmed:true,operationKey:b.operationKey??`vendor:${assignment.id}:${response}`,modelOutput:{intent:isCompletion?'VENDOR_STATUS_UPDATE':'VENDOR_RESPONSE',confidence:1,entities:isCompletion?{vendor_status:'completed'}:{response}},workflowData:{assignmentId:assignment.id,...(isCompletion?{status:'completed'}:{response})}},{tenantId:assignment.tenant_id,propertyId:assignment.property_id,contactId:vendor.contact_id},'chat');
      return res.json({response:result(await db.rpc('pm_catalog_turn',prepared.args))});
    }
    if(b.action==='maintenance'||b.action==='catalog') {
      const occupancy=result(await db.from('pm_occupancies').select('*').eq('id',uuid(b.occupancyId)).eq('status','active').single());
      const prepared=intentArguments({...b,confirmed:true},{tenantId:occupancy.tenant_id,propertyId:occupancy.property_id,contactId:occupancy.contact_id,unitId:occupancy.unit_id},'chat');
      return res.json({result:result(await db.rpc('pm_catalog_turn',prepared.args)),classification:prepared.classification,notificationSent:false});
    }
    throw new PmaError('Unknown portal action');
  }catch(e){return fail(res,e);}
}
