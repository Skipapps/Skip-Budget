-- 0026 · Somewhere to send a push, and the two facts needed to time it
--
-- Three things a scheduler cannot work without, and none of them existed:
--
--   device_tokens      where to send. One row per device, not per user: a
--                      phone and an iPad both want the reminder, and a token
--                      Apple rejects has to be droppable on its own.
--   profiles.timezone  when "half past five" is. remind_at is a bare local
--                      time, deliberately, so without the zone the server has
--                      no way to turn it into a moment.
--   last_sent_on       whether it already went. The job runs every quarter of
--                      an hour and must be safe to run twice.

create table if not exists public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- The APNs device token, hex. Not an Expo push token: this posts to Apple
  -- directly, using the key already in the project's secrets.
  token       text not null,
  platform    text not null default 'ios' check (platform in ('ios', 'android')),

  -- Which Apple host answers for this token. A build signed for development
  -- — anything installed over a cable, as this one was — is only known to the
  -- sandbox, and the production host rejects it with BadDeviceToken. The
  -- sender corrects a wrong guess here rather than dropping the message.
  environment text not null default 'development'
    check (environment in ('development', 'production')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A device that is handed to somebody else must not keep the old account's
  -- notices, so the token is unique across users and re-registering moves it.
  constraint device_tokens_token_unique unique (token)
);

create index if not exists device_tokens_user on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens_select_own" on public.device_tokens;
create policy "device_tokens_select_own" on public.device_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "device_tokens_insert_own" on public.device_tokens;
create policy "device_tokens_insert_own" on public.device_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "device_tokens_update_own" on public.device_tokens;
create policy "device_tokens_update_own" on public.device_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "device_tokens_delete_own" on public.device_tokens;
create policy "device_tokens_delete_own" on public.device_tokens
  for delete using (auth.uid() = user_id);

drop trigger if exists device_tokens_set_updated_at on public.device_tokens;
create trigger device_tokens_set_updated_at
  before update on public.device_tokens
  for each row execute function public.set_updated_at();

-- Where the user is, so a local time can be turned into a moment. IANA name,
-- read from the phone. Null falls back to UTC, which is wrong for almost
-- everyone but never crashes and is corrected the next time the app opens.
alter table public.profiles
  add column if not exists timezone text;

comment on column public.profiles.timezone is
  'IANA zone from the device, e.g. America/New_York. Turns reminders.remind_at '
  'from a wall-clock time into an instant. Null is treated as UTC.';

-- The day a reminder last went out, in the user's own zone. The scheduler runs
-- four times an hour, so this is what stops the same reminder being sent four
-- times — and it means a failed send is retried on the next pass rather than
-- being lost.
alter table public.reminders
  add column if not exists last_sent_on date;

comment on column public.reminders.last_sent_on is
  'Local date this reminder was last delivered. Guards against the quarter-hourly '
  'job sending the same notice more than once a day.';
