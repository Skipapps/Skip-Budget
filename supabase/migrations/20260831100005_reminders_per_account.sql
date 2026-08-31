-- 0005 · Reminders are a choice the account makes, not a state the phone has
--
-- The Getting Started step "Turn on reminders" read the device's notification
-- permission — and permission belongs to the phone. Granted once, it is
-- granted for whoever signs in next, so every fresh account on a used phone
-- met the step already ticked, claiming credit for a choice nobody made.
--
-- The choice moves onto the profile. Launch registers this device for push
-- only when the signed-in account has said yes; the step reads the same
-- column; and a brand-new account starts unticked on any phone, however many
-- accounts said yes before it.
--
-- Backfilled from the only evidence that exists: an account holding a device
-- token demonstrably had reminders working, and this change must not switch
-- anybody's push off behind their back.

alter table public.profiles
  add column if not exists reminders_enabled_at timestamptz;

update public.profiles p
   set reminders_enabled_at = now()
 where reminders_enabled_at is null
   and exists (select 1 from public.device_tokens t where t.user_id = p.id);

comment on column public.profiles.reminders_enabled_at is
  'When this account chose to be reminded. Device registration at launch and '
  'the Getting Started step both read this; the phone''s permission alone is '
  'only the prerequisite.';
