'use strict';
// Isolated staging-only KB retrieval, no public approval bypass and no writes.
const STAGING_URL='https://hvzauakkhlivzeqatfqm.supabase.co';
const TENANTS=Object.freeze({sales:'5885a020-d363-4c27-910a-c035eda132f5',support:'d7e80001-0000-4000-b000-000000000001'});
const CATEGORY=Object.freeze({sales:/^(sales_|sales$|stellar_sales_|sales-)/i,support:/^(hvac_|hvac$|support_|support$|safety_|safety$)/i});
function allowed(row,profile,now=new Date()){
  if(!TENANTS[profile]||!row||row.tenant_id!==TENANTS[profile]) return false;
  if(row.approved!==true||row.visibility!=='public'||row.audience_scope!=='public'||row.publication_state!=='published')return false;
  if(!['VERIFIED','DEMO'].includes(row.source_status)) return false;
  if(row.source_status==='DEMO' && profile!=='support')return false;
  if(!CATEGORY[profile].test(row.category||''))return false;
  for(const key of ['effective_at']){
    if(row[key]!=null && (!Number.isFinite(Date.parse(row[key]))||Date.parse(row[key])>now.getTime())) return false;
  }
  for(const key of ['expires_at','valid_until']){
    if(row[key]!=null && (!Number.isFinite(Date.parse(row[key]))||Date.parse(row[key])<=now.getTime()))return false;
  }
  return true;
}
async function searchKnowledge({profile,query,env=process.env,request=fetch,now=new Date()}={}){
  if(!Object.hasOwn(TENANTS,profile)) return {ok:false,error:'INVALID_PROFILE'};
  if(typeof query!=='string'||query.trim().length<3||query.length>160)return {ok:false,error:'INVALID_QUERY'};
  if(env.STELLAR_BRIDGE_STAGING!=='true'||env.STELLAR_STAGING_APPROVED_KB_ENABLED!=='true')return {ok:false,error:'DISABLED'};
  if(env.STAGING_SUPABASE_URL!==STAGING_URL||!env.STAGING_SUPABASE_SERVICE_ROLE_KEY)return {ok:false,error:'STAGING_CONFIG_REJECTED'};
  // No model-controlled tenant or category. Use server-locked tenant and server-side publication constraints.
  const url=new URL(STAGING_URL+'/rest/v1/ai4cc_knowledge_entries');
  url.searchParams.set('select','tenant_id,title,category,content,approved,visibility,audience_scope,publication_state,source_status,effective_at,expires_at,valid_until');
  url.searchParams.set('tenant_id','eq.'+TENANTS[profile]);
  url.searchParams.set('approved','eq.true');
  url.searchParams.set('visibility','eq.public');
  url.searchParams.set('audience_scope','eq.public');
  url.searchParams.set('publication_state','eq.published');
  url.searchParams.set('limit','250');
  let res,rows;
  try {
    res=await request(url.toString(),{headers:{apikey:env.STAGING_SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.STAGING_SUPABASE_SERVICE_ROLE_KEY},signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw Error('KB_FETCH_FAILED');
    rows=await res.json();
  }catch{return {ok:false,error:'KB_UNAVAILABLE'};}
  if(!Array.isArray(rows))return {ok:false,error:'KB_UNAVAILABLE'};
  const terms=query.toLowerCase().match(/[a-z0-9]{3,}/g)||[];
  return {ok:true,profile,tenantId:TENANTS[profile],items:rows.filter(row=>allowed(row,profile,now))
    .map(row=>({row,score:terms.reduce((sum,t)=>sum+(String(row.title).toLowerCase().includes(t)?3:0)+(String(row.content).toLowerCase().includes(t)?1:0),0)}))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4)
    .map(({row})=>({title:row.title,content:String(row.content).slice(0,2400),sourceStatus:row.source_status,category:row.category})),
    note:'Only authorized published knowledge. Empty results require clarification or human review; do not invent facts.'};
}
module.exports={searchKnowledge,allowed,TENANTS};
