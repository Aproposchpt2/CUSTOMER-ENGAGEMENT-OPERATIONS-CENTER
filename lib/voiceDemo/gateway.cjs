'use strict';
const {routes,byAgent}=require('../../twilio-bridge/voice-entry.cjs');
const catalog=require('../../twilio-bridge/voice-agent-catalog.json');
const pmaCatalog=require('../../twilio-bridge/pma-intent-catalog-v1.json');
const ORIGIN='https://ai4-pma-bridge-staging.fly.dev';
const call=/^CA[0-9a-f]{32}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function reject(message,status=403){throw Object.assign(Error(message),{status});}
async function processVoiceDemo(body,{env,validateRequest,record,knowledge,workflow,availability}){
 if(env.PMA_ENVIRONMENT!=='staging'||env.VOICE_DEMO_IVR_ENABLED!=='true')reject('Voice demo disabled',503);
 if(!body||typeof body!=='object'||Array.isArray(body))reject('Invalid voice request',400);
 const paths={entry:'/api/ivr/main',route:'/api/ivr/router',status:'/api/ivr/status',complete:'/api/ivr/complete',gateway_status:'/api/intake/voice-demo-status-staging'};
 let event,callSid,caller=null,route=null,sessionId=null,details={};
 if(Object.hasOwn(paths,body.action)){
  const params=body.params;
  if(!params||typeof params!=='object'||Array.isArray(params)||Object.keys(params).length>100||Object.values(params).some(v=>typeof v!=='string'||v.length>5000))reject('Invalid provider payload');
  const providerOrigin=body.action==='gateway_status'?'https://pma-validation--ai4cc-staging.netlify.app':ORIGIN;
  if(body.originalPath!==paths[body.action]||typeof body.twilioSignature!=='string'||!env.TWILIO_AUTH_TOKEN||!validateRequest(env.TWILIO_AUTH_TOKEN,body.twilioSignature,providerOrigin+paths[body.action],params))reject('Invalid Twilio signature');
  if(!/^AC[0-9a-f]{32}$/i.test(env.TWILIO_ACCOUNT_SID||'')||params.AccountSid!==env.TWILIO_ACCOUNT_SID||!call.test(params.CallSid||''))reject('Unapproved account or call');
  if(['entry','route'].includes(body.action)&&(!env.PMA_STAGING_DID||['+17253305102','+17027102622'].includes(env.PMA_STAGING_DID)||params.To!==env.PMA_STAGING_DID||!env.PMA_STAGING_TEST_CALLER||params.From!==env.PMA_STAGING_TEST_CALLER))reject('Unapproved staging caller or number');
  callSid=params.CallSid;
  caller=params.From||null;
  if(body.action==='entry')event='init';
  else if(body.action==='route'){
   if(Object.hasOwn(routes,params.Digits)){event='choose';route=routes[params.Digits].agent;}
   else if(params.Digits===''){event='timeout';}
   else event='repeat';
  }else if(body.action==='complete')event='end';
  else{
   if(!['stream-stopped','stream-error'].includes(params.StreamEvent)&&!['completed','busy','failed','no-answer','canceled'].includes(params.CallStatus))return {acknowledged:true};
   event='end';details={reason:params.StreamEvent||params.CallStatus};
  }
 }else if(['reception_start','reception_choose','reception_end'].includes(body.action)){
  if(!call.test(body.call_sid||'')||!uuid.test(body.session_id||'')||body.caller_number!==env.PMA_STAGING_TEST_CALLER||!/^\+[1-9][0-9]{7,14}$/.test(body.caller_number||''))reject('Invalid reception binding');
  if(body.action==='reception_choose'&&!Object.hasOwn(byAgent,body.agentRoute))reject('Invalid reception destination');
  if(body.action!=='reception_choose'&&body.agentRoute!==null)reject('Reception route must be unselected');
  event=body.action==='reception_choose'?'choose':body.action==='reception_end'?'end':'repeat';callSid=body.call_sid;sessionId=body.session_id;caller=body.caller_number;route=body.action==='reception_choose'?body.agentRoute:null;
  details={reason:typeof body.reason==='string'?body.reason.slice(0,100):undefined};
 }else if(['stream_start','stream_end','support_rpc','sales_submit','pma_availability'].includes(body.action)){
  if(!call.test(body.call_sid||'')||!uuid.test(body.session_id||'')||!Object.hasOwn(byAgent,body.agentRoute))reject('Invalid session binding');
  event=body.action==='stream_end'?'end':'start';callSid=body.call_sid;route=body.agentRoute;sessionId=body.session_id;
  details={reason:typeof body.reason==='string'?body.reason.slice(0,100):undefined};
 }else reject('Unsupported voice operation',400);
 const session=await record({event,call_sid:callSid,caller_number:caller,agent_route:route,session_id:sessionId,details});
 if(!session||session.call_sid!==callSid||!uuid.test(session.session_id||''))reject('Invalid persisted voice session',503);
 session.account_sid=env.TWILIO_ACCOUNT_SID;
 if(session.agentRoute==='property-management-assistant'&&['stream_start','pma_availability'].includes(body.action)){
  if(session.session_id!==sessionId)reject('PMA session binding mismatch');
  const started=Date.parse(session.start_time);
  if(!Number.isFinite(started)||started>Date.now()||started<Date.now()-2*60*60*1000)reject('PMA session expired or missing lifetime');
 }
 if(['reception_start','reception_choose'].includes(body.action)){
  if(session.end_time||(body.action==='reception_start'?session.agentRoute!==null:session.agentRoute!==route))reject('Reception session closed or already routed');
  return {session};
 }
 if(body.action==='pma_availability'){
  if(env.VOICE_DEMO_WORKFLOWS_ENABLED!=='true'||session.end_time||session.agentRoute!=='property-management-assistant'||route!==session.agentRoute)reject('PMA availability unavailable',403);
  const args=body.args;if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>k!=='bedrooms')||(args.bedrooms!==undefined&&(!Number.isInteger(args.bedrooms)||args.bedrooms<0||args.bedrooms>30)))reject('Invalid availability filter',400);
  if(typeof availability!=='function')reject('Availability provider missing',503);
  return {session,availability:await availability(args,session)};
 }
 if(['support_rpc','sales_submit'].includes(body.action)){
  if(env.VOICE_DEMO_WORKFLOWS_ENABLED!=='true'||session.end_time||session.agentRoute!==route)reject('Staging workflow unavailable',503);
  if((body.action==='support_rpc'&&route!=='support-specialist')||(body.action==='sales_submit'&&route!=='sales-specialist'))reject('Agent workflow mismatch');
  if(!body.args||typeof body.args!=='object'||Array.isArray(body.args)||JSON.stringify(body.args).length>16000)reject('Invalid workflow arguments',400);
  return {session,rpcResult:await workflow(body,session)};
 }
 if(body.action!=='stream_start')return {session};
 if(session.agentRoute!==route||session.end_time)reject('Session closed or route mismatch');
 const binding=byAgent[route];
 const entries=await knowledge(route);
 const now=Date.now();
 const safeEntries=entries.filter(x=>x.approved===true&&x.publication_state==='published'&&x.visibility==='public'&&(binding.profile==='pma'||x.tags?.includes('agent:'+route))&&x.source_status==='VERIFIED'&&typeof x.content==='string'&&(!x.valid_until||Date.parse(x.valid_until)>now)&&(!x.expires_at||Date.parse(x.expires_at)>now)&&(!x.effective_at||Date.parse(x.effective_at)<=now)).slice(0,binding.profile==='pma'?64:12).map(x=>({id:x.id,title:x.title,content:x.content.slice(0,binding.profile==='pma'?1200:3000),version:x.version_num}));
 return {session,assets:{agentRoute:route,promptBinding:binding.prompt,knowledgeBinding:binding.knowledge,intentBinding:binding.intents,knowledgeAvailable:safeEntries.length>0,knowledgeEntries:safeEntries,intents:binding.profile==='pma'?pmaCatalog.intents:catalog.intents.filter(i=>[binding.intentGroup,'universal','conversation_control','safety'].includes(i.group))}};
}
module.exports={processVoiceDemo};
