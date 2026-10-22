-- Applied to staging as pma_trusted_service_schema_usage, version 20261022171622.
-- Existing function EXECUTE grants already authorize the trusted backend path.
-- This grants name resolution only: no CREATE, table access, or new EXECUTE grants.
-- Anonymous and authenticated clients remain unable to call pm_trusted_catalog_turn.
grant usage on schema private to service_role;
