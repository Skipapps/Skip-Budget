-- A logo per row, chosen by its owner
--
-- Receipts, subscriptions and bills find their logo through brand_id, so a
-- store the catalog does not know has none, and a wrong catalog logo cannot be
-- corrected. These two columns remember a choice on the row itself: the app
-- shows logo_domain's logo, else the catalog brand's, unless logo_hidden says
-- to draw letters. A choice lives on one person's row and never changes the
-- shared catalog.
--
-- Additive only. Both start empty, so every existing row keeps the logo it
-- has. The *_all_own policies cover whole rows, so nothing else needs to know.

alter table public.receipts
  add column if not exists logo_domain text,
  add column if not exists logo_hidden boolean not null default false;

alter table public.subscriptions
  add column if not exists logo_domain text,
  add column if not exists logo_hidden boolean not null default false;

alter table public.bills
  add column if not exists logo_domain text,
  add column if not exists logo_hidden boolean not null default false;

-- The value becomes a path segment of an image URL (in the app and in the
-- push function), so only a bare host name is accepted: no scheme, path,
-- spaces or empty string. Case-insensitive because DNS is.
do $$ begin
  alter table public.receipts
    add constraint receipts_logo_domain_check
      check (logo_domain is null or (char_length(logo_domain) <= 253
        and logo_domain ~* '^[a-z0-9-]+(\.[a-z0-9-]+)+$'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.subscriptions
    add constraint subscriptions_logo_domain_check
      check (logo_domain is null or (char_length(logo_domain) <= 253
        and logo_domain ~* '^[a-z0-9-]+(\.[a-z0-9-]+)+$'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.bills
    add constraint bills_logo_domain_check
      check (logo_domain is null or (char_length(logo_domain) <= 253
        and logo_domain ~* '^[a-z0-9-]+(\.[a-z0-9-]+)+$'));
exception when duplicate_object then null;
end $$;

comment on column public.receipts.logo_domain is
  'Website whose logo to show for this receipt, e.g. planetfitness.com. Wins '
  'over the catalog brand''s. Null: nothing chosen, use the brand''s.';
comment on column public.receipts.logo_hidden is
  'True when the owner chose letters instead of any logo.';

comment on column public.subscriptions.logo_domain is
  'Website whose logo to show for this subscription. Wins over the catalog '
  'brand''s. Null: nothing chosen, use the brand''s.';
comment on column public.subscriptions.logo_hidden is
  'True when the owner chose letters instead of any logo.';

comment on column public.bills.logo_domain is
  'Website whose logo to show for this bill. Wins over the catalog brand''s. '
  'Null: nothing chosen, use the brand''s (or the category icon).';
comment on column public.bills.logo_hidden is
  'True when the owner chose letters instead of any logo.';
