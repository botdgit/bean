// Shared Stripe client for Edge Functions.

import Stripe from 'npm:stripe@17.3.0';

const secretKey = Deno.env.get('STRIPE_SECRET_KEY');

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY must be set as an Edge Function secret.');
}

export const stripe = new Stripe(secretKey, {
  // Pin the API version so behaviour is reproducible across SDK upgrades.
  apiVersion: '2024-11-20.acacia',
  // Edge runtime is fetch-based, not Node's http module.
  httpClient: Stripe.createFetchHttpClient(),
});

// BEAN's commission rate (subtotal, pre-tip). Tunable per cafe later.
export const DEFAULT_APP_FEE_BPS = 700; // 7.00%

export function appFeeFor(subtotalCents: number, bps = DEFAULT_APP_FEE_BPS): number {
  return Math.round((subtotalCents * bps) / 10_000);
}
