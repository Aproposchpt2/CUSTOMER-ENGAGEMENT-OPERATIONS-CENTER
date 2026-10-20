'use strict';
const {Readable}=require('node:stream');
const {createStagingGateway,PREVIEW_ORIGIN,URL:SUPABASE_URL,TENANT}=require('./authenticated-support-gateway.staging.cjs');
const SITE='a98fcd5a-893e-4eb7-835b-146f516ff47d';
function previewReady(env){
  return env.SUPABASE_URL===SUPABASE_URL&&env.NEXT_PUBLIC_SUPABASE_URL===SUPABASE_URL&&env.CSS_TENANT_ID===TENANT&&env.STELLAR_BRIDGE_STAGING==='true'&&env.STAGING_ORCHESTRATION_GATEWAY_ENABLED==='true'&&env.STAGING_SUPPORT_WRITES_ENABLED==='true'&&env.STAGING_ORCHESTRATION_SITE_ID===SITE&&env.STAGING_ORCHESTRATION_ORIGIN===PREVIEW_ORIGIN&&(!env.CONTEXT||env.CONTEXT==='deploy-preview')&&(!env.REVIEW_ID||env.REVIEW_ID==='77');
}
function createNodeGatewayHandler({env=process.env,getCookieAccessToken,request=fetch}={}){
  let gateway;
  const send=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));};
  return async function handler(req,res){
    // Check host and preview-only switches before touching auth cookies or upstreams.
    if(!previewReady(env))return send(res,503,{error:'GATEWAY_DISABLED'});
    if(req.headers.host!==new URL(PREVIEW_ORIGIN).host||req.headers.origin!==PREVIEW_ORIGIN)return send(res,403,{error:'ORIGIN_REJECTED'});
    if(req.method!=='POST')return send(res,405,{error:'POST_REQUIRED'});
    if(!/^\/api\/staging-orchestration\/(begin|submit|status)$/.test(req.url||''))return send(res,404,{error:'NOT_FOUND'});
    const controller=new AbortController();let timer,abort;
    try{
      let authorization=req.headers.authorization;
      if(authorization!==undefined&&typeof authorization!=='string')return send(res,401,{error:'SIGN_IN_REQUIRED'});
      if(authorization===undefined){
        if(typeof getCookieAccessToken!=='function')return send(res,401,{error:'SIGN_IN_REQUIRED'});
        // Cookie session is only a source of the bearer. Gateway still performs remote getUser and RLS membership.
        const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('COOKIE_SESSION_UNAVAILABLE')),2500);});
        const token=await Promise.race([getCookieAccessToken(req,res),timeout]);clearTimeout(timer);
        if(typeof token!=='string'||token.length<20||token.length>8192)return send(res,401,{error:'SIGN_IN_REQUIRED'});
        authorization='Bearer '+token;
      }
      gateway??=createStagingGateway({env,request});
      const headers=new Headers();for(const name of ['origin','content-type','content-length']){const value=req.headers[name];if(typeof value==='string')headers.set(name,value);}
      headers.set('authorization',authorization);
      abort=()=>controller.abort();req.once('aborted',abort);
      const web=new Request(PREVIEW_ORIGIN+req.url,{method:'POST',headers,body:Readable.toWeb(req),duplex:'half',signal:controller.signal});
      const result=await gateway.handle(web);res.statusCode=result.status;result.headers.forEach((value,name)=>res.setHeader(name,value));res.end(await result.text());
    }catch{return send(res,503,{error:'STAGING_GATEWAY_UNAVAILABLE'});}
    finally{clearTimeout(timer);if(abort)req.removeListener('aborted',abort);}
  };
}
module.exports={previewReady,createNodeGatewayHandler,SITE};
