-- 0008 · Spending categories and the brand catalog
--
-- Two pieces of reference data, both readable by any signed-in user and
-- written by nobody from the app — same shape as bill_categories.
--
-- bill_categories covers recurring household bills (housing, energy, water).
-- Receipts need a different vocabulary entirely, so they get their own set
-- rather than being forced into a taxonomy built for utilities.
--
-- The brand catalog is OURS: names, domains, aliases, category. No logo bytes
-- live here. Logos render from Brandfetch's CDN by domain, which their licence
-- requires ("logo links... directly embedded"); logo_path and the brand-logos
-- bucket exist so self-hosting can be switched on the day a caching agreement
-- is in place, without a schema change.

create table if not exists public.spend_categories (
  id         text primary key,
  label      text not null,
  hint       text,
  sort_order smallint not null default 0
);

insert into public.spend_categories (id, label, hint, sort_order) values
  ('groceries',    'Groceries',          'Supermarkets and food shops',        1),
  ('dining',       'Dining & Takeout',   'Restaurants, cafes, fast food',      2),
  ('fuel',         'Fuel & Convenience', 'Gas stations and corner stores',     3),
  ('pharmacy',     'Pharmacy & Health',  'Drugstores and prescriptions',       4),
  ('shopping',     'Shopping',           'Department, discount and online',    5),
  ('clothing',     'Clothing',           'Apparel, shoes and accessories',     6),
  ('electronics',  'Electronics',        'Devices, computers and office',      7),
  ('home',         'Home & Hardware',    'Furniture, tools, home improvement', 8),
  ('beauty',       'Beauty',             'Cosmetics and personal care',        9),
  ('pets',         'Pets',               'Pet food, supplies and vets',       10),
  ('entertainment','Entertainment',      'Streaming, music and games',        11),
  ('software',     'Apps & Software',    'Cloud, security and productivity',  12),
  ('fitness',      'Fitness & Wellness', 'Gyms, classes and health apps',     13),
  ('news',         'News & Learning',    'Papers, books and courses',         14),
  ('meals',        'Meal Kits',          'Recipe boxes and prepared meals',   15),
  ('memberships',  'Memberships',        'Warehouse clubs and delivery perks',16),
  ('transport',    'Transport',          'Vehicles, motoring and travel',     17),
  ('other',        'Other',              'Anything that fits nowhere else',   18)
on conflict (id) do update
  set label = excluded.label, hint = excluded.hint, sort_order = excluded.sort_order;

-- Fuzzy matching for the store field: "walmrt" and "trader joes" both need to
-- find the right row. Trigram similarity handles typos and missing
-- punctuation, which prefix matching alone cannot.
create extension if not exists pg_trgm;

create table if not exists public.brands (
  id           text primary key,
  name         text not null,
  domain       text,
  -- Alternate spellings people actually type or that appear on receipts:
  -- 'Micky D', 'WM SUPERCENTER', 'TIM HORTON'S'.
  aliases      text[] not null default '{}',
  category_id  text not null references public.spend_categories (id),
  -- 'us', 'ca', or 'both' — used to rank local brands first, never to hide.
  country      text not null default 'both' check (country in ('us', 'ca', 'both')),
  -- Higher wins ties in search. Chains people buy from daily rank above
  -- niche ones so "wal" surfaces Walmart before Walgreens.
  rank         smallint not null default 0,
  -- Set only when a self-hosted copy exists; null means render from the CDN.
  logo_path    text,
  logo_fetched_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists brands_name_trgm_idx     on public.brands using gin (name gin_trgm_ops);
create index if not exists brands_category_idx      on public.brands (category_id);
create index if not exists brands_rank_idx          on public.brands (rank desc);

alter table public.spend_categories enable row level security;
alter table public.brands           enable row level security;

drop policy if exists "spend_categories_read" on public.spend_categories;
create policy "spend_categories_read" on public.spend_categories
  for select to authenticated using (true);

drop policy if exists "brands_read" on public.brands;
create policy "brands_read" on public.brands
  for select to authenticated using (true);

-- Search used by the store field. Ranked so an exact prefix always beats a
-- fuzzy hit, and a daily-shop brand beats an obscure one at equal similarity.
create or replace function public.search_brands(p_query text, p_limit integer default 12)
returns table (
  id text,
  name text,
  domain text,
  category_id text,
  logo_path text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with needle as (select lower(trim(coalesce(p_query, ''))) as q)
  select b.id, b.name, b.domain, b.category_id, b.logo_path,
         (
           case when lower(b.name) = n.q then 3.0
                when lower(b.name) like n.q || '%' then 2.0
                when exists (
                  select 1 from unnest(b.aliases) a where lower(a) like n.q || '%'
                ) then 1.8
                when lower(b.name) like '%' || n.q || '%' then 1.2
                else similarity(lower(b.name), n.q)
           end
           + b.rank / 100.0
         )::real as score
    from public.brands b, needle n
   where n.q <> ''
     and (
       lower(b.name) like '%' || n.q || '%'
       or exists (select 1 from unnest(b.aliases) a where lower(a) like '%' || n.q || '%')
       or similarity(lower(b.name), n.q) > 0.3
     )
   order by score desc, b.name
   limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

revoke all on function public.search_brands(text, integer) from public;
grant execute on function public.search_brands(text, integer) to authenticated;

-- Bucket for the self-hosted path. Created now so enabling it later is a
-- config change rather than a migration; nothing writes to it yet.
insert into storage.buckets (id, name, public)
  values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

drop policy if exists "brand_logos_read" on storage.objects;
create policy "brand_logos_read" on storage.objects
  for select using (bucket_id = 'brand-logos');
