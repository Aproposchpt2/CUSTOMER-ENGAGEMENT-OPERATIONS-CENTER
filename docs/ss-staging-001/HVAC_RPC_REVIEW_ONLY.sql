-- REVIEW ONLY. Not applied. Separate staging schema approval and verification required.
-- Existing postgres-owned SECURITY DEFINER makes current_user role guard always fail.
-- Invoker mode preserves service_role guard and existing tenant/metadata restrictions.
-- Verify EXECUTE grants and required table permissions before applying in staging.
ALTER FUNCTION public.stellar_create_hvac_demo_support_intake(
 uuid,text,text,text,text,text,date,text,text,text,text
) SECURITY INVOKER;
-- Acceptance after application: service_role fictional write + same-session replay,
-- tenant-scoped row verification, foreign tenant rejection, anon rejection,
-- and no notifications. Do not weaken the tenant/metadata guard.
