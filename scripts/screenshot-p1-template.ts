/**
 * P1 Critical — no-auth public pages (~3 screens, <30 seconds)
 * Run after every significant UI change.
 *
 * Usage:
 *   tsx scripts/screenshot-p1-critical.ts
 *   PORT=3002 tsx scripts/screenshot-p1-critical.ts
 */
import { launchBrowser, newPage, capture, captureAllSections, gotoAndWait, BASE_URL, DATE } from "./screenshot-lib";

async function main() {
  const browser = await launchBrowser();
  const page = await newPage(browser);

  console.log(`=== P1 Critical (${DATE}, ${BASE_URL}) ===`);

  await gotoAndWait(page, `${BASE_URL}/`);
  await captureAllSections(page, "home", "home_default");

  // Login redirects to WorkOS (external URL) — networkidle never fires there
  await page.goto(`${BASE_URL}/login`, { timeout: 30_000, waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(2000);
  await capture(page, "login", "login_default");

  // Register redirects to WorkOS (external URL) — networkidle never fires there
  await page.goto(`${BASE_URL}/register`, { timeout: 30_000, waitUntil: "load" }).catch(() => {});
  await page.waitForTimeout(2000);
  await capture(page, "register", "register_default");

  await browser.close();
  console.log("=== P1 done ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
