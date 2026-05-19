-- Local development seed data. Run via `supabase db reset`.
-- Inserts one demo cafe with a tiny menu so the mobile app has something to
-- render before Square catalog sync exists. Modifier shape here is simplified
-- (one set of modifiers per item) and does NOT mirror Square's real
-- modifier-list-shared-across-items model — that comes from catalog sync.

insert into cafes (id, name, slug, address, lat, lng, active, hours_json)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Coffee Co.',
  'demo-coffee-co',
  '1 Coffee Street, London E1 6AN',
  51.5074, -0.0782,
  true,
  '{"mon":["07:00","17:00"],"tue":["07:00","17:00"],"wed":["07:00","17:00"],"thu":["07:00","17:00"],"fri":["07:00","17:00"],"sat":["08:00","16:00"],"sun":["08:00","15:00"]}'::jsonb
)
on conflict (id) do nothing;

insert into catalog_items (id, cafe_id, square_object_id, name, description, price_cents, category, sort)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'demo-flat-white', 'Flat White', 'Double shot, silky milk', 380, 'Coffee', 10),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'demo-latte',      'Latte',      'Smooth, milky',           380, 'Coffee', 20),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'demo-cappuccino', 'Cappuccino', 'Frothy classic',          380, 'Coffee', 30),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'demo-americano',  'Americano',  'Espresso + hot water',    330, 'Coffee', 40),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'demo-croissant',  'Butter Croissant', 'Baked this morning', 320, 'Food', 100)
on conflict (cafe_id, square_object_id) do nothing;

-- Attach milk + extras modifiers to the Flat White only, as a smoke test.
insert into catalog_modifiers (cafe_id, square_object_id, parent_item_id, modifier_list_id, name, price_delta_cents, selection_type, sort)
values
  ('00000000-0000-0000-0000-000000000001', 'demo-fw-milk-whole',  '10000000-0000-0000-0000-000000000001', 'milk',   'Whole milk',    0,  'single', 10),
  ('00000000-0000-0000-0000-000000000001', 'demo-fw-milk-oat',    '10000000-0000-0000-0000-000000000001', 'milk',   'Oat milk',     40,  'single', 20),
  ('00000000-0000-0000-0000-000000000001', 'demo-fw-milk-almond', '10000000-0000-0000-0000-000000000001', 'milk',   'Almond milk',  40,  'single', 30),
  ('00000000-0000-0000-0000-000000000001', 'demo-fw-extra-shot',  '10000000-0000-0000-0000-000000000001', 'extras', 'Extra shot',   50,  'multiple', 10),
  ('00000000-0000-0000-0000-000000000001', 'demo-fw-decaf',       '10000000-0000-0000-0000-000000000001', 'extras', 'Decaf',         0,  'multiple', 20)
on conflict (cafe_id, square_object_id) do nothing;
