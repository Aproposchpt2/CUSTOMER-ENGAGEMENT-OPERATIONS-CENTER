import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = readFileSync(new URL('../lib/voiceLanguageMenu.ts', import.meta.url), 'utf8');
const menu = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));

test('only the 2 key selects Spanish', () => {
  assert.equal(menu.languageForDigit('2'), 'es');
  for (const digits of ['1', '3', '*', '', undefined, 2]) assert.equal(menu.languageForDigit(digits), 'en');
});

test('menu offers both languages and connects the call when nothing is pressed', () => {
  const twiml = menu.menuTwiml();
  assert.match(twiml, /For English, press 1\./);
  assert.match(twiml, /Para español, oprima 2\./);
  assert.match(twiml, /numDigits="1"/);
  assert.ok(twiml.indexOf('</Gather>') < twiml.indexOf(`<Redirect method="POST">${menu.ELEVENLABS_INBOUND_URL}</Redirect>`));
});

test('after a choice the call goes to the ElevenLabs inbound address', () => {
  assert.ok(menu.connectToAgentTwiml().includes(`<Redirect method="POST">${menu.ELEVENLABS_INBOUND_URL}</Redirect>`));
});

test('only Spanish overrides the agent language', () => {
  assert.deepEqual(menu.initiationResponse('es', '+17025550100').conversation_config_override, { agent: { language: 'es' } });
  assert.equal('conversation_config_override' in menu.initiationResponse('en', '+17025550100'), false);
});

test('call start response keeps the caller number variable', () => {
  assert.equal(menu.initiationResponse('en', '+17025550100').dynamic_variables.caller_number, '702-555-0100');
  assert.equal(menu.initiationResponse('en', undefined).dynamic_variables.caller_number, '');
});

test('call SID check rejects anything that is not a Twilio call SID', () => {
  assert.equal(menu.isCallSid('CA' + 'a'.repeat(32)), true);
  for (const bad of ['CA123', 'SM' + 'a'.repeat(32), '', null, undefined]) assert.equal(menu.isCallSid(bad), false);
});
