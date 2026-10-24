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
 if(!Array.isArray(rows)||!Number.isFinite(now.getTime()))throw new PmaError('Invalid inventory response',503);
 let invalid=false,stale=false,unavailable=false;
 const units:Record<string,any>[]=[];
 for(const u of rows){
  if(!u||typeof u!=='object'||Array.isArray(u)||!Number.isInteger(u.bedrooms)||u.bedrooms<0||u.bedrooms>30){invalid=true;continue;}
  if(bedrooms!==undefined&&u.bedrooms!==bedrooms)continue;
  const stamp=typeof u.updated_at==='string'?Date.parse(u.updated_at):NaN;
  if(typeof u.label!=='string'||!u.label.trim()||u.label.length>120||!['vacant','occupied','unavailable'].includes(u.status)||!Number.isFinite(stamp)||stamp>now.getTime()){invalid=true;continue;}
  if(stamp<=now.getTime()-AVAILABILITY_MAX_AGE_HOURS*3600000){stale=true;continue;}
  if(u.status!=='vacant'){unavailable=true;continue;}
  try{units.push({unit:u.label,bedrooms:u.bedrooms,bathrooms:u.bathrooms,earliestRecordedDate:sqlDate(u.availability_date),earliestRecordedDateLabel:calendarDate(u.availability_date),recordUpdatedAt:u.updated_at});}catch{invalid=true;}
 }
 const state=units.length?'AVAILABLE':invalid?'INVALID_INVENTORY':stale?'INVENTORY_STALE':unavailable?'UNAVAILABLE_UNITS':'NO_VERIFIED_MATCH';
 const subject=bedrooms===undefined?'apartments':bedrooms===0?'studio apartments':`${bedrooms}-bedroom apartments`;
 const reply=state==='AVAILABLE'?`I found current recorded availability for ${subject} in fictional staging inventory. Recorded dates are not guaranteed move-in dates or bookings.`:state==='INVALID_INVENTORY'?`Some inventory data for ${subject} is missing or invalid, so I cannot verify availability. The property team must check.`:state==='INVENTORY_STALE'?`I found no current verified availability for ${subject}. Some matching inventory records are out of date, so I cannot confirm availability. The property team must check.`:state==='UNAVAILABLE_UNITS'?`The lookup completed. The matching ${subject} in current fictional staging records are marked occupied or unavailable. I found no verified vacancy; the property team can confirm other options.`:`The lookup completed, but I found no verified available ${subject} in the current inventory. This does not establish that none exist; the property team can confirm.`;
 return {success:state!=='INVALID_INVENTORY',state,requestedBedrooms:bedrooms??null,stagingOnly:true,asOf:propertyToday(now),timezone:PROPERTY_TIMEZONE,availabilityMaxAgeHours:AVAILABILITY_MAX_AGE_HOURS,units,requiresHumanReview:units.length===0||invalid||stale,availabilityGuaranteed:false,reply,disclaimer:reply};
}
