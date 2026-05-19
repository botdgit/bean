-- Track the Stripe Customer id alongside each profile so saved cards in
-- PaymentSheet are shared across orders. Set lazily by
-- `checkout-create-intent` the first time a user reaches checkout.

alter table profiles
  add column stripe_customer_id text;

create unique index profiles_stripe_customer_id_uidx
  on profiles(stripe_customer_id)
  where stripe_customer_id is not null;
