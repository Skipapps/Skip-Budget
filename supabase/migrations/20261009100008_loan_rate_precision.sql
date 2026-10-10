-- 20261009100008 · Keep a loan's rate to the decimal the bank printed
--
-- annual_rate was numeric(6,3), and Postgres rounds to the column's scale on
-- insert without a word. Real notes print more than three decimals: sixteenths
-- of a point (6.0625%), four-decimal note rates (7.4995%), and a daily periodic
-- rate times 365 (0.022301% a day is 8.139865% a year). Rounded to three
-- decimals they move the very first interest posting: 7.4995% filed as 7.500%
-- is 2 cents on a $32,001 car loan and $1.04 on a $2.5M mortgage, and the
-- mortgage's last payment ends up $1,153.33 off. A rate typed from a statement
-- has to be kept as printed for the schedule to match the bank to the cent.
--
-- Nine decimals is what the app posts exactly (src/lib/loan.ts holds the rate
-- as whole billionths of a percent), so whatever is stored replays to the
-- cent. Widening keeps every existing value as it is (7.500 reads
-- 7.500000000), and the 0 to 100 check from 0005 stays as it was.

alter table public.loans
  alter column annual_rate type numeric(12,9);
