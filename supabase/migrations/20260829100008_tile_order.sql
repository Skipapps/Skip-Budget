-- 0025 · The order of the dashboard tiles
--
-- Which of the five someone looks at first is personal: a person with one big
-- loan and no subscriptions wants the opposite arrangement to somebody living
-- off streaming services. The order lives on the profile rather than on the
-- device because it describes how they read their money, and that should be
-- the same on a second phone.
--
-- Unconstrained text, and deliberately partial. Tiles the app ships but the
-- array does not mention fall in behind the ones it does, so adding a sixth
-- tile in a later release does not need every stored row rewritten — and an id
-- that no longer exists is simply skipped rather than leaving a gap.

alter table public.profiles
  add column if not exists tile_order text[];

comment on column public.profiles.tile_order is
  'Dashboard tile ids, first to last. Null means the shipped order. Partial '
  'lists are fine: anything unlisted follows in its default position.';
