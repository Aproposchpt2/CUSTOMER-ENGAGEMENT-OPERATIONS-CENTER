import type { NextApiRequest, NextApiResponse } from 'next';
import { pmaSession, privateResponse, result, fail } from '@/lib/propertyManagement/server';
import { mutation, resource, resources } from '@/lib/propertyManagement/resources';
import { optionalUuid, PmaError, uuid } from '@/lib/propertyManagement/domain';

export default async function handler(req: NextApiRequest,res: NextApiResponse) {
  privateResponse(res);
  if (!['GET','POST','PATCH'].includes(req.method??'')) return res.status(405).json({error:'Use GET, POST or PATCH. Archive records to preserve history.'});
  try {
    const {db,tenantId}=await pmaSession(req);
    const kind=resource(req.query.resource);
    const table=resources[kind];
    if (req.method==='GET') {
      const offset=Number(req.query.offset??0);
      if (!Number.isSafeInteger(offset)||offset<0||offset>100000) throw new PmaError('Invalid offset');
      let q=db.from(table).select('*',{count:'exact'}).eq('tenant_id',tenantId!).order('created_at',{ascending:false}).range(offset,offset+99);
      const propertyId=optionalUuid(req.query.propertyId,'property');
      if (propertyId) q=kind==='properties'?q.eq('id',propertyId):kind==='vendors'?q:q.eq('property_id',propertyId);
      const r=await q; result(r);
      return res.json({records:r.data,total:r.count,offset,nextOffset:offset+(r.data?.length??0)<(r.count??0)?offset+100:null});
    }
    const body=req.body??{};
    const record=mutation(kind,body.record,req.method==='PATCH');
    if (req.method==='POST') {
      const r=await db.from(table).insert({...record,tenant_id:tenantId}).select().single();
      if (r.error?.code==='23505' && kind==='maintenance') {
        const old=result(await db.from(table).select('*').eq('tenant_id',tenantId!).eq('idempotency_key',record.idempotency_key).single());
        if (Object.entries(record).some(([k,v])=>v!==old[k])) throw new PmaError('Operation key was already used with different details',409);
        return res.json({record:old,replayed:true});
      }
      return res.status(201).json({record:result(r)});
    }
    const id=uuid(body.id);
    const row=result(await db.from(table).update(record).eq('tenant_id',tenantId!).eq('id',id).select().maybeSingle());
    if (!row) throw new PmaError('Record not found or access denied',404);
    return res.json({record:row});
  } catch(e) { return fail(res,e); }
}
