"""Regenerate only the catalog SQL body from reviewed shared configuration and engine sources.
The migration path must already exist (created by Supabase CLI)."""
import json,pathlib
r=pathlib.Path(__file__).resolve().parents[1];path=next((r/'supabase/migrations').glob('*pma_intent_catalog_v1.sql'))
c=json.loads((r/'twilio-bridge/pma-intent-catalog-v1.json').read_text());old=(r/'supabase/migrations/20261021235624_pma_knowledge_model_v1.sql').read_text()
s="begin;\ncreate function private.pm_catalog_config() returns jsonb language sql immutable security invoker set search_path='' as $cfg$ select $json$"+json.dumps(c,separators=(',',':'))+"$json$::jsonb; $cfg$;\nrevoke all on function private.pm_catalog_config() from public,anon;\ngrant execute on function private.pm_catalog_config() to authenticated,service_role;\n"
a=old.index('create function private.pm_knowledge_answer');b=old.index('revoke all on function private.pm_knowledge_answer',a)
s+=old[a:b].replace('create function','create or replace function',1).replace('if not private.pm_staff(t,p,true) then','if not (private.pm_staff(t,p,true) or private.pm_resident(t,p,c,u)) then')
a=old.index('create or replace function private.pm_record_channel_turn');b=old.index('create or replace function private.pm_available_properties',a)
s+=old[a:b].replace('if not private.pm_staff(t,p,true) then','if not (private.pm_staff(t,p,true) or private.pm_resident(t,p,c,u)) then')
s+=(r/'supabase/functions/pma_catalog_core.sql').read_text()+'\ncommit;\n';path.write_text(s)
