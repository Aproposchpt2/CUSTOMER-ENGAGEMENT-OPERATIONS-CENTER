'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const root=path.resolve(__dirname,'../../docs/specialist-staging/source');const kb=require(path.join(root,'knowledge.json'));const intents=require(path.join(root,'intents-all-fields.json'));const tests=require(path.join(root,'validation-tests.json'));const old=require('../voice-agent-catalog-expanded.json');
test('all 250 KB records have stable unique IDs, original source, caller text and isolated platform scopes',()=>{
 assert.equal(kb.length,250);assert.equal(new Set(kb.map(x=>x.id)).size,250);
 for(const [prefix,n,scope] of [['SAL',100,'sales'],['SUP',150,'support_platform']])for(let i=1;i<=n;i++){const r=kb.find(x=>x.id===prefix+'-'+String(i).padStart(3,'0'));assert.ok(r.caller_answer.trim());assert.equal(r.scope,scope);assert.equal(r.approval,'draft');assert.ok(r.source);if(r.origin==='RECOVERED_SOURCE'){assert.ok(r.source_blocks.length>15);assert.equal(r.metadata['Intent ID'],r.id);}else assert.equal(r.article.source_provenance.approval_status,'DRAFT_PENDING_OWNER_REVIEW');}
});
test('all 32 catalog fields preserved and existing runtime core definitions unchanged',()=>{
 assert.equal(intents.length,250);assert.equal(new Set(intents.map(x=>x.IntentID)).size,250);
 const fields={'IntentName':'intentName','Category':'category','Description':'description','RecognitionRule':'recognitionRule','ToolOperation':'toolOperation','RiskLevel':'riskLevel','OperationalStatus':'operationalStatus'};
 for(const r of intents){assert.equal(Object.keys(r).length,32);assert.ok(r.PositiveUtterances);const o=old.intents.find(x=>x.reference===r.IntentID);assert.ok(o);for(const [source,target]of Object.entries(fields))assert.equal(r[source],o.definition[target]);}
 assert.equal(old.intents.length,283);
});
test('630 unique source tests are preserved as unexecuted and map exactly to 90 expansion articles',()=>{
 assert.equal(tests.length,630);assert.equal(new Set(tests.map(t=>t.id)).size,630);assert.ok(tests.every(t=>t.status==='NOT_EXECUTED'));
 const actual=tests.map(t=>t.id).sort();const mapped=kb.filter(r=>r.article).flatMap(r=>r.article.validation_test_mapping).sort();assert.deepEqual(actual,mapped);assert.equal(kb.filter(r=>r.article).length,90);
});
