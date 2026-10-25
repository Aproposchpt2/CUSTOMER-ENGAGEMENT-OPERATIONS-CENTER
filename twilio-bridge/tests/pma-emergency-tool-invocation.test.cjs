'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const adapter=fs.readFileSync(path.join(__dirname,'..','pma-adapter.cjs'),'utf8');
const gateway=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
test('PMA safety instructions require an emergency tool call without resident confirmation',()=>{
 assert.match(adapter,/CRITICAL EMERGENCY EXECUTION/);
 assert.match(adapter,/invoke pma_property_workflow during that same active call/);
 assert.match(adapter,/confirmed=false/);
 assert.match(adapter,/Speaking safety advice by itself NEVER records an incident/);
});
test('PMA gateway records invocation and outcome without logging caller message text',()=>{
 assert.match(gateway,/event:'pma_workflow_started'/);
 assert.match(gateway,/event:'pma_workflow_completed'/);
 assert.match(gateway,/dispatchState:output\?\.emergencyDispatch\?\.state/);
});
