-- 0029 · Running the sender every quarter of an hour
--
-- The job has to prove to the function that it is the job. The obvious way is
-- to give pg_cron the service-role key, but that means the key existing in a
-- migration file, in git, and in the cron table — three more places for it to
-- leak from than it had before.
--
-- So the database mints its own secret instead. It is generated here, never
-- travels, and the function reads it back with the service role — which is the
-- only role that can, because the table has row level security on and not one
-- policy. Nothing outside Postgres and the function ever sees it.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.job_secrets (
  name  text primary key,
  value text not null
);

-- On by design and left without policies. Every ordinary role is refused by
-- default; the service role bypasses RLS, which is exactly the one caller
-- that should get through.
alter table public.job_secrets enable row level security;

-- Two uuids hashed, rather than pgcrypto's gen_random_bytes: that lives in
-- the extensions schema on Supabase and is not on the search path here, while
-- gen_random_uuid is built into Postgres itself. 256 bits either way.
insert into public.job_secrets (name, value)
values ('cron_push', md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text))
on conflict (name) do nothing;

comment on table public.job_secrets is
  'Shared secrets between scheduled jobs and the functions they call. RLS is '
  'on with no policies on purpose: only the service role can read this.';

-- Replacing rather than adding, so re-running the migration cannot leave two
-- jobs sending the same notice twice.
select cron.unschedule('skip-send-push')
where exists (select 1 from cron.job where jobname = 'skip-send-push');

select cron.schedule(
  'skip-send-push',
  -- Every fifteen minutes. Reminders are set to the quarter hour at finest, so
  -- this is as precise as the times people can actually choose.
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://jwnsdszstqlpkzwehtmq.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (select value from public.job_secrets where name = 'cron_push')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
