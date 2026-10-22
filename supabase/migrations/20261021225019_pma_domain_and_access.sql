-- Additive PMA domain. Applies to the approved Stellar staging schema.
-- No production communication, tenant duplication, CRM duplication or accounting.
begin;
create unique index if not exists ai4cc_contacts_tenant_identity on public.ai4cc_contacts(tenant_id,id);
create unique index if not exists ai4cc_leads_tenant_identity on public.ai4cc_leads(tenant_id,id);
create unique index if not exists ai4cc_interactions_tenant_identity on public.ai4cc_interactions(tenant_id,id);

create table public.pm_properties (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null check(length(trim(name)) between 1 and 160), address text not null default '',
 status text not null default 'active' check(status in ('active','inactive')),
 amenities text not null default '', emergency_instructions text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id)
);
create table public.pm_property_staff (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null,
 user_id uuid not null references auth.users(id), can_write boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id), unique(tenant_id,property_id,user_id)
);
create table public.pm_units (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null,
 label text not null check(length(trim(label)) between 1 and 80), bedrooms smallint check(bedrooms between 0 and 30),
 status text not null default 'vacant' check(status in ('vacant','occupied','unavailable')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),
 unique(tenant_id,property_id,id), unique(tenant_id,property_id,label)
);
create table public.pm_occupancies (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, unit_id uuid not null,
 contact_id uuid not null, auth_user_id uuid references auth.users(id),
 starts_on date not null default current_date, ends_on date, status text not null default 'active' check(status in ('active','ended')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_on is null or ends_on >= starts_on),
 foreign key(tenant_id,property_id,unit_id) references public.pm_units(tenant_id,property_id,id),
 foreign key(tenant_id,contact_id) references public.ai4cc_contacts(tenant_id,id), unique(tenant_id,property_id,id)
);
create unique index pm_active_occupancy_contact on public.pm_occupancies(tenant_id,unit_id,contact_id) where status='active';
create table public.pm_vendors (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), contact_id uuid not null,
 auth_user_id uuid references auth.users(id), trade text not null check(length(trim(trade)) between 1 and 100),
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,contact_id) references public.ai4cc_contacts(tenant_id,id), unique(tenant_id,id), unique(tenant_id,contact_id)
);
create table public.pm_property_vendors (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, vendor_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),
 foreign key(tenant_id,vendor_id) references public.pm_vendors(tenant_id,id), unique(tenant_id,property_id,vendor_id)
);
create table public.pm_maintenance_requests (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, unit_id uuid,
 contact_id uuid not null, interaction_id uuid, summary text not null check(length(trim(summary)) between 3 and 500),
 description text not null default '' check(length(description)<=8000),
 category text not null default 'other' check(category in ('plumbing','electrical','hvac','structural','appliance','other')),
 priority text not null default 'normal' check(priority in ('low','normal','high','emergency')),
 status text not null default 'New' check(status in ('New','Assigned','Scheduled','In Progress','Completed','Closed')),
 source_channel text not null default 'web' check(source_channel in ('web','voice','sms','chat')),
 idempotency_key text not null check(length(idempotency_key) between 8 and 200), scheduled_at timestamptz, resolution text,
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),
 foreign key(tenant_id,property_id,unit_id) references public.pm_units(tenant_id,property_id,id),
 foreign key(tenant_id,contact_id) references public.ai4cc_contacts(tenant_id,id),
 foreign key(tenant_id,interaction_id) references public.ai4cc_interactions(tenant_id,id),
 unique(tenant_id,property_id,id), unique(tenant_id,idempotency_key)
);
create table public.pm_vendor_assignments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, request_id uuid not null, vendor_id uuid not null,
 status text not null default 'assigned' check(status in ('assigned','accepted','declined','completed','cancelled')),
 vendor_notes text not null default '' check(length(vendor_notes)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id,request_id) references public.pm_maintenance_requests(tenant_id,property_id,id),
 foreign key(tenant_id,property_id,vendor_id) references public.pm_property_vendors(tenant_id,property_id,vendor_id)
);
create unique index pm_one_active_vendor on public.pm_vendor_assignments(tenant_id,request_id) where status in ('assigned','accepted');
create table public.pm_maintenance_activity (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, request_id uuid not null,
 event_type text not null, body text not null default '', actor_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(tenant_id,property_id,request_id) references public.pm_maintenance_requests(tenant_id,property_id,id)
);
create table public.pm_showings (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, unit_id uuid,
 contact_id uuid not null, lead_id uuid, requested_at timestamptz not null,
 status text not null default 'requested' check(status in ('requested','confirmed','completed','cancelled')),
 notes text not null default '' check(length(notes)<=4000), idempotency_key text not null check(length(idempotency_key) between 8 and 200),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id),
 foreign key(tenant_id,property_id,unit_id) references public.pm_units(tenant_id,property_id,id),
 foreign key(tenant_id,contact_id) references public.ai4cc_contacts(tenant_id,id),
 foreign key(tenant_id,lead_id) references public.ai4cc_leads(tenant_id,id), unique(tenant_id,idempotency_key)
);
-- Shared Knowledge Vault persistence, not a second property knowledge engine.
create table public.ai4cc_knowledge_entries (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), property_id uuid,
 title text not null check(length(trim(title)) between 1 and 200), category text not null default 'general',
 content text not null check(length(content) between 1 and 16000), tags text[] not null default '{}',
 visibility text not null default 'staff' check(visibility in ('public','resident','staff')),
 approved boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,property_id) references public.pm_properties(tenant_id,id)
);
create table public.pm_attachments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, property_id uuid not null, request_id uuid not null,
 object_path text not null unique, file_name text not null, mime_type text not null,
 size_bytes integer not null check(size_bytes between 1 and 5242880), created_at timestamptz not null default now(),
 foreign key(tenant_id,property_id,request_id) references public.pm_maintenance_requests(tenant_id,property_id,id)
);

-- Private RLS helpers inspect existing membership, never user-editable JWT metadata.
create or replace function private.pm_owner(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.tenants w join public.tenant_users m on m.tenant_id=w.id
 where w.id=t and w.status in ('ACTIVE','SETUP') and m.user_id=auth.uid() and m.status='ACTIVE' and m.role in ('OWNER','ADMIN'));
$$;
create or replace function private.pm_staff(t uuid,p uuid,writing boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.pm_owner(t) or exists(select 1 from public.tenant_users m
 join public.tenants w on w.id=m.tenant_id join public.pm_property_staff g on g.tenant_id=m.tenant_id and g.user_id=m.user_id
 where m.tenant_id=t and g.property_id=p and m.user_id=auth.uid() and m.status='ACTIVE' and w.status in ('ACTIVE','SETUP')
 and (not writing or (m.role in ('MANAGER','AGENT') and g.can_write))));
$$;
create or replace function private.pm_resident(t uuid,p uuid,c uuid default null,u uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pm_occupancies o join public.tenants w on w.id=o.tenant_id
 where o.tenant_id=t and o.property_id=p and o.auth_user_id=auth.uid() and o.status='active'
 and o.starts_on<=current_date and (o.ends_on is null or o.ends_on>=current_date)
 and (c is null or o.contact_id=c) and (u is null or o.unit_id=u) and w.status in ('ACTIVE','SETUP'));
$$;
create or replace function private.pm_vendor(t uuid,v uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pm_vendors x join public.tenants w on w.id=x.tenant_id
 where x.tenant_id=t and x.id=v and x.auth_user_id=auth.uid() and x.status='active' and w.status in ('ACTIVE','SETUP'));
$$;
create or replace function private.pm_assigned(t uuid,r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pm_vendor_assignments a where a.tenant_id=t and a.request_id=r
 and a.status in ('assigned','accepted','completed') and private.pm_vendor(t,a.vendor_id));
$$;
revoke all on function private.pm_owner(uuid), private.pm_staff(uuid,uuid,boolean), private.pm_resident(uuid,uuid,uuid,uuid), private.pm_vendor(uuid,uuid), private.pm_assigned(uuid,uuid) from public,anon;
grant execute on function private.pm_owner(uuid), private.pm_staff(uuid,uuid,boolean), private.pm_resident(uuid,uuid,uuid,uuid), private.pm_vendor(uuid,uuid), private.pm_assigned(uuid,uuid) to authenticated,service_role;

alter table public.pm_properties enable row level security;
revoke all on public.pm_properties from anon;
grant select,insert,update,delete on public.pm_properties to authenticated;
grant all on public.pm_properties to service_role;
create policy pm_properties_select on public.pm_properties for select to authenticated using (private.pm_staff(tenant_id,id) or private.pm_resident(tenant_id,id));
create policy pm_properties_insert on public.pm_properties for insert to authenticated with check (private.pm_owner(tenant_id));
create policy pm_properties_update on public.pm_properties for update to authenticated using (private.pm_owner(tenant_id)) with check (private.pm_owner(tenant_id));
create policy pm_properties_delete on public.pm_properties for delete to authenticated using (false);
create index pm_properties_tenant_idx on public.pm_properties(tenant_id);

alter table public.pm_property_staff enable row level security;
revoke all on public.pm_property_staff from anon;
grant select,insert,update,delete on public.pm_property_staff to authenticated;
grant all on public.pm_property_staff to service_role;
create policy pm_property_staff_select on public.pm_property_staff for select to authenticated using (private.pm_owner(tenant_id) or user_id=(select auth.uid()));
create policy pm_property_staff_insert on public.pm_property_staff for insert to authenticated with check (private.pm_owner(tenant_id));
create policy pm_property_staff_update on public.pm_property_staff for update to authenticated using (private.pm_owner(tenant_id)) with check (private.pm_owner(tenant_id));
create policy pm_property_staff_delete on public.pm_property_staff for delete to authenticated using (false);
create index pm_property_staff_tenant_idx on public.pm_property_staff(tenant_id);

alter table public.pm_units enable row level security;
revoke all on public.pm_units from anon;
grant select,insert,update,delete on public.pm_units to authenticated;
grant all on public.pm_units to service_role;
create policy pm_units_select on public.pm_units for select to authenticated using (private.pm_staff(tenant_id,property_id) or private.pm_resident(tenant_id,property_id,null,id));
create policy pm_units_insert on public.pm_units for insert to authenticated with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_units_update on public.pm_units for update to authenticated using (private.pm_staff(tenant_id,property_id,true)) with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_units_delete on public.pm_units for delete to authenticated using (false);
create index pm_units_tenant_idx on public.pm_units(tenant_id);

alter table public.pm_occupancies enable row level security;
revoke all on public.pm_occupancies from anon;
grant select,insert,update,delete on public.pm_occupancies to authenticated;
grant all on public.pm_occupancies to service_role;
create policy pm_occupancies_select on public.pm_occupancies for select to authenticated using (private.pm_staff(tenant_id,property_id) or (auth_user_id=(select auth.uid()) and private.pm_resident(tenant_id,property_id,contact_id,unit_id)));
create policy pm_occupancies_insert on public.pm_occupancies for insert to authenticated with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_occupancies_update on public.pm_occupancies for update to authenticated using (private.pm_staff(tenant_id,property_id,true)) with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_occupancies_delete on public.pm_occupancies for delete to authenticated using (false);
create index pm_occupancies_tenant_idx on public.pm_occupancies(tenant_id);

alter table public.pm_vendors enable row level security;
revoke all on public.pm_vendors from anon;
grant select,insert,update,delete on public.pm_vendors to authenticated;
grant all on public.pm_vendors to service_role;
create policy pm_vendors_select on public.pm_vendors for select to authenticated using (private.pm_owner(tenant_id) or private.pm_vendor(tenant_id,id));
create policy pm_vendors_insert on public.pm_vendors for insert to authenticated with check (private.pm_owner(tenant_id));
create policy pm_vendors_update on public.pm_vendors for update to authenticated using (private.pm_owner(tenant_id)) with check (private.pm_owner(tenant_id));
create policy pm_vendors_delete on public.pm_vendors for delete to authenticated using (false);
create index pm_vendors_tenant_idx on public.pm_vendors(tenant_id);

alter table public.pm_property_vendors enable row level security;
revoke all on public.pm_property_vendors from anon;
grant select,insert,update,delete on public.pm_property_vendors to authenticated;
grant all on public.pm_property_vendors to service_role;
create policy pm_property_vendors_select on public.pm_property_vendors for select to authenticated using (private.pm_staff(tenant_id,property_id) or private.pm_vendor(tenant_id,vendor_id));
create policy pm_property_vendors_insert on public.pm_property_vendors for insert to authenticated with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_property_vendors_update on public.pm_property_vendors for update to authenticated using (private.pm_staff(tenant_id,property_id,true)) with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_property_vendors_delete on public.pm_property_vendors for delete to authenticated using (false);
create index pm_property_vendors_tenant_idx on public.pm_property_vendors(tenant_id);

alter table public.pm_maintenance_requests enable row level security;
revoke all on public.pm_maintenance_requests from anon;
grant select,insert,update,delete on public.pm_maintenance_requests to authenticated;
grant all on public.pm_maintenance_requests to service_role;
create policy pm_maintenance_requests_select on public.pm_maintenance_requests for select to authenticated using (private.pm_staff(tenant_id,property_id) or private.pm_resident(tenant_id,property_id,contact_id,unit_id) or private.pm_assigned(tenant_id,id));
create policy pm_maintenance_requests_insert on public.pm_maintenance_requests for insert to authenticated with check ((private.pm_staff(tenant_id,property_id,true)) or (unit_id is not null and private.pm_resident(tenant_id,property_id,contact_id,unit_id) and status='New'));
create policy pm_maintenance_requests_update on public.pm_maintenance_requests for update to authenticated using (private.pm_staff(tenant_id,property_id,true)) with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_maintenance_requests_delete on public.pm_maintenance_requests for delete to authenticated using (false);
create index pm_maintenance_requests_tenant_idx on public.pm_maintenance_requests(tenant_id);

alter table public.pm_vendor_assignments enable row level security;
revoke all on public.pm_vendor_assignments from anon;
grant select,insert,update,delete on public.pm_vendor_assignments to authenticated;
grant all on public.pm_vendor_assignments to service_role;
create policy pm_vendor_assignments_select on public.pm_vendor_assignments for select to authenticated using (private.pm_staff(tenant_id,property_id) or private.pm_vendor(tenant_id,vendor_id));
create policy pm_vendor_assignments_insert on public.pm_vendor_assignments for insert to authenticated with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_vendor_assignments_update on public.pm_vendor_assignments for update to authenticated using (private.pm_staff(tenant_id,property_id,true)) with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_vendor_assignments_delete on public.pm_vendor_assignments for delete to authenticated using (false);
create index pm_vendor_assignments_tenant_idx on public.pm_vendor_assignments(tenant_id);

alter table public.pm_maintenance_activity enable row level security;
revoke all on public.pm_maintenance_activity from anon;
grant select,insert,update,delete on public.pm_maintenance_activity to authenticated;
grant all on public.pm_maintenance_activity to service_role;
create policy pm_maintenance_activity_select on public.pm_maintenance_activity for select to authenticated using (private.pm_staff(tenant_id,property_id) or private.pm_assigned(tenant_id,request_id) or exists(select 1 from public.pm_maintenance_requests r where r.id=request_id and r.tenant_id=pm_maintenance_activity.tenant_id and private.pm_resident(r.tenant_id,r.property_id,r.contact_id,r.unit_id)));
create policy pm_maintenance_activity_insert on public.pm_maintenance_activity for insert to authenticated with check (false);
create policy pm_maintenance_activity_update on public.pm_maintenance_activity for update to authenticated using (false) with check (false);
create policy pm_maintenance_activity_delete on public.pm_maintenance_activity for delete to authenticated using (false);
create index pm_maintenance_activity_tenant_idx on public.pm_maintenance_activity(tenant_id);

alter table public.pm_showings enable row level security;
revoke all on public.pm_showings from anon;
grant select,insert,update,delete on public.pm_showings to authenticated;
grant all on public.pm_showings to service_role;
create policy pm_showings_select on public.pm_showings for select to authenticated using (private.pm_staff(tenant_id,property_id));
create policy pm_showings_insert on public.pm_showings for insert to authenticated with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_showings_update on public.pm_showings for update to authenticated using (private.pm_staff(tenant_id,property_id,true)) with check (private.pm_staff(tenant_id,property_id,true));
create policy pm_showings_delete on public.pm_showings for delete to authenticated using (false);
create index pm_showings_tenant_idx on public.pm_showings(tenant_id);

alter table public.ai4cc_knowledge_entries enable row level security;
revoke all on public.ai4cc_knowledge_entries from anon;
grant select,insert,update,delete on public.ai4cc_knowledge_entries to authenticated;
grant all on public.ai4cc_knowledge_entries to service_role;
create policy ai4cc_knowledge_entries_select on public.ai4cc_knowledge_entries for select to authenticated using ((property_id is null and private.is_tenant_member(tenant_id)) or private.pm_staff(tenant_id,property_id) or (approved and visibility in ('public','resident') and private.pm_resident(tenant_id,property_id)));
create policy ai4cc_knowledge_entries_insert on public.ai4cc_knowledge_entries for insert to authenticated with check ((property_id is null and private.pm_owner(tenant_id)) or private.pm_staff(tenant_id,property_id,true));
create policy ai4cc_knowledge_entries_update on public.ai4cc_knowledge_entries for update to authenticated using ((property_id is null and private.pm_owner(tenant_id)) or private.pm_staff(tenant_id,property_id,true)) with check ((property_id is null and private.pm_owner(tenant_id)) or private.pm_staff(tenant_id,property_id,true));
create policy ai4cc_knowledge_entries_delete on public.ai4cc_knowledge_entries for delete to authenticated using (false);
create index ai4cc_knowledge_entries_tenant_idx on public.ai4cc_knowledge_entries(tenant_id);

alter table public.pm_attachments enable row level security;
revoke all on public.pm_attachments from anon;
grant select,insert,update,delete on public.pm_attachments to authenticated;
grant all on public.pm_attachments to service_role;
create policy pm_attachments_select on public.pm_attachments for select to authenticated using (exists(select 1 from public.pm_maintenance_requests r where r.tenant_id=pm_attachments.tenant_id and r.id=request_id));
create policy pm_attachments_insert on public.pm_attachments for insert to authenticated with check (private.pm_staff(tenant_id,property_id,true) or exists(select 1 from public.pm_maintenance_requests r where r.tenant_id=pm_attachments.tenant_id and r.id=request_id and private.pm_resident(r.tenant_id,r.property_id,r.contact_id,r.unit_id)));
create policy pm_attachments_update on public.pm_attachments for update to authenticated using (private.pm_staff(tenant_id,property_id,true) or exists(select 1 from public.pm_maintenance_requests r where r.tenant_id=pm_attachments.tenant_id and r.id=request_id and private.pm_resident(r.tenant_id,r.property_id,r.contact_id,r.unit_id))) with check (private.pm_staff(tenant_id,property_id,true) or exists(select 1 from public.pm_maintenance_requests r where r.tenant_id=pm_attachments.tenant_id and r.id=request_id and private.pm_resident(r.tenant_id,r.property_id,r.contact_id,r.unit_id)));
create policy pm_attachments_delete on public.pm_attachments for delete to authenticated using (false);
create index pm_attachments_tenant_idx on public.pm_attachments(tenant_id);

create or replace function private.pm_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
   if new.tenant_id is distinct from old.tenant_id or new.id is distinct from old.id then raise exception 'Immutable workspace identity' using errcode='23514'; end if;
   if (to_jsonb(new)->>'property_id') is distinct from (to_jsonb(old)->>'property_id') then raise exception 'Immutable property scope' using errcode='23514'; end if;
   new.updated_at=now();
 end if;
 if TG_TABLE_NAME='pm_maintenance_requests' then
   if TG_OP='INSERT' and new.status<>'New' then raise exception 'New requests must start New' using errcode='23514'; end if;
   if TG_OP='UPDATE' then
     if new.contact_id<>old.contact_id or new.unit_id is distinct from old.unit_id or new.idempotency_key<>old.idempotency_key then raise exception 'Immutable request identity' using errcode='23514'; end if;
     if new.status<>old.status and not (
       (old.status='New' and new.status='Assigned') or (old.status='Assigned' and new.status='Scheduled') or
       (old.status='Scheduled' and new.status='In Progress') or (old.status='In Progress' and new.status='Completed') or
       (old.status='Completed' and new.status='Closed')) then raise exception 'Invalid maintenance transition' using errcode='23514'; end if;
     if new.status in ('Assigned','Scheduled','In Progress') and not exists(select 1 from public.pm_vendor_assignments a where a.tenant_id=new.tenant_id and a.request_id=new.id and a.status in ('assigned','accepted')) then raise exception 'An active vendor assignment is required' using errcode='23514'; end if;
     if new.status='Scheduled' and new.scheduled_at is null then raise exception 'Schedule is required' using errcode='23514'; end if;
     if new.status='Completed' and nullif(trim(new.resolution),'') is null then raise exception 'Completion details are required' using errcode='23514'; end if;
     new.version=old.version+1;
   end if;
 end if;
 return new;
end;
$$;
create or replace function private.pm_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb=to_jsonb(new); task uuid;
begin
 -- Only trigger invocation is allowed. Identity comes from the verified Auth request.
 if pg_trigger_depth()<1 then raise exception 'Trigger only'; end if;
 insert into public.audit_log(tenant_id,actor_user_id,action,entity_type,entity_id,details)
 values(new.tenant_id,auth.uid(),'pma.'||lower(TG_OP),TG_TABLE_NAME,new.id::text,
 jsonb_build_object('property_id',r->>'property_id','status',r->>'status'));
 if TG_TABLE_NAME='pm_maintenance_requests' then
   insert into public.pm_maintenance_activity(tenant_id,property_id,request_id,event_type,body,actor_user_id)
   values(new.tenant_id,new.property_id,new.id,case when TG_OP='INSERT' then 'created' else 'updated' end,new.status,auth.uid());
 end if;
 if (TG_TABLE_NAME='pm_maintenance_requests' and (TG_OP='INSERT' or r->>'status' is distinct from to_jsonb(old)->>'status')) or TG_TABLE_NAME='pm_vendor_assignments' then
   insert into public.automation_tasks(tenant_id,task_code,task_name,task_type,status,requires_intervention,intervention_reason,payload)
   values(new.tenant_id,'PMA_NOTIFICATION','Property operations notification','MANUAL','BLOCKED',true,
   'PMA sandbox: production communications disabled',jsonb_build_object('source','pma','sandbox',true,'entity_type',TG_TABLE_NAME,'entity_id',new.id,'property_id',r->>'property_id','status',r->>'status','delivery_state','NOT_SENT')) returning id into task;
 end if;
 return new;
end;
$$;
revoke all on function private.pm_guard(),private.pm_audit() from public,anon,authenticated;
create trigger pm_properties_guard before insert or update on public.pm_properties for each row execute function private.pm_guard();
create trigger pm_properties_audit after insert or update on public.pm_properties for each row execute function private.pm_audit();
create trigger pm_property_staff_guard before insert or update on public.pm_property_staff for each row execute function private.pm_guard();
create trigger pm_property_staff_audit after insert or update on public.pm_property_staff for each row execute function private.pm_audit();
create trigger pm_units_guard before insert or update on public.pm_units for each row execute function private.pm_guard();
create trigger pm_units_audit after insert or update on public.pm_units for each row execute function private.pm_audit();
create trigger pm_occupancies_guard before insert or update on public.pm_occupancies for each row execute function private.pm_guard();
create trigger pm_occupancies_audit after insert or update on public.pm_occupancies for each row execute function private.pm_audit();
create trigger pm_vendors_guard before insert or update on public.pm_vendors for each row execute function private.pm_guard();
create trigger pm_vendors_audit after insert or update on public.pm_vendors for each row execute function private.pm_audit();
create trigger pm_property_vendors_guard before insert or update on public.pm_property_vendors for each row execute function private.pm_guard();
create trigger pm_property_vendors_audit after insert or update on public.pm_property_vendors for each row execute function private.pm_audit();
create trigger pm_maintenance_requests_guard before insert or update on public.pm_maintenance_requests for each row execute function private.pm_guard();
create trigger pm_maintenance_requests_audit after insert or update on public.pm_maintenance_requests for each row execute function private.pm_audit();
create trigger pm_vendor_assignments_guard before insert or update on public.pm_vendor_assignments for each row execute function private.pm_guard();
create trigger pm_vendor_assignments_audit after insert or update on public.pm_vendor_assignments for each row execute function private.pm_audit();
create trigger pm_showings_guard before insert or update on public.pm_showings for each row execute function private.pm_guard();
create trigger pm_showings_audit after insert or update on public.pm_showings for each row execute function private.pm_audit();
create trigger ai4cc_knowledge_entries_guard before insert or update on public.ai4cc_knowledge_entries for each row execute function private.pm_guard();
create trigger ai4cc_knowledge_entries_audit after insert or update on public.ai4cc_knowledge_entries for each row execute function private.pm_audit();
create trigger pm_attachments_audit after insert or update on public.pm_attachments for each row execute function private.pm_audit();

-- Private attachment bucket. Paths are workspace/property/request/random-file, never public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pma-attachments','pma-attachments',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
-- Only files registered by an authorized upload flow are readable. Direct writes are denied.
create policy pma_file_read on storage.objects for select to authenticated using (
 bucket_id='pma-attachments' and exists(select 1 from public.pm_attachments a where a.object_path=name));
create policy pma_file_insert on storage.objects for insert to authenticated with check(false);
create policy pma_file_update on storage.objects for update to authenticated using(false) with check(false);
create policy pma_file_delete on storage.objects for delete to authenticated using(false);
-- Atomic business operations use caller RLS, not a new workflow/tenant engine.
create or replace function public.pm_assign_vendor(t uuid,p uuid,r uuid,v uuid) returns public.pm_vendor_assignments
language plpgsql security invoker set search_path='' as $$
declare a public.pm_vendor_assignments; st text;
begin
 if not private.pm_staff(t,p,true) then raise exception 'Forbidden' using errcode='42501'; end if;
 select status into st from public.pm_maintenance_requests where tenant_id=t and property_id=p and id=r for update;
 if st is null then raise exception 'Request not found' using errcode='P0002'; end if;
 if st in ('Completed','Closed') then raise exception 'Request already completed' using errcode='23514'; end if;
 select * into a from public.pm_vendor_assignments where tenant_id=t and request_id=r and vendor_id=v and status in ('assigned','accepted');
 if found then return a; end if;
 update public.pm_vendor_assignments set status='cancelled' where tenant_id=t and request_id=r and status in ('assigned','accepted');
 insert into public.pm_vendor_assignments(tenant_id,property_id,request_id,vendor_id) values(t,p,r,v) returning * into a;
 if st='New' then update public.pm_maintenance_requests set status='Assigned' where tenant_id=t and id=r; end if;
 return a;
end;
$$;
create or replace function public.pm_request_showing(t uuid,p uuid,u uuid,c uuid,at_time timestamptz,n text,k text)
returns public.pm_showings language plpgsql security invoker set search_path='' as $$
declare s public.pm_showings; l uuid;
begin
 if not private.pm_staff(t,p,true) then raise exception 'Forbidden' using errcode='42501'; end if;
 if length(k) not between 8 and 200 or at_time<now() then raise exception 'Valid future time and operation key required' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||':showing:'||k,0));
 select * into s from public.pm_showings where tenant_id=t and idempotency_key=k;
 if found then
   if s.property_id<>p or s.contact_id<>c or s.unit_id is distinct from u then raise exception 'Operation key reused for a different showing' using errcode='23514'; end if;
   return s;
 end if;
 if not exists(select 1 from public.ai4cc_contacts where tenant_id=t and id=c) then raise exception 'Contact not found' using errcode='23503'; end if;
 insert into public.ai4cc_leads(tenant_id,contact_id,title,service_interest,description,metadata)
 values(t,c,'Property showing inquiry','Property leasing',n,jsonb_build_object('source','pma','property_id',p)) returning id into l;
 insert into public.pm_showings(tenant_id,property_id,unit_id,contact_id,lead_id,requested_at,notes,idempotency_key)
 values(t,p,u,c,l,at_time,n,k) returning * into s;
 return s;
end;
$$;
-- Vendors may change only their assignment response, not resident records or maintenance closure.
create or replace function public.pm_vendor_response(a_id uuid,response text,n text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.pm_vendor_assignments;
begin
 if auth.uid() is null or response not in ('accepted','declined','completed') or length(n)>2000 then raise exception 'Invalid response' using errcode='42501'; end if;
 select * into a from public.pm_vendor_assignments where id=a_id for update;
 if not found or not private.pm_vendor(a.tenant_id,a.vendor_id) then raise exception 'Forbidden' using errcode='42501'; end if;
 if not ((a.status='assigned' and response in ('accepted','declined')) or (a.status='accepted' and response='completed')) then raise exception 'Invalid vendor transition' using errcode='23514'; end if;
 update public.pm_vendor_assignments set status=response,vendor_notes=n where id=a_id;
 return jsonb_build_object('id',a_id,'status',response,'requestClosed',false);
end;
$$;
revoke all on function public.pm_assign_vendor(uuid,uuid,uuid,uuid), public.pm_request_showing(uuid,uuid,uuid,uuid,timestamptz,text,text), public.pm_vendor_response(uuid,text,text) from public,anon;
grant execute on function public.pm_assign_vendor(uuid,uuid,uuid,uuid), public.pm_request_showing(uuid,uuid,uuid,uuid,timestamptz,text,text), public.pm_vendor_response(uuid,text,text) to authenticated;

commit;
