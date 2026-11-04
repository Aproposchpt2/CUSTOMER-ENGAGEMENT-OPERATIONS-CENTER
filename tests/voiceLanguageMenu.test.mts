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

test('attendant asks for language first and moves on when nothing is pressed', () => {
  const twiml = menu.attendantLanguageTwiml();
  assert.match(twiml, /For English, press 1\./);
  assert.match(twiml, /Para español, oprima 2\./);
  assert.match(twiml, /step=language/);
});

test('attendant offers all three departments in the chosen language', () => {
  assert.match(menu.attendantDepartmentTwiml('en', 1), /For Sales, press 1\. For Support, press 2\. To try our Customer Care Center demo, press 3\./);
  assert.match(menu.attendantDepartmentTwiml('es', 1), /Para ventas, oprima 1\. Para soporte, oprima 2\./);
  assert.match(menu.attendantDepartmentTwiml('es', 1), /lang=es/);
});

test('sales and support dial their lines and pass the language keypress', () => {
  const sales = menu.attendantRoute('1', 'en', 1).twiml;
  assert.ok(sales.includes(`<Number sendDigits="w1">${menu.SALES_LINE}</Number>`));
  const support = menu.attendantRoute('2', 'es', 1).twiml;
  assert.ok(support.includes(`<Number sendDigits="w2">${menu.SUPPORT_LINE}</Number>`));
});

test('the demo stays on this number and keeps the language', () => {
  const route = menu.attendantRoute('3', 'es', 1);
  assert.equal(route.demoLanguage, 'es');
  assert.ok(route.twiml.includes(menu.ELEVENLABS_INBOUND_URL));
});

test('a missed key repeats once, then goes to Sales', () => {
  assert.match(menu.attendantRoute('', 'en', 1).twiml, /attempt=2/);
  assert.ok(menu.attendantRoute('9', 'en', 2).twiml.includes(menu.SALES_LINE));
  assert.ok(menu.attendantRoute(undefined, 'en', 2).twiml.includes(menu.SALES_LINE));
});

test('a failed dial tells the caller instead of going silent', () => {
  assert.match(menu.attendantEndedTwiml('busy', 'en'), /could not connect/);
  assert.match(menu.attendantEndedTwiml('no-answer', 'es'), /No pudimos/);
  assert.doesNotMatch(menu.attendantEndedTwiml('completed', 'en'), /could not connect/);
});
