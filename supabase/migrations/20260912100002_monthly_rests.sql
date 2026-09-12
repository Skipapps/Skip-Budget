-- 0912_2 · Monthly rests are a convention a loan can be filed under
--
-- 0014 gave `loans` a day_count_basis and allowed the three day counts the
-- engine priced at the time: 'actual/365', 'actual/360' and '30/360'. The
-- engine has since grown a fourth convention, 'monthly' — monthly rests, where
-- the period rate is the nominal annual rate over twelve applied whole, so
-- February costs the same as March. It is the mainstream convention: it is
-- what rate tables, comparison sites and most US mortgage and UK personal-loan
-- statements use.
--
-- The column could not hold it, so the app filed a monthly-rest loan as
-- '30/360' and refused outright when the first period was odd. Over whole
-- months the substitution moves nothing — thirty days over three hundred and
-- sixty IS one twelfth — but across an odd opening period the two genuinely
-- disagree: 'monthly' charges the leftover days as simple daily interest on
-- actual/365 (the per diem a lender collects at closing), while '30/360'
-- counts them as thirtieths of a month. That is the case that was refused, and
-- it is a real and common loan.
--
-- Widening the check is all that is needed: `save_loan` passes
-- p_day_count_basis straight into this column, so the constraint is the only
-- thing that decides what may be stored.

alter table public.loans
  drop constraint if exists loans_day_count_basis_check;
alter table public.loans
  add constraint loans_day_count_basis_check
  check (day_count_basis in ('actual/365', 'actual/360', '30/360', 'monthly'));

-- Deliberately no data change. Every row on file was written under the old
-- rules, and a '30/360' row is either a loan whose owner chose '30/360' or a
-- whole-month monthly-rest loan that prices identically under both. Rewriting
-- any of them to 'monthly' would reprice a loan somebody has already filed and
-- checked against their statement, to no one's benefit.
