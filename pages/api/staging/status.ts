import type {NextApiRequest,NextApiResponse} from 'next';
const BRIDGE='https://ai4-pma-bridge-staging.fly.dev';
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 res.setHeader('Access-Control-Allow-Origin','*');
 res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
 res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(200).end();
 if(req.method!=='GET')return res.status(405).end();
 const secret=process.env.BRIDGE_HMAC_SECRET_STAGING;
 try{
  const [hRes,dRes]=await Promise.allSettled([
   fetch(`${BRIDGE}/health`,{signal:AbortSignal.timeout(8000)}),
   secret?fetch(`${BRIDGE}/debug`,{headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(8000)}):Promise.reject(new Error('no secret')),
  ]);
  const health=hRes.status==='fulfilled'&&hRes.value.ok?await hRes.value.json():null;
  const debug=dRes.status==='fulfilled'&&(dRes.value as Response).ok?await (dRes.value as Response).json():null;
  return res.json({ts:Date.now(),bridge:{reachable:!!health,health,events:debug?.recentEvents??null,hmacOk:debug?.selfMintValid??null}});
 }catch{
  return res.json({ts:Date.now(),bridge:{reachable:false,health:null,events:null,hmacOk:null}});
 }
}
