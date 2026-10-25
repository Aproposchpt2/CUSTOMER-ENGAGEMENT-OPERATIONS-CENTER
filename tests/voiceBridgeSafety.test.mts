import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridge = readFileSync(new URL('../twilio-bridge/server.js', import.meta.url), 'utf8');

test('GPT-Live delegated tool results use the response item protocol', () => {
  assert.match(bridge, /type:\s*'response\.item\.create',\s*item:\s*\{\s*type:\s*'function_call_output'/);
  assert.doesNotMatch(bridge, /type:\s*'conversation\.item\.create'/);
});

test('human transfer requires a confirmed saved lead', () => {
  assert.match(bridge, /let leadSaved = false/);
  const toolBranch = bridge.slice(bridge.indexOf("name === 'transfer_to_specialist'"));
  assert.match(toolBranch, /if \(!leadSaved\)/);
  assert.ok(toolBranch.indexOf('if (!leadSaved)') < toolBranch.indexOf('twilioUpdateCall(callSid'));
});

test('lead state is set only after a persisted lead identifier', () => {
  assert.match(bridge, /typeof persisted\.lead\?\.id !== 'string'/);
  const code = bridge.slice(bridge.indexOf("name === 'submit_business_profile'"), bridge.indexOf("} else if (name === 'submit_support_intake')"));
  assert.ok(code.indexOf("typeof persisted.lead?.id") < code.indexOf("leadSaved = true"));
});
