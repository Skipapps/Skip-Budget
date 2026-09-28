-- Returns the Founder's account (sampath.chowdi@gmail.com) to the FREE state
-- by removing its entitlement row — the shape of an account that never paid.
-- Rows created while Pro are kept: the wall stops new bricks on INSERT, it
-- does not pull old ones out (see 20260831100007_pro_wall.sql).
--
-- Apply: npx supabase db query --linked -f supabase/seed/pro-state-free.sql
-- The app reads this on its next entitlement fetch — relaunch it after.

delete from public.entitlements
 where user_id in (select id from auth.users where email = 'sampath.chowdi@gmail.com');
