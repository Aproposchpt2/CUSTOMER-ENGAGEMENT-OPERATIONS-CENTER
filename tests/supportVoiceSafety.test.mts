import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../pages/experimental-support-voice.tsx', import.meta.url), 'utf8');

test('session startup alone does not claim delegated tool registration', () => {
  const block = page.slice(page.indexOf("v.type === 'session.started'"), page.indexOf("v.type === 'session.updated'"));
  assert.doesNotMatch(block, /toolRegistered\.current\s*=\s*true/);
  assert.match(block, /support intake not yet verified/);
});

test('support intake is confirmed only after HTTP persistence succeeds', () => {
  const call = page.slice(page.indexOf("inner.item?.name === 'submit_support_intake'"));
  assert.match(call, /if \(!response\.ok \|\| !payload\.customerId \|\| !payload\.caseId\)/);
  assert.ok(call.indexOf("if (!response.ok") < call.indexOf("submitted.current = true"));
  assert.match(call, /finally \{ submissionInFlight\.current = false; \}/);
});

test('new session resets submission lock', () => {
  assert.match(page, /submissionInFlight\.current = false; processedCalls\.current\.clear\(\)/);
});
