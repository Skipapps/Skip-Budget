-- 0022 · Spend categories for the things that bill you
--
-- The catalog was built for receipts and subscriptions, so its vocabulary is
-- shopping: groceries, dining, clothing, software. There was nowhere to file
-- an electricity company, which is why searching "AEP" or "T-Mobile" in the
-- app returned nothing — the brands were not missing from the seed by
-- accident, there was no category they could have belonged to.
--
-- Four more, and the whole utilities-and-telecom half of a person's outgoings
-- becomes findable. They are ordinary spend categories: paying a utility by
-- card produces a receipt like anything else, so they earn their place here
-- rather than in a separate list only bills can see.

insert into public.spend_categories (id, label, hint, sort_order) values
  ('utilities', 'Utilities',       'Electricity, gas, water and waste',   19),
  ('telecom',   'Phone & Internet', 'Mobile, broadband and TV',           20),
  ('insurance', 'Insurance',       'Car, home, health and life',          21),
  ('finance',   'Banking & Loans', 'Cards, mortgages and student loans',  22),
  -- Pushed down so it stays last in the picker now there is more above it.
  ('other',     'Other',           'Anything that fits nowhere else',     30)
on conflict (id) do update
  set label = excluded.label, hint = excluded.hint, sort_order = excluded.sort_order;
