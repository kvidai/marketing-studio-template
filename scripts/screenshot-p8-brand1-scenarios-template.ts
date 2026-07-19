/**
 * P8 Multi-brand scenarios — authenticated roles across 2+ brands
 *
 * Pattern: 1 script handles N brands. Each brand gets its own browser context
 * with a brand-routing header (e.g. x-forwarded-host). Screenshots land in:
 *   docs/ui-screenshots/{brand}/{user-prefix}/{user-prefix}-{page}_{DATE}.png
 *
 * Roles covered (fill in per project):
 *   {Brand1}: {role-a} ({N} users), {role-b} ({N} users)
 *   {Brand2}: {role-a} ({N} users), {role-c} ({N} users)  ← brand-specific roles ok
 *
 * Usage:
 *   pnpm exec tsx scripts/screenshot-p8-{name}-scenarios.ts
 *   PORT=3002 pnpm exec tsx scripts/screenshot-p8-{name}-scenarios.ts
 */
import { chromium } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { capture, gotoAndWait, BASE_URL, DATE } from "./screenshot-lib";

// ── Brand definitions ─────────────────────────────────────────────────────────
// One entry per brand. `header` is sent on every request so the server/middleware
// can resolve the correct brand context.
//
// Common routing patterns:
//   { "x-forwarded-host": "brand1.example.com" }  ← reverse-proxy header
//   { "x-brand-id": "brand1" }                    ← custom header
//
// If brands run on separate ports, override BASE_URL per brand instead.

const BRANDS = [
  {
    key: "brand1",           // output subdir: docs/ui-screenshots/brand1/
    label: "Brand1",         // console log label
    header: { "x-forwarded-host": "{brand1.example.com}" },
  },
  {
    key: "brand2",
    label: "Brand2",
    header: { "x-forwarded-host": "{brand2.example.com}" },
  },
  // { key: "brand3", label: "Brand3", header: { "x-forwarded-host": "{brand3.example.com}" } },
] as const;

type Brand = typeof BRANDS[number];

// ── Auth ──────────────────────────────────────────────────────────────────────
// Option A: dev-bypass cookie (no login UI — fastest)
//   Requires: PLAYWRIGHT_TEST_AUTH_BYPASS=true on the server
async function authenticate(page: Page, email: string) {
  await page.context().addCookies([{
    name: "dev-bypass-user",
    value: email,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 3600,
  }]);
}

// Option B: OTP login — uncomment if bypass is unavailable
// import { otpLogin } from "./screenshot-lib";
// async function authenticate(page: Page, email: string) {
//   await otpLogin(page, email, "{111111}");
// }

// ── Role A — shared across all brands ────────────────────────────────────────
const ROLE_A_USERS = [
  { prefix: "{role-a}-user1", email: "{user1@example.com}" },
  { prefix: "{role-a}-user2", email: "{user2@example.com}" },
];

const ROLE_A_PAGES: [string, string][] = [
  ["{overview}",  "/{route}"],
  ["{detail}",    "/{route}/{sub}"],
];

// ── Role B — shared across all brands ────────────────────────────────────────
const ROLE_B_USERS = [
  { prefix: "{role-b}-user1", email: "{user1@example.com}" },
];

const ROLE_B_PAGES: [string, string][] = [
  ["{dashboard}", "/{route}"],
  ["{settings}",  "/{route}/settings"],
];

// ── Core helpers ──────────────────────────────────────────────────────────────
async function newBrandContext(browser: Browser, brand: Brand): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1920, height: 1080 },
    extraHTTPHeaders: brand.header,
  });
}

async function shootRole(
  browser: Browser,
  brand: Brand,
  user: { prefix: string; email: string },
  pages: [string, string][],
) {
  const ctx = await newBrandContext(browser, brand);
  const page: Page = await ctx.newPage();
  try {
    await authenticate(page, user.email);
    for (const [pageName, url] of pages) {
      try {
        await gotoAndWait(page, `${BASE_URL}${url}`);
        await capture(page, `${brand.key}/${user.prefix}`, `${user.prefix}-${pageName}`);
      } catch (err) {
        console.error(`  ✗ FAILED ${brand.key}/${user.prefix}-${pageName}: ${(err as Error).message.split("\n")[0]}`);
      }
    }
  } finally {
    await page.close();
    await ctx.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: true });
  console.log(`=== P8 Multi-brand Scenarios (${DATE}, ${BASE_URL}) ===`);

  for (const brand of BRANDS) {
    console.log(`\n════ ${brand.label} (${brand.key}) ════`);

    console.log(`\n── Role A (${ROLE_A_USERS.length} users) ──`);
    for (const user of ROLE_A_USERS) {
      console.log(`\n  ${user.prefix} (${user.email})`);
      await shootRole(browser, brand, user, ROLE_A_PAGES);
    }

    console.log(`\n── Role B (${ROLE_B_USERS.length} users) ──`);
    for (const user of ROLE_B_USERS) {
      console.log(`\n  ${user.prefix} (${user.email})`);
      await shootRole(browser, brand, user, ROLE_B_PAGES);
    }

    // Brand-specific roles: wrap in an if block
    // if (brand.key === "brand1") {
    //   console.log(`\n── Role C — brand1 only ──`);
    //   for (const user of ROLE_C_USERS) { await shootRole(browser, brand, user, ROLE_C_PAGES); }
    // }
  }

  await browser.close();
  const brandKeys = BRANDS.map((b) => b.key).join(", ");
  console.log(`\n=== P8 done — screenshots in docs/ui-screenshots/{${brandKeys}}/ ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
