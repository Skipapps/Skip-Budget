-- Puts the Founder's account (sampath.chowdi@gmail.com) in the LAPSED state:
-- was Pro, subscription expired yesterday. is_pro() honours expires_at
-- directly, so every gate treats this account as free — while the data it
-- created as Pro (extra cards, saved loans, groups) is still in the tables.
-- That combination is the untested territory the audit flagged.
--
-- Apply: npx supabase db query --linked -f supabase/seed/pro-state-lapsed.sql
-- The app reads this on its next entitlement fetch — relaunch it after.

insert into public.entitlements (user_id, pro, product_id, expires_at, environment, will_renew)
select id, true, 'dev.pro-state-script', now() - interval '1 day', 'SANDBOX', false
  from auth.users
 where email = 'sampath.chowdi@gmail.com'
on conflict (user_id) do update
   set pro = excluded.pro,
       product_id = excluded.product_id,
       expires_at = excluded.expires_at,
       environment = excluded.environment,
       will_renew = excluded.will_renew,
       updated_at = now();
