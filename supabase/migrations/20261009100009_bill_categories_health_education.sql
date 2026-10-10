-- 20261009100009 · Bills for health, and bills for education
--
-- The add-a-bill picker now offers Health & Medical and Education in place of
-- "Family & Healthcare", which put a doctor's bill and a school's in one place,
-- and of "Loans & Credit": loans are started from the Loans page, where
-- save_loan files their bill under 'loans' as before.
--
-- Every bill filed under 'family' moves to 'health', the closest of the two.
-- The 'family' row itself stays, empty, so an older app build that still
-- offers it can save rather than fail on the foreign key; the app shows any
-- such bill as Health & Medical. 'loans' stays for loan bills, old and new.
--
-- sort_order follows the picker, with the two retired ids after it.
--
-- Re-run safe: an upsert on the ids, and a move that finds nothing the second
-- time.

insert into public.bill_categories (id, label, hint, sort_order) values
  ('health',    'Health & Medical', 'Doctor, dental, meds', 8),
  ('education', 'Education',        'Tuition and courses',  9)
on conflict (id) do update
  set label = excluded.label, hint = excluded.hint, sort_order = excluded.sort_order;

update public.bill_categories set sort_order = 7  where id = 'transport';
update public.bill_categories set sort_order = 10 where id = 'other';
update public.bill_categories set sort_order = 11 where id = 'loans';
update public.bill_categories set sort_order = 12 where id = 'family';

update public.bills set category_id = 'health' where category_id = 'family';
