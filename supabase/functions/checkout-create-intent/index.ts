// Create a Stripe PaymentIntent + nascent `orders` row for a basket.
//
// Server is the source of truth for prices, redemption eligibility, and the
// app fee. The mobile client sends an opaque basket; the server reprices it
// from `catalog_items` + `catalog_modifiers`.
//
// In M1 we charge to BEAN's own Stripe account (no Connect). When a cafe has
// `stripe_account_id` set (M2+), we switch to a destination charge with
// `application_fee_amount`.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getUserIdFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';
import { appFeeFor, stripe } from '../_shared/stripe.ts';

type BasketLineInput = {
  catalog_item_id: string;
  qty: number;
  modifier_ids: string[]; // catalog_modifiers.id values
  note?: string;
};

type RequestBody = {
  cafe_id: string;
  lines: BasketLineInput[];
  tip_cents: number;
  redeem_beans: boolean;
};

const REDEMPTION_THRESHOLD_BEANS = 400;
const REDEMPTION_VALUE_CENTS = 400;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = (await req.json()) as RequestBody;
    if (!body?.cafe_id || !Array.isArray(body.lines) || body.lines.length === 0) {
      return errorResponse('cafe_id and at least one basket line are required');
    }
    if (body.tip_cents < 0 || body.tip_cents > 10_000) {
      return errorResponse('tip_cents out of range');
    }
    for (const l of body.lines) {
      if (!l.catalog_item_id || !Number.isInteger(l.qty) || l.qty <= 0 || l.qty > 50) {
        return errorResponse('Invalid basket line');
      }
    }

    // Load cafe (must be active).
    const { data: cafe, error: cafeErr } = await supabaseAdmin
      .from('cafes')
      .select('id, name, active, stripe_account_id')
      .eq('id', body.cafe_id)
      .single();
    if (cafeErr || !cafe || !cafe.active) {
      return errorResponse('Cafe not found or not accepting orders', 404);
    }

    // Load all referenced catalog items.
    const itemIds = Array.from(new Set(body.lines.map((l) => l.catalog_item_id)));
    const { data: items } = await supabaseAdmin
      .from('catalog_items')
      .select('id, cafe_id, square_object_id, name, price_cents, is_available')
      .in('id', itemIds);
    const itemById = new Map(items?.map((i) => [i.id, i]) ?? []);
    for (const id of itemIds) {
      const it = itemById.get(id);
      if (!it || it.cafe_id !== cafe.id || !it.is_available) {
        return errorResponse(`Item ${id} is not available`, 400);
      }
    }

    // Load all referenced modifiers.
    const modIds = Array.from(new Set(body.lines.flatMap((l) => l.modifier_ids)));
    const { data: mods } = modIds.length
      ? await supabaseAdmin
          .from('catalog_modifiers')
          .select('id, cafe_id, parent_item_id, name, price_delta_cents, square_object_id')
          .in('id', modIds)
      : { data: [] };
    const modById = new Map(mods?.map((m) => [m.id, m]) ?? []);
    for (const mod of mods ?? []) {
      if (mod.cafe_id !== cafe.id) {
        return errorResponse('Modifier does not belong to this cafe', 400);
      }
    }

    // Reprice.
    let subtotalCents = 0;
    const orderItemsPayload: {
      catalog_item_id: string;
      name_snapshot: string;
      qty: number;
      unit_price_cents: number;
      modifiers_json: Array<{ catalog_object_id: string; name: string; price_delta_cents: number }>;
    }[] = [];

    for (const l of body.lines) {
      const it = itemById.get(l.catalog_item_id)!;
      const lineMods = l.modifier_ids.map((id) => {
        const m = modById.get(id);
        if (!m) throw new Error(`Unknown modifier ${id}`);
        if (m.parent_item_id && m.parent_item_id !== it.id) {
          throw new Error(`Modifier ${id} does not belong to item ${it.id}`);
        }
        return m;
      });
      const lineUnit = it.price_cents + lineMods.reduce((s, m) => s + m.price_delta_cents, 0);
      subtotalCents += lineUnit * l.qty;
      orderItemsPayload.push({
        catalog_item_id: it.id,
        name_snapshot: it.name,
        qty: l.qty,
        unit_price_cents: it.price_cents,
        modifiers_json: lineMods.map((m) => ({
          catalog_object_id: m.square_object_id,
          name: m.name,
          price_delta_cents: m.price_delta_cents,
        })),
      });
    }

    // Resolve redemption from the server-trusted balance.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bean_balance, stripe_customer_id, email, name')
      .eq('id', userId)
      .single();
    const balance = profile?.bean_balance ?? 0;

    const wantsRedeem =
      body.redeem_beans &&
      balance >= REDEMPTION_THRESHOLD_BEANS &&
      subtotalCents >= REDEMPTION_VALUE_CENTS;

    const beansRedeemed = wantsRedeem ? REDEMPTION_THRESHOLD_BEANS : 0;
    const beansValueCents = wantsRedeem ? REDEMPTION_VALUE_CENTS : 0;

    const tipCents = body.tip_cents;
    const totalChargedCents = Math.max(0, subtotalCents + tipCents - beansValueCents);
    const appFeeCents = appFeeFor(subtotalCents);

    if (totalChargedCents < 30) {
      // Stripe GBP minimum is £0.30.
      return errorResponse('Order total below the minimum charge (£0.30)', 400);
    }

    // Create or reuse the Stripe customer for this user.
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const customer = await stripe.customers.create({
        email: profile?.email ?? authUser?.user?.email ?? undefined,
        phone: authUser?.user?.phone ?? undefined,
        name: profile?.name ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // PaymentIntent. Destination-charge to the cafe's Connect account when set
    // (M2+); plain charge to BEAN's platform account when not (M1).
    const piParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: totalChargedCents,
      currency: 'gbp',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      description: `BEAN order at ${cafe.name}`,
      metadata: {
        user_id: userId,
        cafe_id: cafe.id,
        subtotal_cents: String(subtotalCents),
        tip_cents: String(tipCents),
        beans_redeemed: String(beansRedeemed),
        beans_value_cents: String(beansValueCents),
        app_fee_cents: String(appFeeCents),
      },
    };
    if (cafe.stripe_account_id) {
      piParams.on_behalf_of = cafe.stripe_account_id;
      piParams.transfer_data = { destination: cafe.stripe_account_id };
      piParams.application_fee_amount = appFeeCents;
    }
    const intent = await stripe.paymentIntents.create(piParams);

    // Insert the order row in `pending` state. Square injection happens after
    // payment confirmation (order-confirm or webhook).
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        cafe_id: cafe.id,
        status: 'pending',
        subtotal_cents: subtotalCents,
        tip_cents: tipCents,
        beans_redeemed: beansRedeemed,
        beans_value_cents: beansValueCents,
        total_charged_cents: totalChargedCents,
        app_fee_cents: appFeeCents,
        stripe_payment_intent_id: intent.id,
      })
      .select('id')
      .single();
    if (orderErr || !order) {
      // Cancel the intent so we don't leak a half-created charge attempt.
      await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
      console.error('order insert failed', orderErr);
      return errorResponse('Could not create order', 500);
    }

    const itemsRows = orderItemsPayload.map((row) => ({ ...row, order_id: order.id }));
    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(itemsRows);
    if (itemsErr) {
      console.error('order_items insert failed', itemsErr);
      return errorResponse('Could not create order items', 500);
    }

    // Ephemeral key lets PaymentSheet save cards under the customer.
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId! },
      { apiVersion: '2024-11-20.acacia' },
    );

    return jsonResponse({
      order_id: order.id,
      payment_intent_client_secret: intent.client_secret,
      ephemeral_key_secret: ephemeralKey.secret,
      customer_id: customerId,
      totals: {
        subtotal_cents: subtotalCents,
        tip_cents: tipCents,
        beans_redeemed: beansRedeemed,
        beans_value_cents: beansValueCents,
        total_charged_cents: totalChargedCents,
        app_fee_cents: appFeeCents,
      },
    });
  } catch (err) {
    console.error('checkout-create-intent failed', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
