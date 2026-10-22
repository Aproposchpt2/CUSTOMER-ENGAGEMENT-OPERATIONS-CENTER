import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { pmaSession, privateResponse, result, fail } from '@/lib/propertyManagement/server';
import { PmaError, text, uuid } from '@/lib/propertyManagement/domain';
export const config={api:{bodyParser:{sizeLimit:'8mb'}}};

export default async function handler(req:NextApiRequest,res:NextApiResponse) {
  privateResponse(res);
  if(!['GET','POST'].includes(req.method??'')) return res.status(405).json({error:'GET or POST only'});
  try {
    const {db,admin,tenantId}=await pmaSession(req);
    if(req.method==='GET') {
      const file=result(await db.from('pm_attachments').select('*').eq('tenant_id',tenantId!).eq('id',uuid(req.query.id)).single());
      const link=result(await db.storage.from('pma-attachments').createSignedUrl(file.object_path,60,{download:file.file_name}));
      if(!link) throw new PmaError('Unable to create download link',502);
      return res.json({url:link.signedUrl,expiresIn:60});
    }
    const b=req.body??{}, id=uuid(b.requestId);
    const request=result(await db.from('pm_maintenance_requests').select('id,tenant_id,property_id').eq('tenant_id',tenantId!).eq('id',id).single());
    if(!request) throw new PmaError('Request not found',404);
    const encoded=text(b.contentBase64,'attachment',7100000), name=text(b.fileName,'file name',160);
    if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new PmaError('Invalid attachment encoding');
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.length<4||bytes.length>5242880) throw new PmaError('Attachments must be between 4 bytes and 5 MB');
    const mime=bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'?'image/png':bytes.subarray(0,3).toString('hex')==='ffd8ff'?'image/jpeg':null;
    if(!mime) throw new PmaError('Upload a PDF, PNG or JPEG file');
    const fileId=randomUUID(), path=`${tenantId}/${request.property_id}/${id}/${fileId}`;
    const row=result(await db.from('pm_attachments').insert({id:fileId,tenant_id:tenantId,property_id:request.property_id,request_id:id,object_path:path,file_name:name,mime_type:mime,size_bytes:bytes.length}).select().single());
    const uploaded=await admin!.storage.from('pma-attachments').upload(path,bytes,{contentType:mime,upsert:false});
    if(uploaded.error) {
      await admin!.from('pm_attachments').delete().eq('tenant_id',tenantId!).eq('id',fileId);
      throw new PmaError('Attachment upload failed',502);
    }
    return res.status(201).json({attachment:row});
  }catch(e){return fail(res,e);}
}
