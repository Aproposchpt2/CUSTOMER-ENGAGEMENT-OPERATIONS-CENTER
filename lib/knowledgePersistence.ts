import type { NextApiRequest, NextApiResponse } from 'next';
import { fail, pmaSession, privateResponse, result } from '@/lib/propertyManagement/server';
import { mutation } from '@/lib/propertyManagement/resources';
import { optionalUuid, PmaError, uuid } from '@/lib/propertyManagement/domain';

/** Durable implementation for the existing Knowledge Vault API and PMA. */
export async function persistentKnowledge(req:NextApiRequest,res:NextApiResponse) {
  privateResponse(res);
  try {
    const {db,tenantId}=await pmaSession(req);
    const table='ai4cc_knowledge_entries';
    if(req.method==='GET') {
      let query=db.from(table).select('*').eq('tenant_id',tenantId!).order('updated_at',{ascending:false}).limit(1000);
      const p=optionalUuid(req.query.propertyId,'property'); if(p) query=query.eq('property_id',p);
      return res.json(result(await query));
    }
    if(req.query.action==='import') throw new PmaError('Bulk replacement is disabled for the persistent vault; add reviewed entries individually.',409);
    if(req.method==='POST') return res.status(201).json(result(await db.from(table).insert({...mutation('knowledge',req.body),tenant_id:tenantId}).select().single()));
    if(req.method==='PUT') {
      const row=result(await db.from(table).update(mutation('knowledge',req.body.updates,true)).eq('tenant_id',tenantId!).eq('id',uuid(req.body.id)).select().maybeSingle());
      if(!row) throw new PmaError('Knowledge entry not found',404);
      return res.json(row);
    }
    if(req.method==='DELETE') throw new PmaError('Unapprove an entry to withdraw it while preserving history.',409);
    return res.status(405).json({error:'Unsupported method'});
  }catch(e){return fail(res,e);}
}
