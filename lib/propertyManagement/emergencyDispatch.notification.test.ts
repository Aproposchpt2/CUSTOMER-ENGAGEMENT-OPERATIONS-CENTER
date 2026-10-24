import {describe,it,expect,vi,afterEach} from 'vitest';
import {dispatchEmergency} from '../emergencyDispatch';
const env={PMA_ENVIRONMENT:'staging',NEXT_PUBLIC_SUPABASE_URL:'https://hvzauakkhlivzeqatfqm.supabase.co',TWILIO_ACCOUNT_SID:'AC'+'0'.repeat(32),TWILIO_AUTH_TOKEN:'synthetic',PMA_STAGING_SMS_FROM:'+15555550100'} as NodeJS.ProcessEnv;
const ctx={tenantId:'11111111-1111-4111-8111-111111111111',propertyId:'22222222-2222-4222-8222-222222222222',callSid:'CA'+'a'.repeat(32),sessionId:'33333333-3333-4333-8333-333333333333',intent:'SUSPECTED_GAS_LEAK',message:'I smell gas',testMode:true};
const db=(preferences:any[],notify=true)=>({rpc:vi.fn().mockResolvedValue({data:{incidentId:'44444444-4444-4444-8444-444444444444',notify,preferences},error:null})});
afterEach(()=>vi.restoreAllMocks());
describe('PMA staging notification evidence',()=>{
 it('records submitted SMS only, without claiming delivery',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:201}));
  const r=await dispatchEmergency(ctx,db([{channel:'sms',destination:'+15555550123'}]),env);
  expect(r.state).toBe('SUBMITTED');
  expect(r.dispatched).toBe(true);
  expect(r.attempts).toEqual([{channel:'sms',state:'SUBMITTED',destinationSuffix:'0123'}]);
  expect(JSON.stringify(r)).not.toMatch(/DELIVERED|ACCEPTED/);
  vi.unstubAllGlobals();
 });
 it('surfaces provider failure without leaking destination or claiming success',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:500}));
  const r=await dispatchEmergency(ctx,db([{channel:'sms',destination:'+15555550123'}]),env);
  expect(r.dispatched).toBe(false);
  expect(r.state).toBe('FAILED');
  expect(r.attempts?.[0].state).toBe('FAILED');
  expect(r.channels).toEqual([]);
  vi.unstubAllGlobals();
 });
 it('does not represent an unconfigured email as sent',async()=>{
  const r=await dispatchEmergency(ctx,db([{channel:'email',destination:'test@example.invalid'}]),env);
  expect(r.dispatched).toBe(false);
  expect(r.channels).toEqual([]);
  expect(r.attempts).toEqual([{channel:'email',state:'NOT_CONFIGURED'}]);
 });
});
