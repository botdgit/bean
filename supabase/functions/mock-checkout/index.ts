// Demo-mode "checkout" that bypasses Stripe entirely. Used by the Expo Go
// build (which can't host @stripe/stripe-react-native) so the rest of the
// flow — orders, order tracking, loyalty earn/redeem, wallet — can be
// exercised on a real phone without a dev build.
//
// SELF-DISABLING IN PRODUCTION: only allowed for cafes that have NO
// `stripe_account_id`. Once Connect onboarding (M2) wires a cafe to a
// Stripe account, mock-checkout naturally refuses to write orders for it.
// Pilot cafes always have Connect set up, so this path is effectively
// dev-only without needing a separate env flag.

import { errorResponse, handlePreflight, jsonResponse } from '../_shared/cors.ts';
import { getUserIdFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

type BasketLineInput = {
  catalog_item_id: string;
  qty: number;
  modifier_ids: string[];
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
const EARN_PENCE_PER_BEAN = 10;
const APP_FEE_BPS = 700;

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

    // Demo-only guard: cafe must NOT have a Stripe Connect account.
    const { data: cafe } = await supabaseAdmin
      .from('cafes')
      .select('id, active, stripe_account_id')
      .eq('id', body.cafe_id)
      .single();
    if (!cafe || !cafe.active) {
      return errorResponse('Cafe not found or not accepting orders', 404);
    }
    if (cafe.stripe_account_id) {
      return errorResponse(
        'mock-checkout is not available for cafes with Connect onboarding; use checkout-create-intent',
        400,
      );
    }

    // Reprice from server-side catalog (same logic as checkout-create-intent).
    const itemIds = Array.from(new Set(body.lines.map((l) => l.catalog_item_id)));
    const { data: items } = await supabaseAdmin
      .from('catalog_items')
      .select('id, cafe_id, name, price_cents, is_available')
      .in('id', itemIds);
    const itemById = new Map(items?.map((i) => [i.id, i]) ?? []);
    for (const id of itemIds) {
      const it = itemById.get(id);
      if (!it || it.cafe_id !== cafe.id || !it.is_available) {
        return errorResponse(`Item ${id} is not available`, 400);
      }
    }

    const modIds = Array.from(new Set(body.lines.flatMap((l) => l.modifier_ids)));
    const { data: mods } = modIds.length
      ? await supabaseAdmin
          .from('catalog_modifiers')
          .select('id, cafe_id, parent_item_id, name, price_delta_cents, square_object_id')
          .in('id', modIds)
      : { data: [] };
    const modById = new Map(mods?.map((m) => [m.id, m]) ?? []);

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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bean_balance')
      .eq('id', userId)
      .single();
    const balance = profile?.bean_balance ?? 0;

    const wantsRedeem =
      body.redeem_beans &&
      balance >= REDEMPTION_THRESHOLD_BEANS &&
      subtotalCents >= REDEMPTION_VALUE_CENTS;
    const beansRedeemed = wantsRedeem ? REDEMPTION_THRESHOLD_BEANS : 0;
    const beansValueCents = wantsRedeem ? REDEMPTION_VALUE_CENTS : 0;
    const tipCents = Math.max(0, body.tip_cents | 0);
    const totalChargedCents = Math.max(0, subtotalCents + tipCents - beansValueCents);
    const appFeeCents = Math.round((subtotalCents * APP_FEE_BPS) / 10_000);

    // Insert as already-paid. No Stripe id. Bypass pending so the order
    // detail screen lands directly on "Sent to the shop" — exactly what
    // the user would see post-PaymentSheet in the real flow.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        cafe_id: cafe.id,
        status: 'paid',
        subtotal_cents: subtotalCents,
        tip_cents: tipCents,
        beans_redeemed: beansRedeemed,
        beans_value_cents: beansValueCents,
        total_charged_cents: totalChargedCents,
        app_fee_cents: appFeeCents,
      })
      .select('id')
      .single();
    if (orderErr || !order) {
      console.error('mock-checkout order insert failed', orderErr);
      return errorResponse('Could not create order', 500);
    }

    const itemsRows = orderItemsPayload.map((row) => ({ ...row, order_id: order.id }));
    await supabaseAdmin.from('order_items').insert(itemsRows);

    const earnSubtotal = Math.max(0, subtotalCents - beansValueCents);
    const beansEarned = Math.floor(earnSubtotal / EARN_PENCE_PER_BEAN);

    if (beansEarned > 0) {
      await supabaseAdmin.from('loyalty_ledger').upsert(
        {
          user_id: userId,
          order_id: order.id,
          delta: beansEarned,
          reason: 'earn',
          idempotency_key: `earn:${order.id}`,
          notes: `[mock] Earned on order ${order.id}`,
        },
        { onConflict: 'idempotency_key', ignoreDuplicates: true },
      );
    }
    if (beansRedeemed > 0) {
      await supabaseAdmin.from('loyalty_ledger').upsert(
        {
          user_id: userId,
          order_id: order.id,
          delta: -beansRedeemed,
          reason: 'redeem',
          idempotency_key: `redeem:${order.id}`,
          notes: `[mock] Redeemed on order ${order.id}`,
        },
        { onConflict: 'idempotency_key', ignoreDuplicates: true },
      );
    }

    return jsonResponse({
      order_id: order.id,
      status: 'paid',
      mock: true,
      totals: {
        subtotal_cents: subtotalCents,
        tip_cents: tipCents,
        beans_redeemed: beansRedeemed,
        beans_value_cents: beansValueCents,
        total_charged_cents: totalChargedCents,
      },
      beans_earned: beansEarned,
    });
  } catch (err) {
    console.error('mock-checkout failed', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
