import catalog from '../../twilio-bridge/pma-intents.cjs';
export const intents = ['leasing_inquiry', 'showing_request', 'maintenance_request', 'maintenance_status', 'policy_question', 'tenant_question', 'vendor_response', 'emergency_event', 'unknown_question'] as const;
export type Intent = typeof intents[number];
export const statuses = ['New', 'Assigned', 'Scheduled', 'In Progress', 'Completed', 'Closed'] as const;
export type MaintenanceStatus = typeof statuses[number];
export class PmaError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function text(value: unknown, name: string, max = 500, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max) throw new PmaError(`Invalid ${name}`);
  return value.trim();
}
export function uuid(value: unknown, name = 'identifier'): string {
  const s = text(value, name, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) throw new PmaError(`Invalid ${name}`);
  return s;
}
export function optionalUuid(value: unknown, name: string): string | null { return value == null || value === '' ? null : uuid(value, name); }
export function oneOf<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (!values.includes(value as T)) throw new PmaError(`Invalid ${name}`);
  return value as T;
}
export function futureTime(value: unknown): string {
  const s = text(value, 'showing time', 80);
  const t = Date.parse(s);
  if (!Number.isFinite(t) || t <= Date.now()) throw new PmaError('Choose a future showing time');
  return new Date(t).toISOString();
}
export function assertTransition(from: string, to: string): void {
  const index = statuses.indexOf(from as MaintenanceStatus);
  if (index < 0 || statuses[index + 1] !== to) throw new PmaError('Invalid maintenance transition', 409);
}
/** Backward-compatible preview plus the complete versioned catalog decision. */
export function classify(input:unknown){
 const msg=text(input,'message',4000),d=catalog.classify(msg);
 const emergency=d.safety_override;
 return {...d,intent:d.legacy as Intent,catalogIntent:d.intent,knowledgeIntent:emergency?'EMERGENCY':d.intent==='UNKNOWN_QUESTION'?'UNKNOWN':d.intent,
 requiresConfirmation:!['greeting','help'].includes(d.action),requiresHumanReview:emergency||['unknown','lease','owner_query','owner_override'].includes(d.action),
 message:emergency?'Move to a safe location and contact local emergency services. For a suspected gas leak, leave the area and contact emergency services or your utility provider from a safe location. I cannot confirm that emergency services have been contacted.':d.requires_clarification?'Which one request would you like help with first?':'Please confirm the property and details so I can help.',
 emergencyServicesContacted:false,vendorArrivalConfirmed:false,issueResolved:false};
}
export function metrics(data: Record<string, Record<string, unknown>[]>) {
  const requests = data.maintenance ?? [];
  return {
    Properties: data.properties?.length ?? 0, Units: data.units?.length ?? 0,
    'Open Requests': requests.filter(r => !['Completed', 'Closed'].includes(String(r.status))).length,
    'Emergency Requests': requests.filter(r => r.priority === 'emergency' && !['Completed', 'Closed'].includes(String(r.status))).length,
    'Vendor Assignments': (data.assignments ?? []).filter(a => ['assigned', 'accepted'].includes(String(a.status))).length,
    Leads: new Set((data.showings ?? []).map(s => s.lead_id).filter(Boolean)).size,
    Showings: (data.showings ?? []).filter(s => ['requested', 'confirmed'].includes(String(s.status))).length,
    Communications: data.communications?.length ?? 0,
  };
}
