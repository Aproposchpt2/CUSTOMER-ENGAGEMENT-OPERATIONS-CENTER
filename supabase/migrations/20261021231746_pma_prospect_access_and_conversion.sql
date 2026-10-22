begin;
alter table public.pm_properties add column accepts_inquiries boolean not null default false;
-- An identity/interest relationship, not a duplicate prospect or CRM record.
create table public.pm_prospect_interests (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,property_id uuid not null,
 auth_user_id uuid not null references auth.users(id), contact_id uuid not null, lead_id uuid not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),
 foreign key(tenant_id,contact_id) references public.ai4cc_contacts(tenant_id,id),
 foreign key(tenant_id,lead_id) references public.ai4cc_leads(tenant_id,id),unique(tenant_id,property_id,auth_user_id)
);
alter table public.pm_prospect_interests enable row level security;
revoke all on public.pm_prospect_interests from public,anon;
grant select on public.pm_prospect_interests to authenticated;
grant all on public.pm_prospect_interests to service_role;
create policy prospect_interest_select on public.pm_prospect_interests for select to authenticated using(private.pm_staff(tenant_id,property_id) or auth_user_id=(select auth.uid()));
create policy prospect_interest_insert on public.pm_prospect_interests for insert to authenticated with check(false);
create policy prospect_interest_update on public.pm_prospect_interests for update to authenticated using(false) with check(false);
create policy prospect_interest_delete on public.pm_prospect_interests for delete to authenticated using(false);
create index pm_prospect_interests_scope on public.pm_prospect_interests(tenant_id,property_id);
create trigger pm_prospect_interests_audit after insert on public.pm_prospect_interests for each row execute function private.pm_audit();

-- Deliberately curated public information for signed-in prospective residents.
create function private.pm_available_properties() returns jsonb language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'amenities',p.amenities,
 'availabilityRequiresConfirmation',true,'knowledge',(select coalesce(jsonb_agg(jsonb_build_object('title',k.title,'content',k.content)),'[]'::jsonb) from public.ai4cc_knowledge_entries k where k.tenant_id=p.tenant_id and k.property_id=p.id and k.approved and k.visibility='public'))),'[]'::jsonb) end
 from public.pm_properties p join public.tenants w on w.id=p.tenant_id where p.accepts_inquiries and p.status='active' and w.status='ACTIVE';
$$;
create function public.pm_available_properties() returns jsonb language sql security invoker set search_path='' as $$ select private.pm_available_properties(); $$;

create function private.pm_prospect_inquiry(p uuid,full_name text,msg text,at_time timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare prop public.pm_properties; interest public.pm_prospect_interests; c uuid;l uuid; email text;s public.pm_showings;
begin
 if auth.uid() is null or length(trim(full_name)) not between 2 and 160 or length(msg) not between 1 and 4000 then raise exception 'Verified identity and inquiry required' using errcode='42501'; end if;
 select u.email into email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
 if email is null then raise exception 'Confirm your existing account email first' using errcode='42501'; end if;
 select * into prop from public.pm_properties where id=p and accepts_inquiries and status='active';
 if not found or not exists(select 1 from public.tenants w where w.id=prop.tenant_id and w.status='ACTIVE') then raise exception 'Property not accepting inquiries' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':prospect:'||p::text,0));
 select * into interest from public.pm_prospect_interests where property_id=p and auth_user_id=auth.uid();
 if found then c=interest.contact_id;l=interest.lead_id;
 else
   insert into public.ai4cc_contacts(tenant_id,display_name,email,lead_source,metadata) values(prop.tenant_id,full_name,email,'pma',jsonb_build_object('source','pma','synthetic',true)) returning id into c;
   insert into public.ai4cc_leads(tenant_id,contact_id,title,service_interest,description,metadata) values(prop.tenant_id,c,'Property leasing inquiry','Property leasing',msg,jsonb_build_object('source','pma','property_id',p,'synthetic',true)) returning id into l;
   insert into public.pm_prospect_interests(tenant_id,property_id,auth_user_id,contact_id,lead_id) values(prop.tenant_id,p,auth.uid(),c,l);
 end if;
 if at_time is not null then
   if at_time<=now() then raise exception 'Choose a future showing time' using errcode='23514'; end if;
   insert into public.pm_showings(tenant_id,property_id,contact_id,lead_id,requested_at,notes,idempotency_key)
   values(prop.tenant_id,p,c,l,at_time,msg,'prospect:'||auth.uid()::text||':'||p::text||':'||extract(epoch from at_time)::text)
   on conflict(tenant_id,idempotency_key) do update set notes=pm_showings.notes returning * into s;
 end if;
 return jsonb_build_object('leadId',l,'showingId',s.id,'showingStatus',case when s.id is null then null else 'requested' end,'availabilityGuaranteed',false,'housingDecisionMade',false);
end;
$$;
create function public.pm_prospect_inquiry(p uuid,full_name text,msg text,at_time timestamptz default null) returns jsonb language sql security invoker set search_path='' as $$ select private.pm_prospect_inquiry(p,full_name,msg,at_time); $$;

create function private.pm_convert_prospect(t uuid,p uuid,l uuid,u uuid,start_date date) returns jsonb language plpgsql security definer set search_path='' as $$
declare interest public.pm_prospect_interests;o public.pm_occupancies;un public.pm_units;
begin
 if auth.uid() is null or not private.pm_staff(t,p,true) then raise exception 'Forbidden' using errcode='42501'; end if;
 if not private.has_tenant_role(t,array['OWNER','ADMIN','MANAGER']) then raise exception 'Manager approval required' using errcode='42501'; end if;
 select * into un from public.pm_units where tenant_id=t and property_id=p and id=u for update;
 if not found then raise exception 'Unit not found' using errcode='23503'; end if;
 select * into interest from public.pm_prospect_interests where tenant_id=t and property_id=p and lead_id=l;
 if not found then raise exception 'Prospect interest not found' using errcode='23503'; end if;
 select * into o from public.pm_occupancies where tenant_id=t and unit_id=u and contact_id=interest.contact_id and status='active';
 if found then return jsonb_build_object('occupancyId',o.id,'replayed',true); end if;
 if un.status<>'vacant' or start_date is null then raise exception 'A vacant unit and move-in date are required' using errcode='23514'; end if;
 insert into public.pm_occupancies(tenant_id,property_id,unit_id,contact_id,auth_user_id,starts_on) values(t,p,u,interest.contact_id,interest.auth_user_id,start_date) returning * into o;
 update public.pm_units set status='occupied' where tenant_id=t and id=u;
 update public.ai4cc_leads set pipeline_stage='converted',status='won',converted_at=now() where tenant_id=t and id=l;
 return jsonb_build_object('occupancyId',o.id,'humanRecordedConversion',true);
end;
$$;
create function public.pm_convert_prospect(t uuid,p uuid,l uuid,u uuid,start_date date) returns jsonb language sql security invoker set search_path='' as $$ select private.pm_convert_prospect(t,p,l,u,start_date); $$;
revoke all on function private.pm_available_properties(),private.pm_prospect_inquiry(uuid,text,text,timestamptz),private.pm_convert_prospect(uuid,uuid,uuid,uuid,date),public.pm_available_properties(),public.pm_prospect_inquiry(uuid,text,text,timestamptz),public.pm_convert_prospect(uuid,uuid,uuid,uuid,date) from public,anon;
grant execute on function private.pm_available_properties(),private.pm_prospect_inquiry(uuid,text,text,timestamptz),private.pm_convert_prospect(uuid,uuid,uuid,uuid,date),public.pm_available_properties(),public.pm_prospect_inquiry(uuid,text,text,timestamptz),public.pm_convert_prospect(uuid,uuid,uuid,uuid,date) to authenticated;
commit;
