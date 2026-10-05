-- Hourly pay on salary sources (Founder, 2026-10-03)
--
-- A source is either a fixed paycheck or an hourly one. Either way `amount`
-- stays the figure every balance reads — what lands each payday — so nothing
-- downstream changes. For an hourly source the app works `amount` out from
-- the columns below and keeps them so the form can be edited later.
--
-- Additive only: every existing source is 'fixed' and its row is untouched.

alter table public.salary_sources
  add column if not exists pay_type text not null default 'fixed',
  add column if not exists hourly_rate numeric(10,2),
  add column if not exists hours_per_week numeric(5,2),
  add column if not exists overtime_hours_per_week numeric(5,2) not null default 0,
  add column if not exists overtime_multiplier numeric(3,2) not null default 1.5,
  add column if not exists deduction_percent numeric(5,2) not null default 0;

do $$ begin
  alter table public.salary_sources
    add constraint salary_sources_pay_type_check
      check (pay_type in ('fixed', 'hourly'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.salary_sources
    add constraint salary_sources_hourly_ranges_check
      check (
        (hourly_rate is null or hourly_rate >= 0)
        and (hours_per_week is null or (hours_per_week >= 0 and hours_per_week <= 168))
        and overtime_hours_per_week >= 0
        and coalesce(hours_per_week, 0) + overtime_hours_per_week <= 168
        and overtime_multiplier >= 1
        and deduction_percent >= 0 and deduction_percent < 100
      );
exception when duplicate_object then null;
end $$;

-- An hourly source must say what it pays per hour and for how long; a fixed
-- one may leave both empty.
do $$ begin
  alter table public.salary_sources
    add constraint salary_sources_hourly_complete_check
      check (pay_type = 'fixed' or (hourly_rate > 0 and hours_per_week > 0));
exception when duplicate_object then null;
end $$;

comment on column public.salary_sources.pay_type is
  'fixed: amount is entered directly. hourly: amount is worked out by the app '
  'from hourly_rate, hours_per_week, overtime and deduction_percent.';
comment on column public.salary_sources.deduction_percent is
  'Tax and deductions taken out before pay lands, as a percentage of gross.';
