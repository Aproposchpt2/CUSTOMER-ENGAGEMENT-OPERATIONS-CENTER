import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Source-contract regression: runtime integration tests still required before staging GO.
const source=readFileSync('lib/propertyManagement/emergencyDispatch.ts','utf8');
test('PMA notification receipt separates API submission from delivery',()=>{
 assert.match(source,/state:'SUBMITTED'/);
 assert.match(source,/state:'FAILED'/);
 assert.match(source,/state:'NOT_CONFIGURED'/);
 assert.match(source,/attempts\.push\(\{channel:'sms',state:'FAILED'/);
 assert.match(source,/attempts\.push\(\{channel:'email',state:'NOT_CONFIGURED'/);
 assert.doesNotMatch(source,/channels\.push\('email:logged'\)/);
 assert.match(source,/SUBMITTED means Twilio accepted a request; it does not prove delivery/);
});
