-- 0023 · A face for the account
--
-- An id, not an image. The avatars ship with the app, so the profile only has
-- to remember which one was chosen — and that buys quite a lot for one text
-- column: nothing is uploaded, there is no storage bucket to secure or pay
-- for, no camera or photo-library permission to ask for, no cropping, and the
-- choice follows the account onto a second device for free.
--
-- It also keeps the privacy policy true. That document says no images leave
-- the phone, and this is the design that means it stays a fact rather than
-- something to revise the first time somebody sets a picture.
--
-- Unchecked on purpose: the set is a shipping detail of the app, and a
-- constraint here would mean a migration every time an avatar is added or
-- retired. An id the app no longer knows falls back to the placeholder.

alter table public.profiles
  add column if not exists avatar_id text;

comment on column public.profiles.avatar_id is
  'Which bundled avatar was chosen. Null means none picked yet. Not a file '
  'reference — the images ship with the app; see src/theme/avatars.ts.';
