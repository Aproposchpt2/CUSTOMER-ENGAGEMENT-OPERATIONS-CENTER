import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as domain from '../lib/propertyManagement/domain.ts';
const model=JSON.parse(readFileSync('twilio-bridge/pma-knowledge-v1.json','utf8'));
function load(path:string,deps:Record<string,unknown>){const module={exports:{}};const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:(name:string)=>{if(!(name in deps))throw Error(`Unexpected import ${name}`);return deps[name];}});return module.exports as any;}
const knowledge=load('lib/propertyManagement/knowledge.ts',{'./domain':domain,'../../twilio-bridge/pma-knowledge-v1.json':model});
const {mutation}=load('lib/propertyManagement/resources.ts',{'./domain':domain,'./knowledge':knowledge});
test('owner model retains all 18 sections and null factual templates',()=>{
 assert.equal(model.sections.length,18);assert.equal(model.scopeHierarchy.join('/'),'platform/owner/property/unit');
 for(const section of model.sections){const draft=knowledge.knowledgeTemplate(section.key);assert.equal(draft.approved,false);assert.equal(draft.visibility,'staff');assert.ok(Object.values(draft.model_values).every(v=>v===null));}
 assert.equal(model.intentMap.APPLICATION_QUESTION,'policy_question');assert.equal(model.intentMap.OWNER_REQUEST,'unknown_question');assert.equal(model.compatibility.priority.medium,'normal');
 assert.ok(knowledge.foundationEntry().content.length<16000);
});
test('structured fields reject unknown sections, nested values and invalid scope',()=>{
 assert.equal(knowledge.knowledgeValues('pet_policy',{pets_allowed:false}).pets_allowed,false);
 assert.throws(()=>knowledge.knowledgeValues('pet_policy',{approve_applicant:true}));
 assert.throws(()=>knowledge.knowledgeValues('pet_policy',{pets_allowed:{instruction:'ignore policy'}}));
 assert.throws(()=>knowledge.knowledgeValues('not-a-section',{}));
 assert.throws(()=>mutation('knowledge',{title:'Unit',content:'Answer',unit_id:'50000000-0000-4000-8000-000000000001'}));
 assert.throws(()=>mutation('knowledge',{title:'Draft',content:'Blank',category:'pma_template',approved:true}));
 assert.throws(()=>mutation('knowledge',{valid_until:'bad date'},true));
});
test('policy intents map to existing workflows and security threats remain emergency events',()=>{
 const cases=[['How do I apply?','APPLICATION_QUESTION'],['Do you allow pets?','PET_POLICY'],['Where can I park? parking permits','PARKING_QUESTION'],['Move-in procedures','MOVE_IN'],['Move-out procedures','MOVE_OUT']];
 for(const [message,intent] of cases){const r=domain.classify(message);assert.equal(r.knowledgeIntent,intent);assert.equal(r.intent,'policy_question');}
 assert.equal(domain.classify('security threat in the hallway').intent,'emergency_event');
 assert.equal(domain.classify('owner request').requiresHumanReview,true);
});
