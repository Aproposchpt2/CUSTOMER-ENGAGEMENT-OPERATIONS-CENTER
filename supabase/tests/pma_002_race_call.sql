-- Replace __OPERATION__ with one of the two explicit synthetic operation IDs.
begin;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('pma.synthetic_tours_enabled','on',true);
set local role authenticated;
create temporary table pma002_race_result on commit drop as
with started as materialized (select clock_timestamp() as started,txid_current() as transaction_id)
select started.*,public.pm_request_or_book_showing_v1('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',null,'__OPERATION__','2099-10-25T17:00:00Z','Synthetic competing caller','90000000-0000-4000-8000-000000000001',1) as outcome from started;
select pg_sleep(1);
select started,transaction_id,outcome,clock_timestamp() as finishing from pma002_race_result;
commit;
