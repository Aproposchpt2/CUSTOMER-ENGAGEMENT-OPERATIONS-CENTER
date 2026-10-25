-- REVIEW ONLY: owner approval required before applying to staging.
BEGIN;
ALTER FUNCTION public.stellar_create_hvac_demo_support_intake(uuid,text,text,text,text,text,date,text,text,text,text) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.stellar_create_hvac_demo_support_intake(uuid,text,text,text,text,text,date,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_create_hvac_demo_support_intake(uuid,text,text,text,text,text,date,text,text,text,text) TO service_role;
COMMIT;
