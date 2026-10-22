import model from '../../twilio-bridge/pma-knowledge-v1.json';
import {PmaError} from './domain';
export const knowledgeModel=model;
export function knowledgeValues(section:unknown,values:unknown):Record<string,string|number|boolean|null>{
 const definition=model.sections.find(s=>s.key===section);
 if(!definition||!values||typeof values!=='object'||Array.isArray(values))throw new PmaError('Choose a known knowledge section and field values');
 const entries=Object.entries(values);
 if(entries.length>60)throw new PmaError('Too many knowledge fields');
 const out:Record<string,string|number|boolean|null>={};
 for(const [key,value] of entries){
  if(!definition.fields.includes(key))throw new PmaError(`Unknown ${definition.title} field: ${key}`);
  if(value!==null&&typeof value!=='string'&&typeof value!=='boolean'&&typeof value!=='number')throw new PmaError('Knowledge values must be text, number, boolean or null');
  if(typeof value==='string'&&value.length>2000)throw new PmaError('Knowledge field is too long');
  if(typeof value==='number'&&!Number.isFinite(value))throw new PmaError('Invalid knowledge number');
  out[key]=value;
 }
 return out;
}
/** Flat dotted field names preserve the supplied hierarchy without executing YAML. */
export function knowledgeTemplate(section:string){
 const definition=model.sections.find(s=>s.key===section);if(!definition)throw new PmaError('Unknown knowledge section');
 return {title:definition.title,category:'pma_template',content:'UNVERIFIED TEMPLATE — supply an owner-reviewed answer before publishing.',model_section:section,model_values:Object.fromEntries(definition.fields.map(k=>[k,null])),visibility:'staff',approved:false};
}
export function foundationEntry(){return {title:'PMA Agent Knowledge Base v1.0',category:'pma_agent_model_v1',content:JSON.stringify(model),model_section:'foundation_mapping',model_values:{},visibility:'staff',approved:false,tags:['pma','canonical','v1.0']};}
