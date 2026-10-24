import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {releasePlan}=require('../scripts/pma-prepare-availability-release.cjs');
test('PMA-005 R3: staging plan pins source and disabled gates without inventing a new image digest',()=>{
 const sha='a'.repeat(40),plan=releasePlan(sha);
 assert.equal(plan.app,'ai4-pma-bridge-staging');assert.equal(plan.sourceSha,sha);assert.equal(plan.buildArguments.PMA_SOURCE_SHA,sha);assert.equal(plan.registryDigest,null);assert.equal(plan.disabledGates.STAGING_VOICE_ORCHESTRATION_ENABLED,'false');
 for(const bad of ['', 'main','50f901d','x'.repeat(40)])assert.throws(()=>releasePlan(bad));
 const config=readFileSync(plan.configuration,'utf8');assert.match(config,/dockerfile = "Dockerfile.pma-staging"/);assert.match(config,/STAGING_VOICE_ORCHESTRATION_ENABLED = "false"/);assert.match(config,/STAGING_SUPPORT_WRITES_ENABLED = "false"/);
 const image=readFileSync(plan.dockerfile,'utf8');assert.match(image,/ARG PMA_SOURCE_SHA/);assert.match(image,/org.opencontainers.image.revision=\$\{PMA_SOURCE_SHA\}/);assert.match(image,/ENV BRIDGE_RELEASE_SHA=\$\{PMA_SOURCE_SHA\}/);assert.match(image,/pma-availability.cjs/);
});
