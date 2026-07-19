# DodoPay Playbook

Repo-local guide for AI agents and engineers handling Dodo Payments work directly from this workspace.

## Scope

This guide covers:
- using the Dodo test API key from `apps/dashboard/.env.development`
- creating products directly with the Dodo REST API
- creating and inspecting webhooks
- running checkout and webhook verification
- debugging Dodo provider behavior in this repo
- repo-specific command patterns that already worked in `affyink`

This guide does not assume a Dodo MCP server. In the current workspace, Dodo is used through direct HTTP/API calls.

## Environment

Current repo-local source of truth for test-mode Dodo credentials:
- `apps/dashboard/.env.development`

Relevant variables:
- `DODOPAYMENT_API_KEY`
- `DODOPAYMENT_BRAND_ID_BFFY`
- `DODOPAYMENT_PRODUCT_ID_BFFY`
- `DODOPAYMENT_PRODUCT_ID_BFFY_LAUNCH_REVSHARE`
- `DODOPAYMENT_PRODUCT_ID_BFFY_LAUNCH_FLAT`
- `DODOPAYMENT_PRODUCT_ID_BFFY_GROWTH_REVSHARE`
- `DODOPAYMENT_PRODUCT_ID_BFFY_GROWTH_FLAT`
- `DODOPAYMENT_PRODUCT_ID_BFFY_SCALE_REVSHARE`
- `DODOPAYMENT_PRODUCT_ID_BFFY_SCALE_FLAT`
- `DODOPAYMENT_WEBHOOK_SECRET`

Test host:
- `https://test.dodopayments.com`

Live host:
- `https://live.dodopayments.com`

Official references:
- Dodo API introduction: https://docs.dodopayments.com/api-reference
- Create product: https://docs.dodopayments.com/api-reference/products/post-products
- List products: https://docs.dodopayments.com/api-reference/products/get-products
- Create webhook: https://docs.dodopayments.com/api-reference/webhooks/create-webhook
- Get webhook signing key: https://docs.dodopayments.com/api-reference/webhooks/get-webhook-signing-key
- Create checkout session: https://docs.dodopayments.com/api-reference/checkout-sessions/create
- Testing process: https://docs.dodopayments.com/miscellaneous/testing-process

## URLs Verified In This Run

These are the specific Dodo official docs URLs checked during this run while creating the product and webhook flow:

- API intro: https://docs.dodopayments.com/api-reference
- Create product API: https://docs.dodopayments.com/api-reference/products/post-products
- List products API: https://docs.dodopayments.com/api-reference/products/get-products
- Product management guide: https://docs.dodopayments.com/developer-resources/managing-products
- Create webhook API: https://docs.dodopayments.com/api-reference/webhooks/create-webhook
- Get webhook signing key API: https://docs.dodopayments.com/api-reference/webhooks/get-webhook-signing-key
- Webhook guide: https://docs.dodopayments.com/api-reference/outgoing-webhooks/post-your-webhook-url
- Create checkout session API: https://docs.dodopayments.com/api-reference/checkout-sessions/create
- Checkout features and return-url params: https://docs.dodopayments.com/features/checkout
- Test-mode vs live-mode: https://docs.dodopayments.com/miscellaneous/test-mode-vs-live-mode
- Testing guide and test cards: https://docs.dodopayments.com/miscellaneous/testing-process

Why these matter:
- `create product` and `managing products` were used to confirm the `POST /products` flow
- `webhook` and `signing key` docs were used to confirm webhook registration plus secret retrieval
- `checkout` and `testing process` were used to confirm hosted checkout behavior and test-card data
- `test mode vs live mode` was used to confirm that `https://test.dodopayments.com` is the correct host for `.env.development`

## Basic Pattern

Load the dashboard development env and then call the Dodo API directly:

```bash
pnpm exec dotenv -e apps/dashboard/.env.development -- bash -lc '
  curl -sS \
    -H "Authorization: Bearer $DODOPAYMENT_API_KEY" \
    -H "Content-Type: application/json" \
    https://test.dodopayments.com/products
'
```

Notes:
- `apps/dashboard/.env.development` is currently wired to a Dodo test key, not a live key.
- Keep responses and IDs, but never print secrets into committed docs or logs.

## Working Commands

### 1. List existing products for the BFFY brand

```bash
pnpm exec dotenv -e apps/dashboard/.env.development -- bash -lc '
  curl -sS \
    -H "Authorization: Bearer $DODOPAYMENT_API_KEY" \
    "https://test.dodopayments.com/products?brand_id=$DODOPAYMENT_BRAND_ID_BFFY&page_size=100"
'
```

### 2. Create a recurring SaaS product

This recurring payload worked in this repo on `2026-05-05`:

```bash
pnpm exec dotenv -e apps/dashboard/.env.development -- bash -lc '
  curl -sS \
    -H "Authorization: Bearer $DODOPAYMENT_API_KEY" \
    -H "Content-Type: application/json" \
    -X POST https://test.dodopayments.com/products \
    -d "{
      \"name\": \"bffy Launch Monthly Test 20260505\",
      \"description\": \"Test-mode monthly subscription product for bffy billing QA created from affyink workspace.\",
      \"brand_id\": \"$DODOPAYMENT_BRAND_ID_BFFY\",
      \"tax_category\": \"saas\",
      \"metadata\": {
        \"brand\": \"bffy\",
        \"source\": \"affyink-codex\",
        \"planKey\": \"LAUNCH\",
        \"feeMode\": \"REVSHARE\"
      },
      \"price\": {
        \"type\": \"recurring_price\",
        \"price\": 1900,
        \"currency\": \"USD\",
        \"tax_inclusive\": false,
        \"discount\": 0,
        \"purchasing_power_parity\": false,
        \"payment_frequency_count\": 1,
        \"payment_frequency_interval\": \"Month\",
        \"subscription_period_count\": 1,
        \"subscription_period_interval\": \"Month\",
        \"trial_period_days\": 14
      }
    }"
'
```

Important:
- recurring products needed more than `billing_cycle`
- the working fields were:
  - `purchasing_power_parity`
  - `payment_frequency_count`
  - `payment_frequency_interval`
  - `subscription_period_count`
  - `subscription_period_interval`
- Dodo validation errors were useful for discovering missing fields incrementally

### 3. Products created during this run

Created in Dodo test mode:
- `LAUNCH_REVSHARE` → `pdt_0NeCXrEgYUKrWBl6JKoJS` → `USD 1900`
- `LAUNCH_FLAT` → `pdt_0NeCZayGa6gO7mwjuOIzp` → `USD 2900`
- `GROWTH_REVSHARE` → `pdt_0NeCZb2MQ0Qf77RLaSxeO` → `USD 5900`
- `GROWTH_FLAT` → `pdt_0NeCZb6bIJlZlhA2If5cP` → `USD 7900`
- `SCALE_REVSHARE` → `pdt_0NeCZbB95sMuEFq65c169` → `USD 14900`
- `SCALE_FLAT` → `pdt_0NeCZbFFiCh8EkagBygLN` → `USD 17900`
- brand id: `brnd_0NdujWdq36SGRPlQx6UDH`
- cadence: every `1 Month`
- provider trial on the created test products: `14 days`

This guide records the ID for traceability only. It does not automatically update local env files.

### 4. Create a webhook endpoint

```bash
pnpm exec dotenv -e apps/dashboard/.env.development -- bash -lc '
  curl -sS \
    -H "Authorization: Bearer $DODOPAYMENT_API_KEY" \
    -H "Content-Type: application/json" \
    -X POST https://test.dodopayments.com/webhooks \
    -d "{
      \"url\": \"https://your-public-endpoint.example/api/webhooks/billing/dodo\",
      \"description\": \"affyink dashboard dodo billing webhook qa\",
      \"filter_types\": [
        \"payment.failed\",
        \"payment.succeeded\",
        \"refund.succeeded\",
        \"subscription.active\",
        \"subscription.cancelled\",
        \"subscription.renewed\",
        \"subscription.updated\"
      ]
    }"
'
```

### 5. Retrieve the webhook signing secret

```bash
pnpm exec dotenv -e apps/dashboard/.env.development -- bash -lc '
  curl -sS \
    -H "Authorization: Bearer $DODOPAYMENT_API_KEY" \
    https://test.dodopayments.com/webhooks/<webhook_id>/secret
'
```

Use the returned `secret` as `DODOPAYMENT_WEBHOOK_SECRET` for the local receiver you want Dodo to sign against.

### 6. Verify a hosted checkout session

```bash
pnpm exec dotenv -e apps/dashboard/.env.development -- bash -lc '
  curl -sS \
    -H "Authorization: Bearer $DODOPAYMENT_API_KEY" \
    https://test.dodopayments.com/checkouts/<checkout_id>
'
```

Useful fields:
- `id`
- `payment_id`
- `payment_status`
- `created_at`
- `customer_email`

## Repo-Specific Notes

### Checkout in this repo

Current dashboard route:
- `POST /api/billing/checkout`

Current implementation:
- [apps/dashboard/src/app/api/billing/checkout/route.ts](/home/ubuntu/code_workspace/affyink/apps/dashboard/src/app/api/billing/checkout/route.ts:1)
- [apps/dashboard/src/lib/billing/dodo.ts](/home/ubuntu/code_workspace/affyink/apps/dashboard/src/lib/billing/dodo.ts:1)

Current flow now prefers plan-specific BFFY env vars and falls back to the legacy single BFFY product id only when a plan-specific key is absent.

Current BFFY self-serve mapping:
- `LAUNCH + REVSHARE` → `DODOPAYMENT_PRODUCT_ID_BFFY_LAUNCH_REVSHARE`
- `LAUNCH + FLAT` → `DODOPAYMENT_PRODUCT_ID_BFFY_LAUNCH_FLAT`
- `GROWTH + REVSHARE` → `DODOPAYMENT_PRODUCT_ID_BFFY_GROWTH_REVSHARE`
- `GROWTH + FLAT` → `DODOPAYMENT_PRODUCT_ID_BFFY_GROWTH_FLAT`
- `SCALE + REVSHARE` → `DODOPAYMENT_PRODUCT_ID_BFFY_SCALE_REVSHARE`
- `SCALE + FLAT` → `DODOPAYMENT_PRODUCT_ID_BFFY_SCALE_FLAT`

`FREE` and `ENTERPRISE` do not require Dodo self-serve recurring products in the current billing policy.

### Webhook receiver in this repo

Current route:
- [apps/dashboard/src/app/api/webhooks/billing/dodo/route.ts](/home/ubuntu/code_workspace/affyink/apps/dashboard/src/app/api/webhooks/billing/dodo/route.ts:1)

Dedicated backend route:
- [apps/api/src/routes/billing-webhooks.ts](/home/ubuntu/code_workspace/affyink/apps/api/src/routes/billing-webhooks.ts:1)

## Affyink Dodo Test Learnings

This section records what actually worked in the `affyink` workspace during live Dodo test-mode verification. It is intended to save future agents from re-learning the same provider quirks.

### 1. What counted as real success

The following were successfully proven in this repo:
- real hosted Dodo checkout session creation from `POST /api/billing/checkout`
- browser automation reaching the Dodo hosted success page with official test-card data
- provider-origin webhook delivery returning `200` on the local public webhook endpoint
- local advertiser billing state changing to:
  - `status = ACTIVE`
  - `source = BILLING_METADATA`
  - `subscriptionId = sub_...`

This means:
- checkout creation is real
- hosted checkout completion is real
- webhook ingestion is real
- local billing state mutation from provider events is real

### 2. Official test card data that worked

Official Dodo docs:
- https://docs.dodopayments.com/miscellaneous/testing-process
- https://docs.dodopayments.com/miscellaneous/testing-process#subscription-failure-testing-renewal%2Fupgrade%2Fdowngrade

Successful card values used in this repo:
- card number: `4242424242424242`
- expiry: `06/32`
- CVV: `123`

### 3. Critical webhook lesson: use `apps/api` direct, not dashboard proxy

Important discovery from live testing:
- initial webhook deliveries through the dashboard proxy route returned `401`
- after retargeting the active Dodo webhook endpoint to the dedicated backend route, provider-origin deliveries returned `200`

The durable public target for verification should be:
- `apps/api` direct public endpoint
- path: `/v1/webhooks/billing/dodo`

Why this matters:
- it removes one proxy hop during provider verification
- it makes logs clearer
- it aligns better with the repo rule that backend domain logic belongs in `apps/api`

### 4. Webhook signature format that actually matters

Relevant facts from live debugging plus the sibling `kvidai` implementation:
- Dodo uses the Standard Webhooks style
- header names:
  - `webhook-id`
  - `webhook-timestamp`
  - `webhook-signature`
- secret format:
  - `whsec_...`
  - the secret body after `whsec_` is base64-encoded
- signed content format:
  - `{webhook-id}.{webhook-timestamp}.{raw-body}`
- current comparison logic must tolerate:
  - `v1,<sig>` style signature tokens
  - base64 signatures
  - timestamp tolerance checks

Working repo locations after the fix:
- [apps/api/src/lib/billing/dodo.ts](/home/ubuntu/code_workspace/affyink/apps/api/src/lib/billing/dodo.ts:1)
- [apps/dashboard/src/lib/billing/dodo.ts](/home/ubuntu/code_workspace/affyink/apps/dashboard/src/lib/billing/dodo.ts:1)

Reference sibling implementation inspected during debugging:
- `/home/ubuntu/code_workspace/kvidai/apps/strapi-ts/src/api/hook/controllers/hook.ts`

### 5. Trial-first product behavior vs immediate-charge behavior

This repo hit an important product-side nuance:

Earlier BFFY recurring test products were created with:
- `trial_period_days = 14`

What that means operationally:
- subscription activation can be proven
- webhook lifecycle state can be proven
- but immediate paid-charge proof is incomplete
- `paymentId` may remain `null`
- refund-request surfaces that require a successful paid charge remain unavailable

Observed result with the trial-first product:
- billing became `ACTIVE`
- `subscriptionId` was present
- `paymentId` stayed `null`
- refund-request stayed unavailable

To test immediate-charge/refund-ready behavior, create and use a no-trial recurring product.

### 6. No-trial product created in this repo

Created during this run:
- `LAUNCH_REVSHARE_NO_TRIAL` → `pdt_0NeCrxFFCA61voWUZZcFp`
- price: `USD 1900`
- cadence: `1 Month`
- trial: `0 days`

Current local dev env was temporarily switched to that product for:
- `DODOPAYMENT_PRODUCT_ID_BFFY`
- `DODOPAYMENT_PRODUCT_ID_BFFY_LAUNCH_REVSHARE`

This was done only for local verification of immediate-charge behavior.

### 7. Payload shape that actually reduced checkout friction

The working Dodo checkout payload in this repo is not:
- `billing`

It must be:
- `billing_address`

And for the BFFY no-trial verification flow, this also helped:
- `minimal_address: true`

What changed after switching to the documented shape:
- hosted checkout moved from full manual address entry toward the reduced `country + zipCode` step
- the provider accepted the seeded KR billing address and later exposed it back on the successful payment record

The working seeded address values used in this repo:
- `street: 123 Teheran-ro`
- `city: Seoul`
- `state: Gangnam-gu`
- `country: KR`
- `zipcode: 06142`

### 8. Successful no-trial paid-state proof

Live local verification reached a real paid test state for the seeded BFFY merchant.

Confirmed provider objects:
- `paymentId = pay_0NeCzCsRnjmmoO2uk5lRX`
- `customerId = cus_0NeCi9PLj2Fp4PwgKqnj4`
- `subscriptionId = sub_0NeCzCsX5Fy4Zto0VurHy`

Confirmed local merchant route results after webhook delivery and lazy hydration:
- `GET /api/billing`
  - `status = ACTIVE`
  - `customerId` present
  - `subscriptionId` present
- `GET /api/billing/refund-request`
  - `paymentId` present
  - `canSubmit = true`
  - refund preview populated
- `POST /api/billing/portal`
  - returns a real Dodo test customer-portal URL

Important nuance:
- billing snapshot hydration from webhook alone did not always populate `customerId/subscriptionId`
- the repo now lazily hydrates those fields from `GET /payments/{payment_id}` when `lastPaymentId` exists
- this is why paid-state billing and portal access now recover correctly even if the initial webhook payload is sparse

### 9. Customer portal response shape

Do not assume the customer-portal session response uses `customer_portal_url`.

In this repo, the live test response used:
- `link`

If portal creation looks broken, inspect the raw provider response before assuming auth or routing is wrong.

### 10. Stored reproducible runner

Do not keep redoing this with ad-hoc inline one-off commands.

Repo-local reproducible runner:
- [scripts/dodo-billing-checkout-e2e.ts](/home/ubuntu/code_workspace/affyink/scripts/dodo-billing-checkout-e2e.ts:1)

Purpose:
- create checkout through local app routes
- open Dodo hosted checkout
- fill contact/address
- fill card
- submit payment
- poll local billing + refund-request state after webhook delivery

Run:

```bash
PLAYWRIGHT_TEST_AUTH_BYPASS=true pnpm exec tsx scripts/dodo-billing-checkout-e2e.ts
```

If the runner gets stuck:
- inspect `output/playwright/`
- check local API logs on `apps/api`
- confirm the public webhook URL still points to the dedicated API route
- note the current runner already handles the reduced `country + zipCode` step, but it still needs more work to automate the hosted card-entry stage reliably

### 11. Local verification stack that worked

Working local shape:
- dashboard: `http://localhost:3001`
- API: `http://localhost:3002`
- dashboard auth bypass:
  - `PLAYWRIGHT_TEST_AUTH_BYPASS=true`
- Dodo test host:
  - `https://test.dodopayments.com`
- public webhook tunnel:
  - localxpose reserved domain pointing at the API server

Recommended verification order:
1. Start dashboard and API with `.env.development`.
2. Confirm API health: `curl http://localhost:3002/v1/health`
3. Confirm `POST /api/billing/checkout` returns a real hosted checkout URL.
4. Run the stored checkout runner.
5. Watch API logs for `POST /v1/webhooks/billing/dodo`.
6. Re-check:
   - `GET /api/billing`
   - `GET /api/billing/refund-request`

### 12. Symptoms that burned time

These specific pitfalls cost time during verification:
- hosted checkout UI is external provider UI, so selector assumptions drift quickly
- hidden vs visible address inputs can share the same `name`
- Dodo’s documented `billing_address` matters; sending `billing` does not produce the same checkout behavior
- dashboard-proxy webhook verification made the failure mode less obvious than hitting `apps/api` directly
- trial-first recurring products make it look like webhook logic is still broken when the real issue is “no immediate charge happened”
- `paymentId` and `subscription ACTIVE` are different proof points; do not treat them as equivalent
- customer portal responses may use `link`, not `customer_portal_url`

### 13. Practical rule for future agents

If the goal is only:
- `subscription activation + webhook ingestion`

then the trial-first recurring product is enough.

If the goal is:
- `refund-ready paid state`
- `paymentId`
- merchant refund-request availability

then a no-trial recurring product is required.

It expects:
- standard Dodo webhook signature headers
- `DODOPAYMENT_WEBHOOK_SECRET` present at runtime

### Tunnel workflow

Repo guide:
- [localxpose-tunnel.md](/home/ubuntu/code_workspace/affyink/docs/localxpose-tunnel.md:1)

Example:

```bash
/snap/bin/loclx tunnel http -t 3006 -s affyinkdodo0505
```

Then create the Dodo webhook against:

```text
https://affyinkdodo0505.loclx.io/api/webhooks/billing/dodo
```

## Test Cards

From Dodo’s official testing guide:
- successful Visa: `4242424242424242`
- successful Mastercard: `5555555555554444`
- expiry: `06/32`
- CVV: `123`

Official source:
- https://docs.dodopayments.com/miscellaneous/testing-process

## Operational Rules

- Assume `.env.development` uses Dodo test mode unless explicitly verified otherwise.
- Prefer direct API calls plus saved IDs over ad-hoc dashboard clicking when you need deterministic evidence.
- Keep `DODOPAYMENT_PRODUCT_ID_BFFY` as a compatibility fallback even after plan-specific product ids are added.
- When you create a webhook for QA, also record its webhook id and signing secret handling path.
- For billing verification, provider-origin webhook delivery is stronger evidence than return-url query params alone.
