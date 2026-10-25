import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../lib/propertyManagement/emergencyDispatch.ts',import.meta.url),'utf8');
test('PMA staging uses role-bound notification text and explicit recipient allowlist',()=>{
 for(const number of ['+17753508039','+17253305102','+17027102622','+17029351414'])assert.ok(code.includes(number));
 for(const role of ['owner','vendor','tenant','owner_backup'])assert.ok(code.includes("'"+role+"'"));
 assert.match(code,/Object\.hasOwn\(PMA_STAGING_TEST_ROLES,destination\)/);
 assert.match(code,/if\(pref\.channel==='sms'&&!role\)/);
 assert.match(code,/recipientRole:role\|\|undefined/);
 assert.match(code,/Vendor notification|Maintenance vendor notification/);
 assert.match(code,/Tenant incident notice/);
});
test('PMA staging receipts never claim Twilio submission means delivery',()=>{
 assert.match(code,/state:'SUBMITTED'/);
 assert.match(code,/state:'FAILED'/);
 assert.match(code,/SUBMITTED means Twilio accepted a request/);
 assert.doesNotMatch(code,/email:logged/);
});
