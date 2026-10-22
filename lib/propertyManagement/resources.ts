import {knowledgeValues} from './knowledge';
import { optionalUuid, oneOf, PmaError, text, uuid } from './domain';
export const resources = {
  properties: 'pm_properties', units: 'pm_units', occupancies: 'pm_occupancies', vendors: 'pm_vendors',
  propertyVendors: 'pm_property_vendors', staff: 'pm_property_staff', maintenance: 'pm_maintenance_requests',
  assignments: 'pm_vendor_assignments', activity: 'pm_maintenance_activity', showings: 'pm_showings',
  knowledge: 'ai4cc_knowledge_entries', attachments: 'pm_attachments',
  prospects: 'pm_prospect_interests',
} as const;
export type Resource = keyof typeof resources;
const fields: Record<Resource, string[]> = {
  properties: ['name','address','status','amenities','emergency_instructions','accepts_inquiries'],
  units: ['property_id','label','bedrooms','status'],
  occupancies: ['property_id','unit_id','contact_id','auth_user_id','starts_on','ends_on','status'],
  vendors: ['contact_id','auth_user_id','trade','status'],
  propertyVendors: ['property_id','vendor_id'], staff: ['property_id','user_id','can_write'],
  maintenance: ['property_id','unit_id','contact_id','summary','description','category','priority','idempotency_key','source_channel'],
  assignments: [], activity: [], showings: [], prospects: [],
  knowledge: ['property_id','unit_id','title','content','category','tags','visibility','approved','model_section','model_values','valid_until'], attachments: [],
};
export function resource(value: unknown): Resource {
  if (typeof value !== 'string' || !Object.hasOwn(resources, value)) throw new PmaError('Unknown resource');
  return value as Resource;
}
export function mutation(kind: Resource, input: unknown, update = false): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PmaError('Invalid record');
  const data = input as Record<string, unknown>;
  const allowed = fields[kind];
  if (!allowed.length) throw new PmaError('Use the dedicated workflow action', 405);
  const out: Record<string, unknown> = {};
  for (const [k,v] of Object.entries(data)) {
    if (!allowed.includes(k)) throw new PmaError(`Unsupported field: ${k}`);
    if (update && ['property_id','contact_id','unit_id','idempotency_key'].includes(k)) throw new PmaError('Record scope cannot be changed');
    if (k.endsWith('_id')) out[k] = ['property_id','unit_id','auth_user_id'].includes(k) ? optionalUuid(v,k) : uuid(v,k);
    else if(k==='model_values') out[k]=!data.model_section&&v&&typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length?{}:knowledgeValues(data.model_section,v);
    else if(k==='valid_until') { if(v==null||v==='')out[k]=null;else {const d=text(v,k,40);if(!Number.isFinite(Date.parse(d)))throw new PmaError('Invalid knowledge expiry');out[k]=new Date(d).toISOString();} }
    else if (['can_write','approved','accepts_inquiries'].includes(k)) { if (typeof v !== 'boolean') throw new PmaError(`Invalid ${k}`); out[k]=v; }
    else if (k==='bedrooms') { if (!Number.isInteger(v) || Number(v)<0 || Number(v)>30) throw new PmaError('Invalid bedrooms'); out[k]=v; }
    else if (k==='tags') { if (!Array.isArray(v) || v.length>30) throw new PmaError('Invalid tags'); out[k]=v.map(t=>text(t,'tag',80)); }
    else if (k==='status') out[k]=oneOf(v, kind==='units'?['vacant','occupied','unavailable']:kind==='occupancies'?['active','ended']:['active','inactive'],'status');
    else if (k==='priority') out[k]=oneOf(v,['low','normal','high','emergency'],'priority');
    else if (k==='source_channel') out[k]=oneOf(v,['web','voice','sms','chat'],'channel');
    else if (k==='category' && kind==='maintenance') out[k]=oneOf(v,['plumbing','electrical','hvac','structural','appliance','pest_control','locks','internet','common_area','other'],'category');
    else if (k==='visibility') out[k]=oneOf(v,['public','resident','staff'],'visibility');
    else if (['starts_on','ends_on'].includes(k)) { if (v===null && k==='ends_on') out[k]=null; else { const s=text(v,k,10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s))) throw new PmaError(`Invalid ${k}`); out[k]=s; } }
    else out[k]=text(v,k,k==='content'?16000:k==='description'?8000: ['amenities','emergency_instructions'].includes(k)?4000:500,!['address','description','amenities','emergency_instructions'].includes(k));
  }
  if(kind==='knowledge'){
    if(data.model_section!==undefined)knowledgeValues(data.model_section, data.model_values??{});
    if(data.unit_id&&!data.property_id&&!update)throw new PmaError('Unit knowledge requires a property');
    if(data.category==='pma_template'&&data.approved===true)throw new PmaError('Templates must remain unapproved');
  }
  if (!update) {
    const required: Partial<Record<Resource,string[]>> = {
      properties:['name'], units:['property_id','label'], occupancies:['property_id','unit_id','contact_id'],
      vendors:['contact_id','trade'], propertyVendors:['property_id','vendor_id'], staff:['property_id','user_id'],
      maintenance:['property_id','contact_id','summary','idempotency_key'], knowledge:['title','content'],
    };
    for (const key of required[kind]??[]) if (!out[key]) throw new PmaError(`${key} is required`);
  }
  if (!Object.keys(out).length) throw new PmaError('No changes supplied');
  return out;
}
