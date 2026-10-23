import {PmaError} from './domain';
export const PROPERTY_TIMEZONE='America/Los_Angeles';
export const AVAILABILITY_MAX_AGE_HOURS=24;
/** SQL DATE is a calendar label. Never interpret it as a local timestamp. */
export function sqlDate(value:unknown):string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new PmaError('Invalid calendar date');
 const d=new Date(value+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new PmaError('Invalid calendar date');
 return value;
}
export function calendarDate(value:unknown):string {
 return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}).format(new Date(sqlDate(value)+'T12:00:00Z'));
}
export function propertyToday(now=new Date()):string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:PROPERTY_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');
}
export function inventorySnapshot(rows:Record<string,any>[],now=new Date()) {
 const units=rows.filter(u=>u.status==='vacant'&&u.availability_date!=null).flatMap(u=>{
  const stamp=Date.parse(u.updated_at);
  if(!Number.isFinite(stamp)||stamp>now.getTime()||stamp<=now.getTime()-AVAILABILITY_MAX_AGE_HOURS*3600000)return [];
  try{return [{unit:u.label,bedrooms:u.bedrooms,bathrooms:u.bathrooms,earliestRecordedDate:sqlDate(u.availability_date),earliestRecordedDateLabel:calendarDate(u.availability_date),recordUpdatedAt:u.updated_at}];}catch{return [];}
 });
 return {success:true,stagingOnly:true,asOf:propertyToday(now),timezone:PROPERTY_TIMEZONE,availabilityMaxAgeHours:AVAILABILITY_MAX_AGE_HOURS,units,requiresHumanReview:units.length===0,availabilityGuaranteed:false,disclaimer:units.length?'Fictional staging inventory only. Recorded vacancy dates are not tour slots or guaranteed move-in dates.':'No current verified inventory is available. The property team must confirm.'};
}
