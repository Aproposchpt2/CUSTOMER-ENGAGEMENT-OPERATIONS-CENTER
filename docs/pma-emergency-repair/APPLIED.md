# Authorized staging database repair applied

The owner separately authorized the restricted backend operation on October 24, 2026.

Applied migration: pma_staging_emergency_restricted_backend_v1
Project: hvzauakkhlivzeqatfqm
The exact reviewed SQL in staging-permission-repair.sql was applied successfully. Its original PROPOSED ONLY comment records its pre-authorization state; this status note supersedes that comment.

Verified: private definer implementations and public invoker wrappers exist for pm_staging_emergency_prepare_v1 and pm_staging_emergency_verify_v1. service_role has EXECUTE; anon does not. Raw table grants and RLS were not changed. Matching source deployment and a real live dispatch result are still required before declaring the emergency path working.
