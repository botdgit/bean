// Called by the app after Stripe PaymentSheet returns success. Verifies the
// PaymentIntent with Stripe (we trust Stripe, not the client), flips the
// order to `paid`, writes the earn ledger entry, and writes the redeem
// ledger entry if applicable.
//
// Idempotent: replaying this call (or having the future Stripe webhook do
// the same work) is a no-op thanks to the conditional UPDATE and the
// loyalty_ledger.idempotency_key unique constraint.
//
// Square injection is NOT done here in M1 — that's M3. For now the order
// sits at `paid` and waits for a barista-side workflow we'll wire up later.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getUserIdFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';
import { stripe } from '../_shared/stripe.ts';

type RequestBody = { order_id: string };

const EARN_PENCE_PER_BEAN = 10; // 1 Bean per £0.10 of post-redemption subtotal

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return errorResponse('Unauthorized', 401);

    const { order_id } = (await req.json()) as RequestBody;
    if (!order_id) return errorResponse('order_id is required');

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();
    if (orderErr || !order) return errorResponse('Order not found', 404);
    if (order.user_id !== userId) return errorResponse('Forbidden', 403);

    if (!order.stripe_payment_intent_id) {
      return errorResponse('Order has no payment intent', 400);
    }

    // Verify against Stripe (don't trust the client).
    const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
    if (pi.status !== 'succeeded') {
      return jsonResponse({
        order_id: order.id,
        status: order.status,
        payment_status: pi.status,
        message: 'Payment not yet succeeded',
      });
    }

    // Conditional flip: only pending -> paid. If already paid (or further),
    // the update affects zero rows and we still continue to ledger writes,
    // which are themselves idempotent.
    await supabaseAdmin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id)
      .eq('status', 'pending');

    // Earn = floor(post-redemption subtotal / 10 pence). Post-redemption to
    // avoid earning Beans on the redeemed value (would otherwise drift).
    const earnSubtotal = Math.max(0, order.subtotal_cents - order.beans_value_cents);
    const beansEarned = Math.floor(earnSubtotal / EARN_PENCE_PER_BEAN);

    if (beansEarned > 0) {
      await supabaseAdmin.from('loyalty_ledger').upsert(
        {
          user_id: userId,
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
          user_id: userId,
          order_id: order.id,
          delta: -order.beans_redeemed,
          reason: 'redeem',
          idempotency_key: `redeem:${order.id}`,
          notes: `Redeemed on order ${order.id}`,
        },
        { onConflict: 'idempotency_key', ignoreDuplicates: true },
      );
    }

    return jsonResponse({
      order_id: order.id,
      status: 'paid',
      beans_earned: beansEarned,
      beans_redeemed: order.beans_redeemed,
    });
  } catch (err) {
    console.error('order-confirm failed', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
