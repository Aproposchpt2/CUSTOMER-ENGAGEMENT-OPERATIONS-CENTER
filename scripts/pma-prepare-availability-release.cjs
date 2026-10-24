'use strict';
// Read-only preparation: prints a review manifest and never calls Fly or Netlify.
const {execFileSync}=require('node:child_process');
function releasePlan(sourceSha){
 if(!/^[0-9a-f]{40}$/.test(sourceSha))throw Error('Exact Git source SHA required');
 return {
  sourceSha,app:'ai4-pma-bridge-staging',configuration:'twilio-bridge/fly.pma-staging.toml',dockerfile:'twilio-bridge/Dockerfile.pma-staging',
  status:'PREPARED_ONLY_REVIEW_GATE_REQUIRED',registryDigest:null,
  sourceLabel:'org.opencontainers.image.revision='+sourceSha,runtimeRevision:'BRIDGE_RELEASE_SHA='+sourceSha,
  buildArguments:{PMA_SOURCE_SHA:sourceSha},
  disabledGates:{STAGING_VOICE_ORCHESTRATION_ENABLED:'false',STAGING_SUPPORT_WRITES_ENABLED:'false',syntheticTours:'OFF; verify server binding separately'},
  stagingBase:'https://pma-validation--ai4cc-staging.netlify.app',
  priorFly:{release:4,id:'rel_95o6zr7vox4m2g08',machine:'820e3eb7206d78',version:'01M5NEZPBJCBZAE0KY84PGGV1J',image:'registry.fly.io/ai4-pma-bridge-staging@sha256:1955bbc2558e3a25a5848a4079b05e090ee81dee0b65c296b0990814250d2647'},
  priorNetlify:{deploy:'6adae7c95030f9ac2280a356',permalink:'https://6adae7c95030f9ac2280a356--ai4cc-staging.netlify.app'},
  reviewDocument:'docs/pma-003/PMA-005-R3-RELEASE-PLAN.md',
  warnings:['Capture fresh provider state before a release; prior references are historical.','Registry digest is unavailable until the reviewed image is built/published.','Build both Netlify and Fly from this same source; legacy responses fail closed.','Independent review and telephone QA remain pending.']
 };
}
if(require.main===module){
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit and validate all source changes before preparing release');
 console.log(JSON.stringify(releasePlan(sourceSha),null,2));
}
module.exports={releasePlan};
