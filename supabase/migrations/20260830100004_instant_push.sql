-- 0004 · Send it now, not at the next quarter hour
--
-- Notices were queued by triggers and drained by the cron job, which runs every
-- fifteen minutes. That cadence was chosen for reminders, where "half past
-- five" is the finest anybody can ask for and being a few minutes late costs
-- nothing. It is badly wrong for a shared ledger: somebody adds an expense
-- while you are sitting next to them, and your phone hears about it a quarter
-- of an hour later.
--
-- So the insert dispatches the sender itself. pg_net queues the request and a
-- background worker performs it, which is what makes this safe to do from a
-- trigger — the HTTP call is never inside the transaction, so a slow or broken
-- Apple cannot hold up somebody's expense. The queued row is written in the
-- same transaction as the notice, so a rollback takes the send with it and
-- nothing is announced that did not happen.
--
-- The cron job stays exactly as it was. It is now a backstop rather than the
-- delivery path: anything a dispatch missed goes out within the quarter hour.

create or replace function public.dispatch_push_now()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://jwnsdszstqlpkzwehtmq.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', (select value from public.job_secrets where name = 'cron_push')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  exception when others then
    -- Never worth failing the write that caused it. The quarter-hour sweep
    -- will pick the notice up regardless.
    null;
  end;

  return null;
end;
$$;

-- Per statement, not per row. An expense split between five people writes five
-- notices in one statement, and that should be one wake-up for the sender
-- rather than five identical ones racing each other.
drop trigger if exists split_notices_dispatch on public.split_notices;
create trigger split_notices_dispatch
  after insert on public.split_notices
  for each statement execute function public.dispatch_push_now();

-- --------------------------------------------------------------------------
-- Claiming, so two senders cannot both take the same notice
-- --------------------------------------------------------------------------
--
-- Draining used to be a plain select, with the edge function stamping each row
-- afterwards. That was safe while one cron job was the only caller. It is not
-- safe now: two expenses added seconds apart dispatch twice, both callers read
-- the same unsent rows, and somebody gets every notification twice.
--
-- `for update skip locked` is the usual answer — each caller takes rows nobody
-- else holds, and the stamp happens in the same statement as the read, so
-- there is no window between claiming a notice and marking it claimed.
--
-- That makes delivery at-most-once rather than at-least-once, which is the
-- right way round here. A notice that fails to reach Apple is a notice about
-- something the app will show anyway; a duplicate is the thing that teaches
-- people to switch notifications off.

create or replace function public.split_notices_due()
returns table (notice_id uuid, user_id uuid, title text, body text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Older than a day is not news. Dropped rather than delivered late.
  delete from public.split_notices
   where sent_at is null and created_at < now() - interval '1 day';

  return query
  with claimed as (
    select n.id
      from public.split_notices n
     where n.sent_at is null
     order by n.created_at
     limit 200
     for update skip locked
  )
  update public.split_notices s
     set sent_at = now()
    from claimed c
   where s.id = c.id
  returning s.id, s.user_id, s.title, s.body;
end;
$$;

revoke all on function public.split_notices_due() from public, anon, authenticated;
revoke all on function public.dispatch_push_now() from public, anon, authenticated;
