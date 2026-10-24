import {PmaError,futureTime} from './domain';
import {sqlDate,propertyToday,PROPERTY_TIMEZONE} from './availability';
/** Natural-language day resolution only. A day is never a bookable slot. */
export function requestedDay(value:unknown,now=new Date()):string {
 if(value==='today')return propertyToday(now);
 if(value==='tomorrow'){
  const d=new Date(propertyToday(now)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
 }
 return sqlDate(value);
}
/** Reject missing offsets and nonexistent local wall times; folds need an explicit offset. */
export function showingInstant(value:unknown,timezone=PROPERTY_TIMEZONE):string {
 const instant=futureTime(value),raw=String(value);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 const part=(k:string)=>parts.find(p=>p.type===k)!.value;
 const wall=`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
 if(wall!==raw.slice(0,16))throw new PmaError('Showing time does not match the property timezone; clarify the local time and offset');
 return instant;
}
export const pmaContractVersion='1.0';
export type TrustedPmaCallScope={tenantId:string;propertyId:string;sessionId:string;callSid:string;actorId:string;contactId:string|null;verifiedResidentUserId:string|null};
// Scope and operation IDs are constructed by the server, never supplied by model entities.
export type ShowingOutcome={contractVersion:'1.0';status:'REQUESTED'|'REQUESTED_ONLY'|'CONFIRMED_SYNTHETIC'|'CONFLICT';persisted:boolean;bookingConfirmed:boolean;showingId?:string;testOnly?:boolean;notificationSent?:false};
