-- 20261009100005 · A card can say how much it may owe
--
-- The Cards page shows how much of a card's limit is used. Optional: many
-- people do not know their limit, and a card without one simply shows no bar,
-- so null means "not given", never zero. A limit of zero or less would make
-- the used share meaningless, so it is refused.
--
-- Additive and nullable: every existing card keeps working unchanged. The
-- named constraint is added only when missing, so a re-run is a no-op.

alter table public.cards
  add column if not exists credit_limit numeric(14,2);

do $$ begin
  alter table public.cards
    add constraint cards_credit_limit_positive check (credit_limit is null or credit_limit > 0);
exception when duplicate_object then null;
end $$;

comment on column public.cards.credit_limit is
  'The card''s credit limit as the person typed it. Null: not given, so no limit is shown.';
