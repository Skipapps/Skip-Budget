-- 0010 · News from Skip
--
-- The notifications screen used to list the charges the scheduler recorded — a
-- second copy of what the pushes had already said. Reminders are push-only now,
-- and nothing about them is kept for the screen. What it shows instead is news
-- from Skip itself: an update to install, a feature that has just shipped.
--
-- One table, written by us and read by everyone signed in. Rows are posted from
-- the dashboard or SQL with the service role; there is no policy that lets the
-- app write, so no client can publish to every other user.
--
-- `published_at` is the switch. A row dated in the future stays invisible until
-- then, so news can be staged ahead of a release and appear on its own.
--
-- Posting one:
--   insert into public.announcements (kind, title, body)
--   values ('feature', 'Split bills with friends', 'Open Splits from the Cards tab.');

create table if not exists public.announcements (
  id           uuid        primary key default gen_random_uuid(),
  kind         text        not null default 'news'
                           check (kind in ('update', 'feature', 'news')),
  title        text        not null check (char_length(title) between 1 and 120),
  body         text        not null default '' check (char_length(body) <= 1000),
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

comment on table public.announcements is
  'News from Skip shown on the in-app notifications screen: updates and new '
  'features. Posted with the service role only; read by any signed-in user '
  'once published_at has passed.';

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_published" on public.announcements;
create policy "announcements_select_published" on public.announcements
  for select to authenticated using (published_at <= now());

-- Read newest first, and only ever that way.
create index if not exists announcements_published
  on public.announcements (published_at desc);
