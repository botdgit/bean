# BEAN

Order-ahead and shared loyalty for independent UK coffee shops.

One app across many cafes. No SaaS fee for cafes — BEAN earns a commission
on the orders it brings. Orders land in each cafe's existing Square POS
as already-paid; loyalty rewards are funded by commission and reimbursed
out-of-band so cafes' tills are unaffected.

## Repo

- `mobile/` — Expo React Native iOS app (the customer app).
- `supabase/` — Postgres schema + Edge Functions.
- `ops/` — operator scripts (cafe onboarding, etc.).

See `CLAUDE.md` for architecture, conventions, and how to develop.

## Status

Early development. v1 is an iOS customer app paired with a small backend
that injects orders into Square POS. Pilot scope: 3–10 Square-using
cafes in one dense area.
