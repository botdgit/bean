# BEAN — Project Guide for Claude Code

BEAN is a shared order-ahead and loyalty network for independent UK coffee
shops. Customers use one iOS app across many cafes; cafes pay no SaaS fee
and only owe commission on orders BEAN brings them. Orders flow into each
cafe's existing Square POS as already-paid (no till change). Loyalty
("Beans") is funded by BEAN's commission and reimbursed to cafes
out-of-band via Stripe Connect transfers so their tills are unaffected.

The full v1 plan lives at `/root/.claude/plans/bean-ios-app-is-resilient-eclipse.md`
(outside the repo). Read it before making non-trivial changes.

## Repo Layout

- `mobile/` — Expo React Native customer app (iOS-first, dev build required).
  - `src/app/` — expo-router screens.
  - `src/lib/` — Supabase + Stripe clients, formatting helpers.
  - `src/state/` — zustand stores (basket).
  - `src/hooks/` — data hooks (useCafes, useOrderStatus).
  - `src/components/` — reusable UI primitives.
  - `src/types/` — Supabase-generated DB types (regenerate with `supabase gen types typescript --linked > mobile/src/types/database.ts`).
- `supabase/`
  - `migrations/` — SQL migrations. `0001_init.sql` is the full v1 schema.
  - `functions/` — Edge Functions (Deno). `_shared/` holds clients reused across functions.
- `ops/` — one-off operator scripts (e.g., onboarding a cafe).
- `.github/workflows/` — EAS build workflow (placeholder until iOS signing is configured).

## Stack Decisions (locked)

- **Mobile**: Expo SDK with expo-router; dev build (Expo Go cannot host Stripe Apple Pay).
- **Backend**: Supabase (Postgres + Auth + Edge Functions + Storage + Vault for secrets).
- **Payments**: Stripe Connect Express; destination charges with `application_fee_amount`; Apple Pay via Stripe PaymentSheet.
- **POS**: Square only for v1; orders injected as `EXTERNAL` tender so the cafe's till sees them as already paid.
- **Loyalty**: earn 1 Bean per £0.10 spent; redeem 400 Beans = £4 off (single tier); 12-month expiry. Square always sees full retail; BEAN reimburses cafes weekly via Stripe Connect transfers.
- **State**: zustand for client basket; server is source of truth for orders/loyalty.

## Money Conventions

- All amounts stored in **integer pence** (`*_cents` columns). Never floats.
- Display formatting only happens at the UI edge via `src/lib/format.ts`.
- BEAN commission default is **7% of subtotal** (pre-tip), tunable per cafe.

## Idempotency Anchors

- `webhook_events.event_id` — every Stripe/Square webhook is deduped here before processing.
- `loyalty_ledger.idempotency_key` — `earn:{order_id}`, `redeem:{order_id}`, `expire:{ledger_id}`, etc.
- `orders.stripe_payment_intent_id` — single source of truth for "did we charge".
- `reimbursements (cafe_id, period_start)` unique — weekly transfer cron is safe to re-run.

## Workflow

- Branch: `claude/bean-app-positioning-gH85S` (this is the active dev branch).
- Run `supabase db reset` locally to apply migrations; never edit applied migrations — add a new one.
- Generate DB types after schema changes: `supabase gen types typescript --linked > mobile/src/types/database.ts`.
- Mobile dev: `cd mobile && npm install && npx expo start --dev-client` (requires a dev build installed on the iPhone — `eas build --profile development --platform ios`).

## Running in Expo Go (preview via EAS Update)

The sandbox can't tunnel Metro, so for phone testing we publish an EAS Update
that Expo Go loads from Expo's CDN. Stripe is a native module absent from Expo
Go, so checkout falls back to the `mock-checkout` edge function (see
`src/lib/stripe.ts` `inExpoGo`/`stripeAvailable`).

- EAS project: `@onico/bean`, projectId `04d56fe4-34ff-4076-957d-c53e92551dd4`.
- The app targets **Expo SDK 54** (RN 0.81, React 19). Expo Go from the App
  Store only runs the latest SDK, so the project must track it.
- `runtimeVersion` in `app.json` is pinned to `"exposdk:54.0.0"` **specifically so
  Expo Go can load the update**. Before making real dev/production builds,
  switch this to a policy (`fingerprint` or `appVersion`) — a hardcoded
  `exposdk:` runtime is only correct for Expo Go.
- `babel.config.js` includes a `strip-otel-dynamic-import` plugin that
  neutralizes `@supabase/supabase-js`'s optional `import("@opentelemetry/api")`.
  Without it, Metro leaves a raw dynamic `import()` (variable specifier) that
  Hermes rejects with "Invalid expression encountered" on SDK 54.
- Publish: `cd mobile && EXPO_TOKEN=… npx eas-cli@latest update --branch preview -m "msg"`.
- The `preview` channel is linked to the `preview` branch. Expo Go opens:
  `exp://u.expo.dev/04d56fe4-34ff-4076-957d-c53e92551dd4?channel-name=preview`
  (always latest) or a specific `/group/<id>` URL (pinned).
- Hot reload does NOT apply — each code change needs a re-publish.
- Test sign-in uses Supabase test OTP numbers (+447700900000/001/002, code
  `123456`), configured in the project's auth settings.

## What's NOT Built Yet

This repo is at M1 (Skateboard). Most files are stubs. Before adding features, check the milestone status in the plan file and prefer extending existing structure over creating parallel implementations.
