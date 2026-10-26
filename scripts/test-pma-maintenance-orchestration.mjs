#!/usr/bin/env node
/**
 * Offline contract check for the PMA voice maintenance orchestration.
 *
 * This test intentionally makes no network requests and creates no maintenance
 * records or notifications. The mocked gateway returns the current expected
 * authorization denial until a trusted resident/unit binding is provisioned.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const intents = require('../twilio-bridge/pma-intents.cjs');
const { createPmaAdapter } = require('../twilio-bridge/pma-adapter.cjs');

const message = "My kitchen sink won't drain.";
const modelOutput = {
  intent: 'MAINTENANCE_REQUEST',
  confidence: 0.98,
  entities: {
    category: 'plumbing',
    description: message,
    impact: 'The kitchen sink is blocked.',
    safety_indicators: [],
  },
};

const decision = intents.classify(message, modelOutput);
assert.equal(decision.intent, 'MAINTENANCE_REQUEST');
assert.equal(decision.action, 'maintenance');
assert.equal(decision.entities.category, 'plumbing');
console.log('PASS classifier: sink-drain report maps to MAINTENANCE_REQUEST / plumbing');

const env = {
  STELLAR_BRIDGE_STAGING: 'true',
  PMA_CHANNELS_ENABLED: 'true',
  PMA_STAGING_BASE_URL: 'https://pma-validation--ai4cc-staging.netlify.app',
  BRIDGE_HMAC_SECRET: 'offline-test-secret',
};
const context = {
  callSid: `CA${'a'.repeat(32)}`,
  sessionId: 'a0000000-0000-4000-8000-000000000001',
};

let gatewayCalls = 0;
let sentBody;
const adapter = createPmaAdapter(env, async (url, options) => {
  gatewayCalls += 1;
  assert.equal(url, `${env.PMA_STAGING_BASE_URL}/api/intake/pma-staging`);
  sentBody = JSON.parse(options.body);
  assert.equal(sentBody.call_sid, context.callSid);
  assert.equal(sentBody.session_id, context.sessionId);
  assert.equal(sentBody.agentRoute, 'property-management-assistant');
  assert.deepEqual(sentBody.modelOutput, modelOutput);
  return {
    ok: true,
    json: async () => ({
      result: {
        success: false,
        state: 'AUTHORIZATION_REQUIRED',
        interactionPersisted: true,
        domainPersisted: false,
        reply: 'Resident and unit authorization is required before a maintenance request can be created.',
      },
    }),
  };
});

const result = await adapter.submit({
  message,
  modelOutput,
  confirmed: true,
  maintenance: {
    category: 'plumbing',
    description: message,
    impact: 'The kitchen sink is blocked.',
    urgency: 'normal',
    safetyIndicators: [],
  },
}, context);

assert.equal(gatewayCalls, 1);
assert.equal(result.state, 'AUTHORIZATION_REQUIRED');
assert.equal(result.domainPersisted, false);
assert.equal(result.notificationSent, false);
assert.equal(result.requestId, undefined);
console.log('PASS gateway contract: trusted call/session context reached the mocked PMA gateway');
console.log('PASS authorization guard: no maintenance request or notification is claimed without resident/unit binding');
console.log('RESULT: ORCHESTRATION PATH VERIFIED THROUGH GATEWAY CONTRACT; DOMAIN WRITE BLOCKED BY CURRENT AUTHORIZATION POLICY');

// Invalid model classifications must be rejected before any gateway request.
let invalidGatewayCalls = 0;
const invalidAdapter = createPmaAdapter(env, async () => {
  invalidGatewayCalls += 1;
  throw new Error('Invalid model classification must not reach the gateway');
});
const invalid = await invalidAdapter.submit({
  message,
  intent: 'MAINTENANCE_REQUEST',
  confidence: 0.98,
  entities: { resident_identity: 'must-not-be-accepted' },
  confirmed: true,
}, context);
assert.equal(invalid.state, 'INVALID_CLASSIFICATION');
assert.equal(invalidGatewayCalls, 0);
console.log('PASS validation guard: invalid or identity-bearing model fields are rejected before gateway access');
