'use strict';
/**
 * STELLAR staging-only Sales/Support knowledge release gate.
 * Offline: validates source recovery and intent coverage.
 * Online: verifies actual caller-eligible Supabase articles, never trusting
 * mere approval counts or draft source packages.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const pack = JSON.parse(fs.readFileSync(path.join(__dirname, 'specialist-source-recovery-20261025.json'), 'utf8'));
const catalog = require('../voice-agent-catalog-expanded.json');
const offline = process.argv.includes('--offline');
const groups = Object.fromEntries(['sales','support','safety','universal','conversation_control'].map(group => [group,catalog.intents.filter(x=>x.group===group).length]));
assert.equal(pack.publishable, false, 'Unreviewed source recovery must not become publishable');
assert.ok(pack.sales.sourceSections.length >= 35, 'Authoritative Sales KB sections missing');
assert.equal(pack.sales.existingDraftIntents.length, 75, 'Sales candidate inventory changed');
assert.equal(pack.support.existingDraftIntents.length, 73, 'Support candidate inventory changed');
assert.ok(pack.support.sourceSections.length >= 5, 'Support source recovery incomplete');
assert.ok(groups.sales >= 100 && groups.support >= 150, 'Expanded intent coverage regressed');
for (const domain of ['sales','support']) {
  for (const item of pack[domain].sourceSections) {
    assert.equal(item.publicationState,'draft');
    assert.equal(item.requiresReview,true);
    assert.ok(item.content.length > 60);
  }
}
console.log(JSON.stringify({gate:'source-inventory',status:'PASS',salesSourceSections:pack.sales.sourceSections.length,supportSourceSections:pack.support.sourceSections.length,salesCandidateIntents:75,supportCandidateIntents:73,expandedIntents:catalog.intents.length}));
if (offline) process.exit(0);
const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !/^https:\/\/[^/]+$/.test(url)) {
  console.error('NO_GO: staging Supabase credentials or URL unavailable');
  process.exit(2);
}
const tenants = {sales:'5885a020-d363-4c27-910a-c035eda132f5',support:'d7e80001-0000-4000-b000-000000000001'};
(async () => {
  const result={};
  for (const domain of ['sales','support']) {
    const q = new URL('/rest/v1/ai4cc_knowledge_entries',url);
    for (const [k,v] of Object.entries({select:'id',tenant_id:'eq.'+tenants[domain],approved:'eq.true',visibility:'eq.public',audience_scope:'eq.public',publication_state:'eq.published',source_status:'eq.VERIFIED',limit:'1'}))q.searchParams.set(k,v);
    if(domain==='sales')q.searchParams.set('category','like.sales_*');
    const r=await fetch(q,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('KB_GATE_QUERY_FAILED_'+domain+'_'+r.status);
    const rows=await r.json();
    result[domain]=Array.isArray(rows)&&rows.length>0?'ELIGIBLE_RECORD_FOUND':'NO_ELIGIBLE_RECORDS';
  }
  console.log(JSON.stringify({gate:'caller-knowledge',...result}));
  if(Object.values(result).some(x=>x!=='ELIGIBLE_RECORD_FOUND')) {
    console.error('NO_GO: both specialists require published, approved, verified, caller-public tenant knowledge before telephone acceptance');
    process.exitCode=1;
  }
})().catch(e=>{console.error('NO_GO:',e.message);process.exitCode=2;});
