-- Keypad language choice per phone call, read by ElevenLabs' call-start webhook.
-- Holds no caller details. Only Spanish choices are stored; no row means English.
create table if not exists public.voice_language_choices (
  call_sid text primary key,
  language text not null check (language in ('en', 'es')),
  created_at timestamptz not null default now()
);

alter table public.voice_language_choices enable row level security;
revoke all on public.voice_language_choices from anon, authenticated;

comment on table public.voice_language_choices is
  'Keypad language menu: language chosen for a Twilio call SID. Service role only; no caller details.';
grant select, insert, update on public.voice_language_choices to service_role;
