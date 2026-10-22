import {intentDecision} from '@/lib/propertyManagement/intentCatalog';
import type { NextApiRequest, NextApiResponse } from 'next';
import { pmaSession, privateResponse, result, fail } from '@/lib/propertyManagement/server';
import { assertTransition, classify, futureTime, oneOf, optionalUuid, PmaError, statuses, text, uuid } from '@/lib/propertyManagement/domain';

export default async function handler(req:NextApiRequest,res:NextApiResponse) {
  privateResponse(res);
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try {
    const {db,tenantId,role,admin,userId}=await pmaSession(req);
    const b=req.body??{};
    if(b.action==='convert') {
      if(b.humanApproved!==true) throw new PmaError('Confirm that an authorized person approved the move-in');
      const start=text(b.startsOn,'move-in date',10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))) throw new PmaError('Invalid move-in date');
      return res.json({conversion:result(await db.rpc('pm_convert_prospect',{t:tenantId,p:uuid(b.propertyId),l:uuid(b.leadId),u:uuid(b.unitId),start_date:start}))});
    }
    if(b.action==='showing_status') {
      const id=uuid(b.showingId), status=oneOf(b.status,['confirmed','completed','cancelled'],'showing status');
      const current=result(await db.from('pm_showings').select('*').eq('tenant_id',tenantId!).eq('id',id).single());
      if(!current || !(['requested','confirmed'].includes(current.status)) || (status==='completed'&&current.status!=='confirmed')) throw new PmaError('Invalid showing transition',409);
      const updated=result(await db.from('pm_showings').update({status}).eq('tenant_id',tenantId!).eq('id',id).eq('status',current.status).select().maybeSingle());
      if(!updated)throw new PmaError('Showing changed; refresh and retry',409);
      return res.json({showing:updated});
    }
    if(b.action==='classify') return res.json({classification:intentDecision(b.message,b.modelOutput),persisted:false});
    if(b.action==='assign') return res.json({assignment:result(await db.rpc('pm_assign_vendor',{t:tenantId,p:uuid(b.propertyId),r:uuid(b.requestId),v:uuid(b.vendorId)})),notificationSent:false});
    if(b.action==='showing') return res.status(201).json({showing:result(await db.rpc('pm_request_showing',{t:tenantId,p:uuid(b.propertyId),u:optionalUuid(b.unitId,'unit'),c:uuid(b.contactId),at_time:futureTime(b.requestedAt),n:text(b.notes??'','notes',4000,false),k:text(b.operationKey,'operation key',200)})),availabilityGuaranteed:false});
    if(b.action==='transition') {
      const id=uuid(b.requestId), version=Number(b.version);
      if(!Number.isInteger(version)||version<1) throw new PmaError('Request version is required');
      const current=result(await db.from('pm_maintenance_requests').select('*').eq('tenant_id',tenantId!).eq('id',id).single());
      const status=oneOf(b.status,statuses,'status'); assertTransition(current.status,status);
      const update:Record<string,unknown>={status};
      if(status==='Scheduled') update.scheduled_at=futureTime(b.scheduledAt);
      if(status==='Completed') update.resolution=text(b.resolution,'completion details',4000);
      const saved=result(await db.from('pm_maintenance_requests').update(update).eq('tenant_id',tenantId!).eq('id',id).eq('version',version).select().maybeSingle());
      if(!saved) throw new PmaError('This request changed. Refresh before trying again.',409);
      return res.json({request:saved,notificationSent:false});
    }
    if(b.action==='contact') {
      if(!['owner','admin'].includes(role??'')) throw new PmaError('Owner or admin access required',403);
      const name=text(b.name,'contact name',160), email=text(b.email??'','email',254,false), phone=text(b.phone??'','phone',30,false);
      if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PmaError('Invalid email');
      if(phone&&!/^\+[1-9]\d{6,14}$/.test(phone)) throw new PmaError('Use an international phone number');
      return res.status(201).json({contact:result(await db.from('ai4cc_contacts').insert({tenant_id:tenantId,display_name:name,email:email||null,phone:phone||null,lead_source:'pma',metadata:{source:'pma',synthetic:true}}).select('id,display_name,email,phone').single())});
    }
    if(b.action==='notification_test') {
      if(!['owner','admin'].includes(role??'')) throw new PmaError('Owner or admin access required',403);
      // Existing automation service: record a synthetic delivery, never invoke a provider.
      return res.json({result:result(await admin!.rpc('pm_test_notification',{t:tenantId,task:uuid(b.taskId),actor:userId})),notificationSent:false});
    }
    throw new PmaError('Unknown workflow action');
  } catch(e) {return fail(res,e);}
}
