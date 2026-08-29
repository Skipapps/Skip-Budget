-- 0021 · Who bills you
--
-- Receipts and subscriptions have carried a brand since they were built; bills
-- never did, on the reasoning that rent and car insurance are not brands. That
-- is true of some bills and plainly wrong about the rest — the electricity is
-- from AEP, the phone is T-Mobile, the internet is Xfinity, and those are the
-- three a person recognises fastest in a list.
--
-- Optional on purpose, and it has to stay that way. A large share of bills have
-- no brand at all: rent to a landlord, HOA fees, a loan from a relative. Those
-- keep the category icon they have always had, and adding one must not become
-- a field somebody has to dismiss.
--
-- Note which vocabulary is NOT borrowed here. brands.category_id points at
-- spend_categories ('groceries', 'dining'), while a bill's category comes from
-- bill_categories ('energy', 'mobile'). They are different questions and the
-- brand is deliberately not allowed to answer the bill's one: the category is
-- already chosen a step earlier, so the brand only ever says who, never what.

alter table public.bills
  add column if not exists brand_id text references public.brands (id) on delete set null;

comment on column public.bills.brand_id is
  'Optional. Who issues the bill, for its logo. Null is normal — rent and HOA '
  'fees have no brand. Never sets the bill category; see bill_categories.';

-- Reads are "this user's bills, with their brand", so the join wants an index
-- rather than a scan per row.
create index if not exists bills_brand_id_idx
  on public.bills (brand_id) where brand_id is not null;
