'use strict';
function failedAvailability(state='LOOKUP_FAILED'){return {success:false,state,units:[],requiresHumanReview:true,availabilityGuaranteed:false,reply:state==='INVALID_FILTER'?'Please clarify the bedroom count, or say any size. Availability has not been checked.':state==='INVALID_INVENTORY'?'Some inventory data is missing or invalid, so I cannot verify availability. The property team must check.':'The availability lookup could not be verified. I do not know whether a matching apartment is available. The property team must check.'};}
// Defense in depth: an old deployment or malformed upstream must not advertise a unit.
function verifiedAvailability(data,bedrooms,now=Date.now()){
 if(!data||data.stagingOnly!==true||data.requestedBedrooms!==(bedrooms??null)||data.availabilityMaxAgeHours!==24||!Array.isArray(data.units))return failedAvailability();
 if(data.state==='INVALID_INVENTORY'&&data.success===false&&data.units.length===0)return failedAvailability('INVALID_INVENTORY');
 if(data.success!==true||!['AVAILABLE','NO_VERIFIED_MATCH','INVENTORY_STALE','UNAVAILABLE_UNITS'].includes(data.state))return failedAvailability();
 if((data.state==='AVAILABLE')!==(data.units.length>0))return failedAvailability();
 for(const u of data.units){
  const stamp=Date.parse(u?.recordUpdatedAt),date=u?.earliestRecordedDate;
  if(!u||typeof u.unit!=='string'||!u.unit.trim()||u.unit.length>120||typeof u.recordUpdatedAt!=='string'||!Number.isInteger(u.bedrooms)||u.bedrooms<0||u.bedrooms>30||(bedrooms!==undefined&&u.bedrooms!==bedrooms)||!Number.isFinite(stamp)||stamp>now||stamp<=now-86400000||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return failedAvailability();
  const parsed=new Date(date+'T12:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return failedAvailability();
 }
 // Generate speech locally; never relay a contradictory free-form upstream reply.
 const subject=bedrooms===undefined?'apartments':bedrooms===0?'studio apartments':`${bedrooms}-bedroom apartments`;
 const reply=data.state==='AVAILABLE'?`I found current recorded availability for ${subject} in fictional staging inventory. Recorded dates are not guaranteed move-in dates or bookings.`:data.state==='INVENTORY_STALE'?`I found no current verified availability for ${subject}. Some matching records are out of date, so I cannot confirm availability. The property team must check.`:data.state==='UNAVAILABLE_UNITS'?`The lookup completed. The matching ${subject} in current fictional staging records are marked occupied or unavailable. I found no verified vacancy; the property team can confirm other options.`:`The lookup completed, but I found no verified available ${subject} in the current inventory. This does not establish that none exist; the property team can confirm.`;
 return {success:true,state:data.state,stagingOnly:true,requestedBedrooms:bedrooms??null,units:data.units.map(u=>({unit:u.unit,bedrooms:u.bedrooms,earliestRecordedDate:u.earliestRecordedDate,recordUpdatedAt:u.recordUpdatedAt})),availabilityMaxAgeHours:24,requiresHumanReview:data.units.length===0,availabilityGuaranteed:false,reply};
}
module.exports={failedAvailability,verifiedAvailability};
