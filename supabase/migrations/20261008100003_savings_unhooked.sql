-- Savings stands on its own while it is redesigned: the app no longer shows what each month left
-- over, so the monthly job would only keep writing rows nobody reads. The rows already written, the
-- table and its functions stay as they are.
select cron.unschedule('skip-close-savings')
where exists (select 1 from cron.job where jobname = 'skip-close-savings');
