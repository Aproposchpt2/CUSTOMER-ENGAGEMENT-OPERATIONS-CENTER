'use strict';
const {createHash,createHmac,timingSafeEqual}=require('node:crypto');
const http=require('node:http');
const {envelope,TENANT,PROJECT}=require('./dispatcher.staging.cjs');
const FUNCTIONS={claim:'stellar_dispatch_claim_staging',verify:'stellar_dispatch_verify_staging',receive:'stellar_dispatch_receive_staging',ack:'stellar_dispatch_ack_staging',fail:'stellar_dispatch_fail_staging'};
function reject(code){const e=new Error(code);e.safeCode=code;return e;}
function createDatabaseRpc({connect,onTrace=()=>{}}){
 if(typeof connect!=='function')throw reject('STAGING_CONNECTION_FACTORY_REQUIRED');
 return async(name,args)=>{
  if(!Object.values(FUNCTIONS).includes(name))throw reject('RPC_NOT_ALLOWED');
  let c;try{
   c=await connect();c.on?.('error',()=>{});await c.query('BEGIN');await c.query('SET LOCAL ROLE service_role');
   const metadata=(await c.query("SELECT pg_backend_pid() AS backend_pid,current_user AS effective_role,txid_current()::text AS transaction_id,clock_timestamp() AS started_at")).rows[0];
   if(metadata.effective_role!=='service_role')throw reject('RPC_ROLE_REJECTED');
   const placeholders=args.map((x,i)=>'$'+(i+1)).join(',');
   const value=(await c.query(`SELECT public.${name}(${placeholders}) AS value`,args)).rows[0]?.value;
   await c.query('COMMIT');onTrace({rpc:name,...metadata,committedAt:new Date().toISOString()});return value;
  }catch(error){
   if(c)await c.query('ROLLBACK').catch(()=>{});
   const known=['DISPATCH_SCOPE_REJECTED','RECEIVER_KEY_REJECTED','RECEIVER_ASSOCIATION_REJECTED','RECEIVER_PAYLOAD_CONFLICT','DURABLE_RECEIPT_REQUIRED','DISPATCH_ERROR_CODE_REJECTED','RPC_ROLE_REJECTED'];
   throw reject(known.includes(error.message)?error.message:'RPC_UNAVAILABLE');
  }finally{if(c)await c.end().catch(()=>{});}
 };
}
function createStore({rpc}){
 if(typeof rpc!=='function')throw reject('STAGING_RPC_REQUIRED');
 return {
  claim:({tenantId,workflowIds,workerId,leaseMs})=>rpc(FUNCTIONS.claim,[tenantId,workflowIds,workerId,leaseMs]),
  verifyAssociation:claim=>rpc(FUNCTIONS.verify,[TENANT,claim.event.eventId,claim.token]),
  complete:({eventId,token,payloadSha256})=>rpc(FUNCTIONS.ack,[TENANT,eventId,token,payloadSha256]),
  fail:({eventId,token,code})=>rpc(FUNCTIONS.fail,[TENANT,eventId,token,code]),
  async receive(message){
   let payload;try{payload=JSON.parse(message.body);}catch{throw reject('RECEIVER_BODY_REJECTED');}
   if(payload.project!==PROJECT)throw reject('RECEIVER_PROJECT_REJECTED');
   const canonical=envelope(payload);
   if(canonical.body!==message.body||canonical.idempotencyKey!==message.idempotencyKey)throw reject('RECEIVER_CANONICAL_REJECTED');
   const hash=createHash('sha256').update(message.body).digest('hex');
   if(hash!==canonical.payloadSha256)throw reject('RECEIVER_HASH_REJECTED');
   // The rpc wrapper COMMITs the receipt/effect transaction BEFORE this resolves.
   return rpc(FUNCTIONS.receive,[TENANT,payload.eventId,payload.workflowId,payload.sessionId,payload.caseId,message.idempotencyKey,hash]);
  }
 };
}
async function startTestReceiver({store,sharedKey,afterApply=async()=>{},mode='normal'}){
 if(typeof sharedKey!=='string'||sharedKey.length<32||typeof store?.receive!=='function')throw reject('TEST_RECEIVER_CONFIG_REJECTED');
 if(!['normal','reject','timeout'].includes(mode))throw reject('TEST_RECEIVER_MODE_REJECTED');
 const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/test-event'){res.writeHead(404).end();return;}
  try{
   const parts=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>4096)throw reject('RECEIVER_BODY_REJECTED');parts.push(chunk);}
   const body=Buffer.concat(parts).toString('utf8'),signature=req.headers['x-stellar-signature'];
   if(typeof signature!=='string'||!/^[0-9a-f]{64}$/.test(signature))throw reject('RECEIVER_AUTH_REJECTED');
   const expected=createHmac('sha256',sharedKey).update(body).digest();
   if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw reject('RECEIVER_AUTH_REJECTED');
   if(mode==='reject'){res.writeHead(503).end();return;}
   if(mode==='timeout'){setTimeout(()=>{if(!res.destroyed)res.writeHead(504).end();},3000).unref();return;}
   const ack=await store.receive({body,idempotencyKey:req.headers['idempotency-key']});
   await afterApply(ack);
   if(!res.destroyed)res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(ack));
  }catch(error){if(!res.destroyed)res.writeHead(error.safeCode==='RECEIVER_AUTH_REJECTED'?401:409).end(JSON.stringify({error:error.safeCode||'RECEIVER_UNAVAILABLE'}));}
 });
 server.requestTimeout=4000;server.headersTimeout=4000;
 await new Promise((resolve,rejectPromise)=>{server.once('error',rejectPromise);server.listen(0,'127.0.0.1',resolve);});
 return {url:`http://127.0.0.1:${server.address().port}/test-event`,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
module.exports={createDatabaseRpc,createStore,startTestReceiver,FUNCTIONS};
