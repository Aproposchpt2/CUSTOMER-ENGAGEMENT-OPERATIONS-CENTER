import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchEmergency} from '../lib/propertyManagement/emergencyDispatch.ts';
const env={PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',TWILIO_ACCOUNT_SID:'ACfake',TWILIO_AUTH_TOKEN:'test',PMA_STAGING_SMS_FROM:'+15550000000'};
const ctx={tenantId:'test',propertyId:'test',callSid:'CA'+'a'.repeat(32),sessionId:'fake',intent:'MAJOR_FLOODING',message:'Staging flood',callerNumber:'+15551231234'};
const prefs=[
  {channel:'sms',destination:'+17753508039'},
  {channel:'sms',destination:'+17253305102'},
  {channel:'sms',destination:'+17027102622'},
  {channel:'sms',destination:'+17029351414'}
];
function rpc(preferences=prefs){return {rpc:async()=>({data:{notify:true,incidentId:'15b7b93f-77ef-41a6-8ed3-5c618df4b6eb',preferences},error:null})};}
test('role-specific dispatch sends independent messages without caller-number leak',async()=>{
  const old=globalThis.fetch;const messages=[];
  globalThis.fetch=async(_url,options)=>{const body=new URLSearchParams(options.body);messages.push({to:body.get('To'),text:body.get('Body')});return {ok:true,status:201};};
  try{
    const output=await dispatchEmergency(ctx,rpc(),env);
    assert.equal(output.dispatched,true);
    assert.equal(output.state,'SUBMITTED');
    assert.equal(messages.length,4);
    assert.deepEqual(output.attempts?.map(a=>a.recipientRole),['owner','vendor','tenant','owner_backup']);
    assert.match(messages[0].text,/Caller: \+15551231234/);
    for(const item of messages.slice(1))assert.doesNotMatch(item.text,/\+15551231234/);
    assert.match(messages[1].text,/Maintenance vendor notification/);
    assert.match(messages[2].text,/Tenant incident notice/);
    assert.match(messages[3].text,/Property owner backup/);
  }finally{globalThis.fetch=old;}
});
test('unapproved recipient never reaches Twilio',async()=>{
  const old=globalThis.fetch;let sends=0;globalThis.fetch=async()=>{sends++;return {ok:true};};
  try{const output=await dispatchEmergency(ctx,rpc([{channel:'sms',destination:'+15559999999'}]),env);
    assert.equal(sends,0);assert.equal(output.dispatched,false);assert.equal(output.attempts?.[0].state,'NOT_CONFIGURED');
  }finally{globalThis.fetch=old;}
});
test('Twilio error is a failure and not a delivered message',async()=>{
  const old=globalThis.fetch;globalThis.fetch=async()=>({ok:false,status:403});
  try{const output=await dispatchEmergency(ctx,rpc([{channel:'sms',destination:'+17253305102'}]),env);
    assert.equal(output.dispatched,false);assert.equal(output.state,'FAILED');assert.equal(output.attempts?.[0].state,'FAILED');
  }finally{globalThis.fetch=old;}
});
test('production mode blocks every SMS submission',async()=>{
  const old=globalThis.fetch;let sends=0;globalThis.fetch=async()=>{sends++;return {ok:true};};
  try{const output=await dispatchEmergency(ctx,rpc(),{...env,PMA_ENVIRONMENT:'production'});
    assert.equal(output.dispatched,false);assert.equal(sends,0);
  }finally{globalThis.fetch=old;}
});
