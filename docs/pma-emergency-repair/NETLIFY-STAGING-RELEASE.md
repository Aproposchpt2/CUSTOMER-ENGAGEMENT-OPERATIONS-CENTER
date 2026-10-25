# Authorized staging release

On October 24, 2026, owner-authorized restricted emergency database operations were applied to hvzauakkhlivzeqatfqm. Version 2 source and structured definitions are in docs/pma-v2; 36 KB and 28 intent entries were verified as internal implementation references in staging.

Netlify ai4cc-staging (06deb5c7-83b8-401c-bdc5-745d802e3f26) is now linked to this existing repository. Its staging release branch release/pma-emergency-staging-20261024 points to 73f33aebec15ba43874205f92b99bbb47647be9a. Deploy 6add1f33f0616316d01ea3e5 is ready at that exact revision. Only pma-validation is additionally enabled for branch deploys, to update the existing alias used by the bridge. The business production site is outside this release.

This documentation commit intentionally triggers the matching pma-validation branch deploy. Actual incident creation, SMS acceptance and handset delivery must be verified on that alias before declaring emergency dispatch working. Email remains logged/unsent. All v2 intent workflows are not automatically enabled by their reference upload.
