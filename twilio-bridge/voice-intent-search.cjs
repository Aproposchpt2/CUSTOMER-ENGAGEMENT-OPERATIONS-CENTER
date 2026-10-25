'use strict';
// STAGING ONLY: a read-only catalog index, not a classifier or authorization grant.
const catalog = require('./voice-agent-catalog.json');
const DOMAIN = Object.freeze({sales:'sales',support:'support'});
const SHARED = new Set(['universal','conversation_control','safety']);
const MAX_RESULT = 12;
function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ') : '';
}
function searchCatalog({profile,query,limit=6}={}) {
  if (!Object.hasOwn(DOMAIN,profile)) return {ok:false,error:'UNAUTHORIZED_PROFILE'};
  if(typeof query !== 'string' || query.length>180 || normalize(query).length<2) return {ok:false,error:'INVALID_QUERY'};
  if(!Number.isInteger(limit)||limit<1||limit>MAX_RESULT) return {ok:false,error:'INVALID_LIMIT'};
  const terms=normalize(query).split(' ').filter(x=>x.length>2);
  const results=catalog.intents.filter(item=>item.group===DOMAIN[profile]||SHARED.has(item.group))
    .map(item=>{
      const name=normalize(item.id);
      const label=normalize(item.definition?.Intent||'');
      const purpose=normalize(item.definition?.['Trigger/Purpose']||'');
      const score=terms.reduce((n,t)=>n+(name.includes(t)?4:0)+(label.includes(t)?3:0)+(purpose.includes(t)?1:0),0);
      return {item,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.item.reference).localeCompare(String(b.item.reference)))
    .slice(0,limit).map(({item})=>({id:item.id,reference:item.reference,group:item.group,
      purpose:item.definition?.['Trigger/Purpose']||'',requiredEntities:item.definition?.['Required Entities']||''}));
  return {ok:true,catalogVersion:catalog.version,profile,results,
    advisory:'Definitions only. Recognition is not authorization; validate entities, consent, policy and tenant before any tool execution.'};
}
module.exports={searchCatalog};
