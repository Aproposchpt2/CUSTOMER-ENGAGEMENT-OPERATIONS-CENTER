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
export function inventorySnapshot(rows:Record<string,any>[],now=new Date(),bedrooms?:number) {
 if(bedrooms!==undefined&&(!Number.isInteger(bedrooms)||bedrooms<0||bedrooms>30))throw new PmaError('Invalid availability filter');
 const matching=rows.filter(u=>bedrooms===undefined||u.bedrooms===bedrooms);
 const fresh=(u:Record<string,any>)=>{const stamp=Date.parse(u.updated_at);return Number.isFinite(stamp)&&stamp<=now.getTime()&&stamp>now.getTime()-AVAILABILITY_MAX_AGE_HOURS*3600000;};
 const units=matching.filter(u=>u.status==='vacant'&&u.availability_date!=null).flatMap(u=>{
  const stamp=Date.parse(u.updated_at);
  if(!Number.isFinite(stamp)||stamp>now.getTime()||stamp<=now.getTime()-AVAILABILITY_MAX_AGE_HOURS*3600000)return [];
  try{return [{unit:u.label,bedrooms:u.bedrooms,bathrooms:u.bathrooms,earliestRecordedDate:sqlDate(u.availability_date),earliestRecordedDateLabel:calendarDate(u.availability_date),recordUpdatedAt:u.updated_at}];}catch{return [];}
 });
 const state=units.length?'AVAILABLE':matching.some(u=>!fresh(u))?'INVENTORY_STALE':'NO_VERIFIED_MATCH';
 const subject=bedrooms===undefined?'apartments':bedrooms===0?'studio apartments':`${bedrooms}-bedroom apartments`;
 const reply=state==='AVAILABLE'?`I found current recorded availability for ${subject} in fictional staging inventory. Recorded dates are not guaranteed move-in dates or bookings.`:state==='INVENTORY_STALE'?`I found no current verified availability for ${subject}. Some matching inventory records are out of date, so I cannot confirm availability. The property team must check.`:`The lookup completed, but I found no verified available ${subject} in the current inventory. This does not establish that none exist; the property team can confirm.`;
 return {success:true,state,requestedBedrooms:bedrooms??null,stagingOnly:true,asOf:propertyToday(now),timezone:PROPERTY_TIMEZONE,availabilityMaxAgeHours:AVAILABILITY_MAX_AGE_HOURS,units,requiresHumanReview:units.length===0,availabilityGuaranteed:false,reply,disclaimer:reply};
}
