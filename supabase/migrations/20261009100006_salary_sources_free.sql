-- 20261009100006 · Salary is free on every plan
--
-- Pay is what every balance and every month's figures are built from, so a
-- free account with two jobs, or a partner's pay, must be able to record all
-- of it. Free accounts lose their one-schedule limit on salary sources: adding
-- one, or turning a one-off pay into a schedule, is never refused again.
--
-- Only the salary limit goes. Its function served nothing else and goes with
-- it. Cards and bank accounts keep their free limit, which runs through the
-- shared enforce_free_allowance(), left as it is. The edit lock on extra
-- sources was already removed (20260928100001).
--
-- Re-run safe: both drops are `if exists`.

drop trigger if exists salary_sources_free_allowance on public.salary_sources;

drop function if exists public.enforce_income_allowance();
