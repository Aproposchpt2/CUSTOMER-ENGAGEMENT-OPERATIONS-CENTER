# Sales and Support authoritative staging checkpoint

October 25, 2026. STELLAR INTELLIGENT TECHNOLOGIES, operated by Apropos Group LLC.

Current handoff: FLY-HANDOFF.md. Current curated staging-only caller content: caller/articles.json. Content precedence and limitations: caller/DECISIONS.md. Source hashes: source/manifest.json. Engineering evidence: EVIDENCE.md.

Source integration is complete: 250 KB records, all 32 fields for 250 product intents, 630 unexecuted acceptance specifications and the separate Summit HVAC package. Hosted internal source registry contains 655 verified rows. All original HVAC content is preserved.

Staging caller-v2 implementation is complete: 269 scoped answers, isolated service-role-only retrieval RPC, explicit dates, test-only controls, exact UUID readback, cross-product rejection and opt-in bridge consumer. Caller-v2 data is available in the staging database; deployed Fly environments were not changed. Old zero-eligible counts refer to the legacy KB only.

Runtime integration reconciles PR #142/#143 with #146 on an isolated review candidate. Both Dockerfiles include the v2 dependencies. Summit v2 taxonomy is 19 HVAC plus 33 shared intents; platform account-administration intents are excluded. Only verified Sales intake and Summit intake may write, after observed confirmation. Unsupported tools return limitations.

Existing source/draft tables and historical reports remain for audit. They must not override this current checkpoint or be independently deployed. No production, PMA domain, IVR or Twilio routing change was made.

Remaining Fly responsibility: verify exact running image and configuration, deploy only through the owner-authorized staging release process, and record signed-session/telephone acceptance. The 630 natural-language test specifications remain NOT_EXECUTED until actual voice results exist.

Rebuild source: scripts/import-specialist-source.py OWNER_UPLOAD_DIR docs/specialist-staging/source. Generate source seed: scripts/build-specialist-source-seed.py docs/specialist-staging/source SCRATCH_SQL_DIR. Curate caller package: scripts/build-specialist-caller-package.py. Generate caller seed: scripts/seed-specialist-caller-package.py SCRATCH_SQL_DIR. Apply only to hvzauakkhlivzeqatfqm. Original source approval state is preserved; staging curation is not production approval.
