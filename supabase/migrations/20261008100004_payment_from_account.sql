-- A payment says where its money came from, so it can move money rather than create it.
--
-- A card payment made from one of the person's bank accounts takes the money out of that account
-- as it clears the card; money added to an account from another of their accounts is a move
-- between the two. Null is money from outside what the app tracks: a card paid from somewhere
-- else, or new money (a gift, a refund) added to an account.

alter table public.payments
  add column if not exists from_bank_account_id uuid
    references public.bank_accounts (id) on delete set null;

comment on column public.payments.from_bank_account_id is
  'The bank account the money came out of. Null = from outside the accounts the app tracks.';

-- Money cannot come out of the account it goes into.
alter table public.payments drop constraint if exists payments_not_from_itself;
alter table public.payments add constraint payments_not_from_itself
  check (from_bank_account_id is distinct from bank_account_id or from_bank_account_id is null);

create index if not exists payments_from_bank_idx
  on public.payments (from_bank_account_id, paid_on desc)
  where from_bank_account_id is not null;

-- The foreign key accepts any account; only the person's own may pay. Row security on
-- bank_accounts already limits the lookup to the caller's rows.
create or replace function public.payments_from_own_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.from_bank_account_id is not null and not exists (
    select 1 from public.bank_accounts
    where id = new.from_bank_account_id and user_id = new.user_id
  ) then
    raise exception 'A payment can only come from one of your own accounts.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_from_own_account on public.payments;
create trigger payments_from_own_account
  before insert or update of from_bank_account_id on public.payments
  for each row execute function public.payments_from_own_account();
