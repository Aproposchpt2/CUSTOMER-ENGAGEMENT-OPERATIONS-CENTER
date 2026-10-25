'use strict';
// Pure staging Support intelligence projection. This file performs no network, DB writes or dispatch.
// Integration requires a trusted tenant identity from the authenticated server-side call context.
const catalog=require('./support-intent-catalog-v1.json');
const TENANT=catalog.tenant.id;
const dateAllowed=(value,now,after)=>value==null||(typeof value==='string'&&Number.isFinite(Date.parse(value))&&(after?Date.parse(value)>now.getTime():Date.parse(value)<=now.getTime()));
function safeSupportAssets({trustedTenantId,knowledgeEntries=[],now=new Date()}={}){
 if(trustedTenantId!==TENANT)throw Error('SUPPORT_TENANT_BINDING_MISMATCH');
 if(!Array.isArray(knowledgeEntries)||!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('INVALID_KB_INPUT');
 const approved=knowledgeEntries.filter(row=>
  row&&row.tenant_id===TENANT&&row.approved===true&&row.publication_state==='published'&&
  row.visibility==='public'&&row.audience_scope==='public'&&
  ['VERIFIED','DEMO'].includes(row.source_status)&&
  dateAllowed(row.effective_at,now,false)&&
  dateAllowed(row.expires_at,now,true)&&
  dateAllowed(row.valid_until,now,true)&&
  typeof row.content==='string'&&row.content.trim()!==''
 ).map(row=>Object.freeze({id:row.id,title:row.title,category:row.category,content:row.content,
  source_status:row.source_status,scope:row.scope}));
 return Object.freeze({tenantId:TENANT,knowledgeEntries:Object.freeze(approved),intents:catalog.intents});
}
module.exports={safeSupportAssets};
