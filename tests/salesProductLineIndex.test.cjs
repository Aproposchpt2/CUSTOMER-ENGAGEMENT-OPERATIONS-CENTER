'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const index=require('../config/sales-intelligence/stellar-product-line-source-index.json');
test('complete five-option company portfolio is represented',()=>{
 assert.equal(index.products.length,5);
 assert.deepEqual(index.products.map(p=>p.category),['FOUNDATION','SALES','SUPPORT','VERTICAL_APP','COMBINED_CONFIGURATION']);
});
test('all Co-Pilot source sections remain linked, not replaced by summaries',()=>{
 assert.equal(index.source_sections.length,23);
 assert.equal(index.source_sections[0].title,'Operating Identity and Mission');
 assert.equal(index.source_sections[22].title,'Sales Voice Acceptance Tests');
});
test('every source record remains unpublished and has lineage',()=>{
 for(const p of index.products){assert.ok(p.source);assert.equal(p.publication,'OWNER_REVIEW_REQUIRED');}
 for(const s of index.source_sections){assert.equal(s.approved_for_voice,false);assert.ok(s.source);}
});
