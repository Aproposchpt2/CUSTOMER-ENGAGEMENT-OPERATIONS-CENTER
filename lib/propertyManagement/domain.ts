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
/** Conservative deterministic classifier. Uncertain requests require clarification.
 * This is a structured baseline; it does not claim model-based classification acceptance. */
export function classify(input: unknown) {
  const message = text(input, 'message', 4000);
  const s = message.toLowerCase();
  const emergency = /\b(fire|smoke|gas leak|smell gas|security threat|sparking|electrical hazard|flooding|structural threat|ceiling collaps\w*)\b/.test(s);
  let intent: Intent = emergency ? 'emergency_event' : 'unknown_question';
  if (!emergency) {
    if (/\b(repair|maintenance|request|ticket)\b.*\b(status|update|progress)\b|\b(status|update)\b.*\b(repair|request|ticket)\b/.test(s)) intent = 'maintenance_status';
    else if (/\b(leak|broken|not working|repair|maintenance|no heat|no cooling|clogged|pest|pests|locked out|lock broken|internet down)\b/.test(s)) intent = 'maintenance_request';
    else if (/\b(showing|tour|visit the (unit|property))\b/.test(s)) intent = 'showing_request';
    else if (/\b(available|availability|bedroom|lease|leasing|rent an? |amenities)\b/.test(s)) intent = 'leasing_inquiry';
    else if (/\b(policy|policies|pets|move.in|move.out|parking|quiet hours)\b/.test(s)) intent = 'policy_question';
    else if (/\b(vendor|contractor)\b.*\b(accept|decline|completed)\b/.test(s)) intent = 'vendor_response';
    else if (/\b(tenant|resident)\b/.test(s)) intent = 'tenant_question';
  }
  const category = /\b(pest|pests|roach|roaches|rodent)\b/.test(s) ? 'pest_control' : /\b(lock|locks|locked out)\b/.test(s) ? 'locks' : /\b(internet|wifi)\b/.test(s) ? 'internet' : /\b(common area)\b/.test(s) ? 'common_area' : /\b(leak|plumbing|water|clogged|flooding)\b/.test(s) ? 'plumbing' : /\b(electric|sparking|outlet)\b/.test(s) ? 'electrical' : /\b(heat|cooling|hvac|air condition)\b/.test(s) ? 'hvac' : /\b(structur|ceiling)\w*/.test(s) ? 'structural' : 'other';
  const knowledgeIntent = emergency ? 'EMERGENCY' : intent==='showing_request' ? 'SHOWING_REQUEST' : intent==='maintenance_status' ? 'MAINTENANCE_STATUS' : intent==='maintenance_request' ? 'MAINTENANCE_REQUEST' : /\b(application|apply|applying)\b/.test(s) ? 'APPLICATION_QUESTION' : /\b(pet|pets|service animal)\b/.test(s) ? 'PET_POLICY' : /\b(parking|permit|towed)\b/.test(s) ? 'PARKING_QUESTION' : /move.in/.test(s) ? 'MOVE_IN' : /move.out/.test(s) ? 'MOVE_OUT' : intent==='policy_question' ? 'PROPERTY_POLICY' : intent==='leasing_inquiry' ? 'LEASING_INQUIRY' : intent==='vendor_response' ? 'VENDOR_RESPONSE' : /\b(owner)\b/.test(s) ? 'OWNER_REQUEST' : 'UNKNOWN';
  if(['APPLICATION_QUESTION','PET_POLICY','PARKING_QUESTION','MOVE_IN','MOVE_OUT'].includes(knowledgeIntent)) intent='policy_question';
  return { intent, knowledgeIntent, category, priority: emergency ? 'emergency' : 'normal', requiresConfirmation: true, requiresHumanReview: intent === 'unknown_question' || emergency,
    message: emergency ? 'If you are in immediate danger, move to a safe location and contact local emergency services. For a suspected gas leak, leave the area and contact emergency services or your gas utility from a safe location. I cannot confirm that emergency services have been contacted.' : intent === 'unknown_question' ? 'Please describe what you need help with and identify the property.' : 'Please confirm the property and details so I can record the request.',
    emergencyServicesContacted: false, vendorArrivalConfirmed: false, issueResolved: false };
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
