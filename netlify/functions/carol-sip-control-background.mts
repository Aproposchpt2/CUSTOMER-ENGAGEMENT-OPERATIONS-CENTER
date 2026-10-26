import carolControl from '../../twilio-bridge/carol-sip-server.cjs';
const {createService,verifyControl}=carolControl;

export default async function handler(req:Request){
 const raw=await req.text();
 const binding=verifyControl(raw,req.headers.get('x-carol-control-signature'),process.env.PMA_SIP_CONTROL_SECRET);
 const service=createService({env:process.env,log:(event:string)=>console.log(JSON.stringify({event}))});
 await service.run(binding);
}

export const config={background:true,path:'/api/intake/carol-sip-control'};
