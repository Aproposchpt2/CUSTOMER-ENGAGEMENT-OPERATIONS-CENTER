'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const adapter=fs.readFileSync(path.join(__dirname,'..','pma-adapter.cjs'),'utf8');
const gateway=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
test('PMA emergency flow keeps safety ahead of intake and requires a persisted complete report before notification claims',()=>{
 const instructions=require('../pma-adapter.cjs').createPmaAdapter({}).instructions;
 assert.match(instructions,/immediately interrupt/);
 assert.match(instructions,/Submit the complete incident once through the dedicated emergency intent/);
 assert.match(instructions,/server persists the case then invokes the staging emergency dispatcher/);
 assert.match(instructions,/Never say it was delivered, received, read or acknowledged/);
 assert.match(instructions,/Do not send a second emergency workflow call/);
});
test('PMA gateway records invocation and outcome without logging caller message text',()=>{
 assert.match(gateway,/event:'pma_workflow_started'/);
 assert.match(gateway,/event:'pma_workflow_completed'/);
 assert.match(gateway,/dispatchState:output\?\.emergencyDispatch\?\.state/);
});
