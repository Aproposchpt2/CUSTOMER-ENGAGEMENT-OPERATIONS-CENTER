'use strict';
// Pure staging Support intelligence projection. This file performs no network, DB writes or dispatch.
// Integration requires a trusted tenant identity from the authenticated server-side call context.
const catalog=require('./support-intent-catalog-v1.json');
const TENANT=catalog.tenant.id;
function safeSupportAssets({trustedTenantId,knowledgeEntries=[],now=new Date()}={}){
 if(trustedTenantId!==TENANT)throw Error('SUPPORT_TENANT_BINDING_MISMATCH');
 if(!Array.isArray(knowledgeEntries)||!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('INVALID_KB_INPUT');
 const approved=knowledgeEntries.filter(row=>
  row&&row.tenant_id===TENANT&&row.approved===true&&row.publication_state==='published'&&
  ['VERIFIED','DEMO'].includes(row.source_status)&&
  (row.effective_at==null||new Date(row.effective_at)<=now)&&
  (row.expires_at==null||new Date(row.expires_at)>now)&&
  (row.valid_until==null||new Date(row.valid_until)>now)&&
  typeof row.content==='string'&&row.content.trim()!==''
 ).map(row=>Object.freeze({id:row.id,title:row.title,category:row.category,content:row.content,
  source_status:row.source_status,scope:row.scope}));
 return Object.freeze({tenantId:TENANT,knowledgeEntries:Object.freeze(approved),intents:catalog.intents});
}
module.exports={safeSupportAssets};
