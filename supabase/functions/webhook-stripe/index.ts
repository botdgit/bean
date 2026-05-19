// Stripe webhook handler. Receives signed events and reconciles state in
// our database. Idempotent: a replayed event is a no-op.
//
// Subscribed events (v1):
//   - payment_intent.succeeded  -> mark order paid + write earn/redeem ledger
//   - charge.refunded           -> mark order cancelled + reverse ledger
//   - account.updated           -> flip cafe.active when Connect onboarding finishes (M2+)
//
// Webhook secret must be configured as STRIPE_WEBHOOK_SECRET. The Supabase
// function for this route has verify_jwt = false (Stripe signs the request
// itself with the secret).

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { claimWebhookEvent, markWebhookProcessed } from '../_shared/idempotency.ts';
import { stripe } from '../_shared/stripe.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

const EARN_PENCE_PER_BEAN = 10;

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET must be set as an Edge Function secret.');
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return errorResponse('Missing stripe-signature header', 400);

  const rawBody = await req.text();

  let event: import('npm:stripe@17.3.0').Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.warn('webhook signature verification failed', err);
    return errorResponse('Invalid signature', 400);
  }

  const claim = await claimWebhookEvent('stripe', event.id, event as unknown);
  if (!claim.firstTime) {
    return jsonResponse({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      default:
        // Unhandled but recorded as processed so we don't retry forever.
        break;
    }
    await markWebhookProcessed(claim.rowId);
    return jsonResponse({ received: true });
  } catch (err) {
    console.error('webhook handler failed', err);
    await markWebhookProcessed(claim.rowId, err instanceof Error ? err.message : 'unknown');
    return errorResponse('Handler error', 500);
  }
});

async function handlePaymentSucceeded(
  pi: import('npm:stripe@17.3.0').Stripe.PaymentIntent,
): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_payment_intent_id', pi.id)
    .single();
  if (!order) {
    console.warn('payment_intent.succeeded for unknown order', pi.id);
    return;
  }

  // Conditional flip; safe to retry.
  await supabaseAdmin
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', order.id)
    .eq('status', 'pending');

  const earnSubtotal = Math.max(0, order.subtotal_cents - order.beans_value_cents);
  const beansEarned = Math.floor(earnSubtotal / EARN_PENCE_PER_BEAN);

  if (beansEarned > 0) {
    await supabaseAdmin.from('loyalty_ledger').upsert(
      {
        user_id: order.user_id,
        order_id: order.id,
        delta: beansEarned,
        reason: 'earn',
        idempotency_key: `earn:${order.id}`,
        notes: `Earned on order ${order.id}`,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    );
  }

  if (order.beans_redeemed > 0) {
    await supabaseAdmin.from('loyalty_ledger').upsert(
      {
        user_id: order.user_id,
        order_id: order.id,
        delta: -order.beans_redeemed,
        reason: 'redeem',
        idempotency_key: `redeem:${order.id}`,
        notes: `Redeemed on order ${order.id}`,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    );
  }
}

async function handleChargeRefunded(
  charge: import('npm:stripe@17.3.0').Stripe.Charge,
): Promise<void> {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  if (!piId) return;

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, status, beans_redeemed, beans_value_cents, subtotal_cents')
    .eq('stripe_payment_intent_id', piId)
    .single();
  if (!order) return;

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id);

  // Reverse the earn (and re-credit the redeemed Beans) so the user's
  // balance returns to its pre-order state.
  const earnSubtotal = Math.max(0, order.subtotal_cents - order.beans_value_cents);
  const beansEarned = Math.floor(earnSubtotal / EARN_PENCE_PER_BEAN);

  if (beansEarned > 0) {
    await supabaseAdmin.from('loyalty_ledger').upsert(
      {
        user_id: order.user_id,
        order_id: order.id,
        delta: -beansEarned,
        reason: 'adjust',
        idempotency_key: `reverse-earn:${order.id}`,
        notes: `Refund of order ${order.id}`,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    );
  }
  if (order.beans_redeemed > 0) {
    await supabaseAdmin.from('loyalty_ledger').upsert(
      {
        user_id: order.user_id,
        order_id: order.id,
        delta: order.beans_redeemed,
        reason: 'adjust',
        idempotency_key: `reverse-redeem:${order.id}`,
        notes: `Refund of order ${order.id}`,
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    );
  }
}

async function handleAccountUpdated(
  account: import('npm:stripe@17.3.0').Stripe.Account,
): Promise<void> {
  const ready = account.charges_enabled && account.payouts_enabled;
  await supabaseAdmin
    .from('cafes')
    .update({ active: ready })
    .eq('stripe_account_id', account.id);
}
