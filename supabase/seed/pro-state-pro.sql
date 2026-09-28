-- Puts the Founder's account (sampath.chowdi@gmail.com) in the PRO state.
--
-- Writes the same row the RevenueCat webhook would, so every check — the
-- client's usePro() fallback and the database's is_pro() triggers — sees a
-- paying account. product_id marks the row as script-written, never Apple's.
--
-- The three states, one script each:
--   pro-state-pro.sql     pro, no expiry            (paying customer)
--   pro-state-lapsed.sql  pro, expired yesterday    (subscription ran out)
--   pro-state-free.sql    no row                    (never paid)
--
-- Apply: npx supabase db query --linked -f supabase/seed/pro-state-pro.sql
-- The app reads this on its next entitlement fetch — relaunch it after.

insert into public.entitlements (user_id, pro, product_id, expires_at, environment, will_renew)
select id, true, 'dev.pro-state-script', null, 'SANDBOX', true
  from auth.users
 where email = 'sampath.chowdi@gmail.com'
on conflict (user_id) do update
   set pro = excluded.pro,
       product_id = excluded.product_id,
       expires_at = excluded.expires_at,
       environment = excluded.environment,
       will_renew = excluded.will_renew,
       updated_at = now();
