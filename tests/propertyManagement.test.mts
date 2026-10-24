import test from 'node:test';
import assert from 'node:assert/strict';
import {classify,assertTransition,metrics,uuid,text,futureTime} from '../lib/propertyManagement/domain.ts';

test('emergencies return structured escalation without invented dispatch',()=>{
 for(const issue of ['There is smoke in the hall','I smell gas','There is flooding in my unit','electrical hazard','structural threat']){
 const r=classify(issue);assert.equal(r.intent,'emergency_event');assert.equal(r.priority,'emergency');assert.equal(r.emergencyServicesContacted,false);assert.equal(r.vendorArrivalConfirmed,false);assert.equal(r.issueResolved,false);assert.equal(r.requiresHumanReview,true);
 }
});
test('intent baseline separates repair status, new repair and leasing',()=>{
 assert.equal(classify('What is the status of my repair?').intent,'maintenance_status');
 assert.equal(classify('The heater is broken').intent,'maintenance_request');
 assert.equal(classify('Please request a showing').intent,'showing_request');
 assert.equal(classify('Is a two bedroom available?').intent,'leasing_inquiry');
 assert.equal(classify('What is your pet policy?').intent,'policy_question');
 assert.equal(classify('Tell me a joke').intent,'unknown_question');
});
test('workflow rejects skipped states and malformed input',()=>{
 assert.doesNotThrow(()=>assertTransition('Assigned','Scheduled'));
 assert.throws(()=>assertTransition('New','Closed'));
 assert.throws(()=>assertTransition('Closed','New'));
 assert.throws(()=>uuid('other-owner-id'));
 assert.throws(()=>text('x'.repeat(501),'summary'));
 assert.throws(()=>futureTime('yesterday'));
 assert.throws(()=>futureTime('2020-01-01'));
});
test('metrics exclude completed emergencies and count unique leasing leads',()=>{
 const m=metrics({properties:[{}],units:[{},{}],maintenance:[{status:'Closed',priority:'emergency'},{status:'Assigned',priority:'emergency'},{status:'In Progress',priority:'normal'}],assignments:[{status:'accepted'},{status:'cancelled'}],showings:[{lead_id:'same',status:'requested'},{lead_id:'same',status:'cancelled'}]});
 assert.equal(m['Open Requests'],2);assert.equal(m['Emergency Requests'],1);assert.equal(m.Leads,1);assert.equal(m.Showings,1);assert.equal(m['Vendor Assignments'],1);
});

test('record validation rejects workspace injection and immutable scope changes',async()=>{
 const ts=await import('typescript');
 const fs=await import('node:fs');const vm=await import('node:vm');
 const domain=await import('../lib/propertyManagement/domain.ts');
 const output={exports:{}};
 const compiled=ts.default.transpileModule(fs.readFileSync('lib/propertyManagement/resources.ts','utf8'),{compilerOptions:{module:ts.default.ModuleKind.CommonJS,target:ts.default.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(compiled,{exports:output.exports,module:output,require:()=>domain});
 const {mutation,resource}=output.exports as any;
 assert.throws(()=>mutation('properties',{name:'Synthetic',tenant_id:'other-owner'}));
 assert.throws(()=>mutation('units',{property_id:'10000000-0000-4000-8000-000000000001'},true));
 assert.throws(()=>mutation('knowledge',{title:'X',content:'Y',approved:'true'}));
 assert.throws(()=>resource('__proto__'));
 assert.throws(()=>resource('automation_tasks'));
 assert.equal(mutation('properties',{name:' Synthetic '}).name,'Synthetic');
});

test('Netlify cancels implementation-branch builds and preserves other branches',async()=>{
 const {spawnSync}=await import('node:child_process');
 assert.equal(spawnSync(process.execPath,['scripts/netlify-build-guard.cjs'],{env:{...process.env,HEAD:'feature/property-management-assistant-mvp'}}).status,0);
 assert.equal(spawnSync(process.execPath,['scripts/netlify-build-guard.cjs'],{env:{...process.env,HEAD:'repair/pma-005-availability-incident-20261023'}}).status,0);
 assert.equal(spawnSync(process.execPath,['scripts/netlify-build-guard.cjs'],{env:{...process.env,HEAD:'main',BRANCH:'repair/pma-005-availability-incident-20261023'}}).status,0);
 assert.equal(spawnSync(process.execPath,['scripts/netlify-build-guard.cjs'],{env:{...process.env,HEAD:'release/pma-staging-validation'}}).status,1);
 assert.equal(spawnSync(process.execPath,['scripts/netlify-build-guard.cjs'],{env:{...process.env,HEAD:'main'}}).status,1);
});
