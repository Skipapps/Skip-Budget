-- 0012 · Optional note on bills and subscriptions
--
-- The brand catalog holds one row per brand: Walmart+, Costco Pharmacy and
-- Apple Music no longer exist as separate entries. A free-text note is what
-- carries the distinction the catalog deliberately dropped — "iCloud 2TB",
-- "pharmacy counter", "Prime Video only" — without reintroducing a row per
-- sub-brand and a duplicate logo beside it.
--
-- receipts.note already exists (0009).

alter table public.bills
  add column if not exists note text;

alter table public.subscriptions
  add column if not exists note text;
