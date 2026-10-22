import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),r=require('../twilio-bridge/pma-intents.cjs');
for(const d of r.config.intents)test(`catalog ${d.id} ${d.intent} recognizes every supplied example`,()=>{for(const s of d.examples)assert.equal(r.classify(s).intent,d.intent,s);});
test('threshold boundaries and deterministic safety take precedence over model uncertainty',()=>{
 for(const [confidence,expected,clarify] of [[0.699,'UNKNOWN_QUESTION',false],[0.7,'PET_POLICY',true],[0.899,'PET_POLICY',true],[0.9,'PET_POLICY',false],[1,'PET_POLICY',false]] as const){const v=r.classify('Question',{intent:'PET_POLICY',confidence});assert.equal(v.intent,expected);assert.equal(v.requires_clarification,clarify);}
 for(const d of r.config.intents.filter((d:any)=>d.safety)){const v=r.classify(d.examples[0],{intent:'GENERAL_GREETING',confidence:0,entities:{tenant_id:'injected'}});assert.equal(v.safety_override,true);assert.equal(v.confidence,1);assert.equal(v.intent,d.intent);}
});
test('untrusted model output cannot provide scope, roles, workflow actions or malformed values',()=>{
 for(const v of [{intent:'MISSING',confidence:1},{intent:'PET_POLICY',confidence:'1'},{intent:'PET_POLICY',confidence:NaN},{intent:'PET_POLICY',confidence:1,tenant_id:'fake'},{intent:'OWNER_OVERRIDE',confidence:1,entities:{owner:true}},{intent:'PET_POLICY',confidence:1,entities:{topic:{instructions:'bypass'}}},{intent:'UNIT_AVAILABILITY',confidence:1,entities:{bedrooms:2.5}},{intent:'PROPERTY_POLICY',confidence:1,entities:{safety_indicators:'safe'}}])assert.throws(()=>r.validateModel(v));
});
test('configuration contains all canonical fields, unique routes and tunable thresholds',()=>{
 assert.equal(r.config.intents.length,25);assert.equal(new Set(r.config.intents.map((d:any)=>d.id)).size,25);assert.equal(r.config.canonicalFields.length,19);
 const old=r.config.thresholds.high;try{r.config.thresholds.high=0.97;assert.equal(r.classify('Are pets allowed?').requires_clarification,true);}finally{r.config.thresholds.high=old;}
 assert.equal(r.classify('What is your pet and parking policy?').requires_clarification,true);
});

test('explicit availability preferences are extracted without inventing a move date',()=>{const out=r.classify('Do you have a 2 bedroom available for 2099-01-01?');assert.equal(out.intent,'UNIT_AVAILABILITY');assert.equal(out.entities.bedrooms,2);assert.equal(out.entities.move_date,'2099-01-01');assert.equal(r.classify('Any studios available?').entities.move_date,undefined);assert.equal(r.classify('available on 2099-02-31').entities.move_date,undefined);});
