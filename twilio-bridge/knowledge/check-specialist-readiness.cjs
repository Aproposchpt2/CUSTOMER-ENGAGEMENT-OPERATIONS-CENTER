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
const { requireApprovedKnowledge } = require('../staging-knowledge-policy.cjs');
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
if (offline && require.main === module) process.exit(0);
const STAGING_URL = 'https://hvzauakkhlivzeqatfqm.supabase.co';
const tenants = {sales:'5885a020-d363-4c27-910a-c035eda132f5',support:'d7e80001-0000-4000-b000-000000000001'};
async function checkCallerKnowledge({url, key, fetchImpl = fetch, now = new Date()}) {
  if (url !== STAGING_URL || !key) throw new Error('STAGING_BINDING_OR_CREDENTIALS_INVALID');
  const result = {};
  for (const domain of ['sales','support']) {
    const ids = [];
    // Page through all matching rows: an expired first row must neither pass
    // the gate nor conceal a later eligible record.
    for (let offset = 0; ; offset += 100) {
      const q = new URL('/rest/v1/ai4cc_knowledge_entries',url);
      const fields = 'id,tenant_id,title,content,category,approved,visibility,audience_scope,publication_state,source_status,effective_at,expires_at,valid_until';
      for (const [k,v] of Object.entries({select:fields,tenant_id:'eq.'+tenants[domain],approved:'eq.true',visibility:'eq.public',audience_scope:'eq.public',publication_state:'eq.published',source_status:'eq.VERIFIED',order:'id.asc',limit:'100',offset:String(offset)})) q.searchParams.set(k,v);
      if (domain === 'sales') q.searchParams.set('category','like.sales_*');
      const r = await fetchImpl(q,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw new Error('KB_GATE_QUERY_FAILED_'+domain+'_'+r.status);
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length > 100) throw new Error('KB_GATE_INVALID_RESPONSE_'+domain);
      for (const row of rows) {
        if (domain === 'sales' && (typeof row.category !== 'string' || !row.category.startsWith('sales_'))) continue;
        if (typeof row.id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(row.id)) continue;
        if (requireApprovedKnowledge(row,{tenantId:tenants[domain],now})) ids.push(row.id);
      }
      if (rows.length < 100) break;
    }
    result[domain] = {status:ids.length ? 'ELIGIBLE_RECORD_FOUND' : 'NO_ELIGIBLE_RECORDS',recordIds:[...new Set(ids)]};
  }
  return result;
}
module.exports = {checkCallerKnowledge};
if (require.main === module) {
  checkCallerKnowledge({url:process.env.STAGING_SUPABASE_URL,key:process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY})
    .then(result => {
      console.log(JSON.stringify({gate:'caller-knowledge-presence',checkedAt:new Date().toISOString(),...result,scope:'Presence only; not per-intent coverage or end-to-end acceptance'}));
      if (Object.values(result).some(x=>x.status !== 'ELIGIBLE_RECORD_FOUND')) process.exitCode=1;
    }).catch(e=>{console.error('NO_GO:',e.message);process.exitCode=2;});
}
