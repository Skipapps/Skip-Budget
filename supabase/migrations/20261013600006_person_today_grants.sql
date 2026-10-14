-- 20261013600006 · person_today for signed-in callers only
--
-- update_loan and record_loan_payoff call person_today, and both run as the
-- signed-in caller (security invoker), so that caller needs EXECUTE on it. Nothing
-- signed out calls it, so PUBLIC and anon do not. It reveals nothing either way:
-- it runs as the caller too, and row security leaves anon with UTC's day.

revoke all on function public.person_today(uuid) from public, anon;
grant execute on function public.person_today(uuid) to authenticated;
