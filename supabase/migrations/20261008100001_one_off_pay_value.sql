-- 20261008100001 · A pay that happens once
--
-- Hourly work rarely pays the same twice, so a pay can be recorded as it comes: 'once' is money in
-- on one day, not a schedule. Its own file, because Postgres cannot use a new enum value in the
-- transaction that adds it; 20261008100002 teaches the functions what it means.

alter type public.pay_frequency add value if not exists 'once';
