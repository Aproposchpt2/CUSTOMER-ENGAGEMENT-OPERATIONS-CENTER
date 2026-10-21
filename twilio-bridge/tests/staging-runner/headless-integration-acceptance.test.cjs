'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{authorized,integrationRpc}=require('./headless-integration-acceptance.cjs');
test('headless fixtures require explicit authorization',()=>{const old=process.env.STAGING_HEADLESS_INTEGRATION_AUTHORIZED;delete process.env.STAGING_HEADLESS_INTEGRATION_AUTHORIZED;assert.throws(authorized,/HEADLESS_AUTHORIZATION_REQUIRED/);if(old)process.env.STAGING_HEADLESS_INTEGRATION_AUTHORIZED=old;});
test('integration RPC rejects unlisted function before any connection',async()=>{await assert.rejects(integrationRpc()('arbitrary_sql',{}),/RPC_NOT_ALLOWED/);});
