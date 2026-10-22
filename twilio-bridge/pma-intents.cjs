'use strict';
const config=require('./pma-intent-catalog-v1.json');
const byName=Object.fromEntries(config.intents.map(d=>[d.intent,d]));
const normalize=s=>s.toLowerCase().replace(/[?!.]/g,'').trim();
function validateModel(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['intent','confidence','entities'].includes(k))||!byName[v.intent]||typeof v.confidence!=='number'||!Number.isFinite(v.confidence)||v.confidence<0||v.confidence>1)throw Error('Invalid classification proposal');
 const e=v.entities??{};
 if(!e||typeof e!=='object'||Array.isArray(e)||Object.keys(e).some(k=>!config.modelFields.includes(k)))throw Error('Model cannot supply identity, authority or unknown fields');
 for(const [k,x]of Object.entries(e)){
  if(k==='bedrooms'){if(!Number.isInteger(x)||x<0||x>30)throw Error('Invalid bedrooms');}
  else if(k==='followup_requested'){if(typeof x!=='boolean')throw Error('Invalid follow-up choice');}
  else if(k==='safety_indicators'){if(!Array.isArray(x)||x.length>10||x.some(s=>typeof s!=='string'||s.length>200))throw Error('Invalid safety indicators');}
  else if(typeof x!=='string'||!x.trim()||x.length>2000)throw Error('Invalid model field');
 }
 if(e.category&&!['plumbing','electrical','hvac','structural','appliance','pest_control','locks','internet','common_area','other'].includes(e.category))throw Error('Invalid maintenance category');
 return {intent:v.intent,confidence:v.confidence,entities:e};
}
function classify(message,proposal){
 if(typeof message!=='string'||!message.trim()||message.length>4000)throw Error('Invalid message');
 const exact=config.intents.find(d=>d.examples.some(x=>normalize(x)===normalize(message)));
 const deterministicSafety=(exact?.safety?exact:null)??config.intents.find(d=>d.safety&&new RegExp('\\b(?:'+d.pattern+')\\b','i').test(message));
 // Untrusted malformed model data cannot suppress deterministic safety handling.
 const model=deterministicSafety?null:proposal===undefined?null:validateModel(proposal);
 const safety=deterministicSafety??(model&&byName[model.intent].safety?byName[model.intent]:null);
 const matches=config.intents.filter(d=>!d.safety&&d.action!=='unknown'&&new RegExp(d.pattern,'i').test(message));
 const precedence=['GENERAL_GREETING','HELP_REQUEST','OWNER_OVERRIDE','OWNER_REQUEST','VENDOR_STATUS_UPDATE','VENDOR_RESPONSE','LEASE_QUESTION','PAYMENT_QUESTION','MAINTENANCE_STATUS','MOVE_OUT','MOVE_IN','PET_POLICY','PARKING_QUESTION','APPLICATION_QUESTION','PROPERTY_POLICY','SHOWING_REQUEST','UNIT_AVAILABILITY','MAINTENANCE_REQUEST','LEASING_INQUIRY'];
 let chosen=safety??(model?byName[model.intent]:exact??matches.sort((a,b)=>precedence.indexOf(a.intent)-precedence.indexOf(b.intent))[0])??byName.UNKNOWN_QUESTION;
 let confidence=deterministicSafety?1:model?.confidence??(chosen.action==='unknown'?config.thresholds.unknown:config.thresholds.rule);
 if(!safety&&!model&&!exact&&matches.some(d=>['PET_POLICY','PARKING_QUESTION','MOVE_IN','MOVE_OUT'].includes(d.intent)&&d.intent!==chosen.intent))confidence=config.thresholds.ambiguous;
 if(!safety&&confidence<config.thresholds.medium)chosen=byName.UNKNOWN_QUESTION;
 const entities={topic:message.slice(0,2000),description:message.slice(0,2000),...(model?.entities??{})};
 const category=/leak|water|pipe|clog|flood/i.test(message)?'plumbing':/spark|electric|outlet|wire/i.test(message)?'electrical':/heat|cool|hvac|air condition|\bac\b/i.test(message)?'hvac':/pest|roach|rodent/i.test(message)?'pest_control':/locked|lock broken/i.test(message)?'locks':/internet|wifi/i.test(message)?'internet':/common area/i.test(message)?'common_area':/structur|ceiling/i.test(message)?'structural':'other';
 if(!entities.category)entities.category=category;
 if(entities.bedrooms===undefined){const m=message.match(/\b(\d{1,2})[ -]?(?:bedrooms?|beds?|br)\b/i);if(m&&+m[1]<=30)entities.bedrooms=+m[1];}
 if(!entities.move_date){const m=message.match(/\b(\d{4}-\d{2}-\d{2})\b/);if(m&&Number.isFinite(Date.parse(m[1]))&&new Date(m[1]).toISOString().slice(0,10)===m[1])entities.move_date=m[1];}
 if(!entities.impact){const match=message.match(/not working|broken|no heat|no cooling|clogged|leaking|locked out|internet down/i);if(match)entities.impact=match[0];}
 if(!entities.safety_indicators)entities.safety_indicators=safety?[chosen.intent]:[];
 if(entities.followup_requested===undefined)entities.followup_requested=/contact me|follow.up|call me|reach me/i.test(message);
 if(!entities.response){if(/i can take the job|\baccept\b/i.test(message))entities.response='accepted';else if(/\bdecline\b/i.test(message))entities.response='declined';else if(/more information/i.test(message))entities.response='information_requested';}
 if(!entities.vendor_status){if(/repair is complete|work.*complete|vendor.*completed/i.test(message))entities.vendor_status='completed';else if(/work has started/i.test(message))entities.vendor_status='in_progress';}
 return {intent:chosen.intent,legacy:chosen.legacy,agent:chosen.agent,workflow:chosen.workflow,action:chosen.action,confidence,confidence_source:deterministicSafety?'deterministic_safety':model?'model_proposal':'deterministic_rules',entities,safety_override:!!safety,requires_clarification:!safety&&confidence>=config.thresholds.medium&&confidence<config.thresholds.high,catalog_version:config.version,priority:safety?'emergency':'normal',category:entities.category};
}
module.exports={config,byName,validateModel,classify};
