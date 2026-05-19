-- BEAN v1 schema
-- All amounts in integer pence. All ids uuid unless they reference auth.users.
-- RLS is enabled everywhere. Edge Functions use the service role and bypass.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type order_status as enum (
  'pending',      -- created locally, payment not yet confirmed
  'paid',         -- Stripe PI succeeded, awaiting Square injection
  'accepted',     -- Square reports fulfillment RESERVED
  'in_progress',  -- transitional (reserved for future Square states)
  'ready',        -- Square reports fulfillment PREPARED
  'completed',    -- Square reports fulfillment COMPLETED
  'cancelled',    -- cancelled by cafe or refunded
  'failed'        -- Square injection failed; ops intervention needed
);

create type ledger_reason as enum ('earn', 'redeem', 'adjust', 'expire');

create type webhook_source as enum ('stripe', 'square');

create type reimbursement_status as enum ('pending', 'paid', 'failed');

create type push_platform as enum ('ios', 'android');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text,
  email         text,
  name          text,
  bean_balance  integer not null default 0 check (bean_balance >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- cafes
-- ---------------------------------------------------------------------------
create table cafes (
  id                              uuid primary key default uuid_generate_v4(),
  name                            text not null,
  slug                            text not null unique,
  address                         text,
  lat                             double precision,
  lng                             double precision,
  hours_json                      jsonb not null default '{}'::jsonb,
  square_location_id              text,
  -- Square OAuth access token. In production, store the Vault secret_id (uuid)
  -- and resolve via vault.decrypted_secrets. For v1 it is opaque text and
  -- edge functions are responsible for encryption-at-rest.
  square_access_token_enc         text,
  stripe_account_id               text unique,
  active                          boolean not null default false,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index cafes_active_idx on cafes(active) where active = true;

-- ---------------------------------------------------------------------------
-- catalog
-- ---------------------------------------------------------------------------
create table catalog_items (
  id                  uuid primary key default uuid_generate_v4(),
  cafe_id             uuid not null references cafes(id) on delete cascade,
  square_object_id    text not null,
  name                text not null,
  description         text,
  price_cents         integer not null check (price_cents >= 0),
  category            text,
  is_available        boolean not null default true,
  image_url           text,
  sort                integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (cafe_id, square_object_id)
);

create index catalog_items_cafe_idx on catalog_items(cafe_id, sort);

create table catalog_modifiers (
  id                  uuid primary key default uuid_generate_v4(),
  cafe_id             uuid not null references cafes(id) on delete cascade,
  square_object_id    text not null,
  parent_item_id      uuid references catalog_items(id) on delete cascade,
  modifier_list_id    text,
  name                text not null,
  price_delta_cents   integer not null default 0,
  selection_type      text not null default 'single' check (selection_type in ('single','multiple')),
  sort                integer not null default 0,
  created_at          timestamptz not null default now(),
  unique (cafe_id, square_object_id)
);

create index catalog_modifiers_cafe_idx on catalog_modifiers(cafe_id);
create index catalog_modifiers_item_idx on catalog_modifiers(parent_item_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table orders (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid not null references profiles(id) on delete restrict,
  cafe_id                     uuid not null references cafes(id) on delete restrict,
  status                      order_status not null default 'pending',
  subtotal_cents              integer not null check (subtotal_cents >= 0),
  tip_cents                   integer not null default 0 check (tip_cents >= 0),
  beans_redeemed              integer not null default 0 check (beans_redeemed >= 0),
  beans_value_cents           integer not null default 0 check (beans_value_cents >= 0),
  total_charged_cents         integer not null check (total_charged_cents >= 0),
  app_fee_cents               integer not null default 0 check (app_fee_cents >= 0),
  stripe_payment_intent_id    text unique,
  square_order_id             text unique,
  pickup_at                   timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index orders_user_created_idx on orders(user_id, created_at desc);
create index orders_cafe_created_idx on orders(cafe_id, created_at desc);
create index orders_status_idx on orders(status);

create table order_items (
  id                  uuid primary key default uuid_generate_v4(),
  order_id            uuid not null references orders(id) on delete cascade,
  catalog_item_id     uuid references catalog_items(id) on delete set null,
  name_snapshot       text not null,
  qty                 integer not null check (qty > 0),
  unit_price_cents    integer not null check (unit_price_cents >= 0),
  modifiers_json      jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

create index order_items_order_idx on order_items(order_id);

-- ---------------------------------------------------------------------------
-- loyalty
-- ---------------------------------------------------------------------------
create table loyalty_ledger (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references profiles(id) on delete cascade,
  order_id            uuid references orders(id) on delete set null,
  delta               integer not null,
  reason              ledger_reason not null,
  idempotency_key     text not null unique,
  notes               text,
  created_at          timestamptz not null default now()
);

create index loyalty_ledger_user_idx on loyalty_ledger(user_id, created_at desc);

-- Maintain denormalised bean_balance on profiles whenever the ledger changes.
-- Append-only ledger means insert is the only mutating op; we still guard
-- update/delete just in case.
create or replace function bean_apply_ledger_delta() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update profiles
      set bean_balance = bean_balance + new.delta,
          updated_at = now()
      where id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update profiles
      set bean_balance = bean_balance - old.delta,
          updated_at = now()
      where id = old.user_id;
    return old;
  elsif tg_op = 'UPDATE' then
    update profiles
      set bean_balance = bean_balance - old.delta + new.delta,
          updated_at = now()
      where id = new.user_id;
    return new;
  end if;
  return null;
end;
$$;

create trigger loyalty_ledger_balance_trg
  after insert or update or delete on loyalty_ledger
  for each row execute function bean_apply_ledger_delta();

-- ---------------------------------------------------------------------------
-- reimbursements (BEAN -> cafe transfers for redeemed loyalty value)
-- ---------------------------------------------------------------------------
create table reimbursements (
  id                  uuid primary key default uuid_generate_v4(),
  cafe_id             uuid not null references cafes(id) on delete restrict,
  period_start        date not null,
  period_end          date not null,
  beans_value_cents   integer not null check (beans_value_cents >= 0),
  stripe_transfer_id  text unique,
  status              reimbursement_status not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (cafe_id, period_start)
);

-- ---------------------------------------------------------------------------
-- infra: webhook dedup + push tokens
-- ---------------------------------------------------------------------------
create table webhook_events (
  id            uuid primary key default uuid_generate_v4(),
  source        webhook_source not null,
  event_id      text not null,
  payload       jsonb not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  unique (source, event_id)
);

create index webhook_events_unprocessed_idx
  on webhook_events(source, created_at) where processed_at is null;

create table push_tokens (
  user_id     uuid not null references profiles(id) on delete cascade,
  expo_token  text not null,
  platform    push_platform not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, expo_token)
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger cafes_updated_at before update on cafes
  for each row execute function set_updated_at();
create trigger catalog_items_updated_at before update on catalog_items
  for each row execute function set_updated_at();
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();
create trigger reimbursements_updated_at before update on reimbursements
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth trigger: create profile on signup
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email)
    values (new.id, new.phone, new.email)
    on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table profiles          enable row level security;
alter table cafes             enable row level security;
alter table catalog_items     enable row level security;
alter table catalog_modifiers enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table loyalty_ledger    enable row level security;
alter table reimbursements    enable row level security;
alter table webhook_events    enable row level security;
alter table push_tokens       enable row level security;

-- profiles: user reads/updates own row
create policy profiles_self_select on profiles
  for select using (auth.uid() = id);
create policy profiles_self_update on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- cafes: any authenticated user sees active cafes
create policy cafes_public_read on cafes
  for select using (active = true);

-- catalog: any authenticated user sees items for active cafes
create policy catalog_items_public_read on catalog_items
  for select using (
    is_available = true
    and exists (select 1 from cafes c where c.id = catalog_items.cafe_id and c.active = true)
  );
create policy catalog_modifiers_public_read on catalog_modifiers
  for select using (
    exists (select 1 from cafes c where c.id = catalog_modifiers.cafe_id and c.active = true)
  );

-- orders: user reads own orders only. Writes go via edge functions (service role).
create policy orders_self_select on orders
  for select using (auth.uid() = user_id);

create policy order_items_self_select on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  );

-- loyalty ledger: user reads own entries
create policy loyalty_ledger_self_select on loyalty_ledger
  for select using (auth.uid() = user_id);

-- push tokens: user manages own tokens (the only client-writable table other than profiles)
create policy push_tokens_self_all on push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reimbursements / webhook_events: service role only (no policies = no client access)
