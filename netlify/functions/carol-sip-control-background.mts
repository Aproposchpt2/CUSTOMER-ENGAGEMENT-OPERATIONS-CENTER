import carolControl from '../../twilio-bridge/carol-sip-server.cjs';
const {createService,verifyControl}=carolControl;

export default async function handler(req:Request){
 const raw=await req.text();
 const binding=verifyControl(raw,req.headers.get('x-carol-control-signature'),process.env.PMA_SIP_CONTROL_SECRET);
 const service=createService({env:process.env,log:(event:string)=>console.log(JSON.stringify({event}))});
 if(!service.enabled())throw new Error('SIP_STAGING_DISABLED');
 await service.run(binding);
}

// Keep the native function URL distinct from the Next.js API route. Awaiting
// run keeps the sideband alive for the background invocation's full lifetime.
export const config={background:true};
