'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crosswalk=require('../docs/hvac-knowledge/HVAC-KB-SOURCE-CROSSWALK.json');
const catalog=require('../docs/hvac-knowledge/source/HVAC-SUPPORT-master-intents-source.json');
test('all 24 Co-Pilot Support sections tracked without publication',()=>{assert.equal(crosswalk.sections.length,24);assert.equal(new Set(crosswalk.sections.map(x=>x.section)).size,24);assert.ok(crosswalk.sections.every(x=>x.public_retrieval_allowed===false))});
test('canonical intent groups preserved',()=>{assert.equal(catalog.counts.support,13);assert.equal(catalog.counts.hvac,22);assert.equal(catalog.counts.safety,8);assert.equal(catalog.intents.length,80)});
test('no arbitrary KB approval',()=>assert.ok(crosswalk.sections.every(x=>x.review==='PENDING')));
