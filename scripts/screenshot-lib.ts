import { chromium } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

type CaptureDiagnostics = {
  viewport?: { width: number; height: number };
  lastNavigation?: {
    requestedUrl: string;
    finalUrl: string;
    status: number | null;
    ok: boolean | null;
  };
  pageState?: {
    url: string;
    title: string;
    readyState: string;
    h1Text: string | null;
    bodyTextPreview: string;
  };
  consoleErrors: string[];
  consoleWarnings: string[];
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
};

export const PORT = process.env.PORT ?? "3001";
export const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
export const DATE = new Date().toISOString().slice(0, 10).replace(/-/g, "");
export const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/ui-screenshots");
const DIAGNOSTICS = new WeakMap<Page, CaptureDiagnostics>();

export async function launchBrowser() {
  return chromium.launch({ headless: true });
}

export async function newPage(
  browser: Browser,
  width = 1920,
  height = 1080,
  options?: { extraHTTPHeaders?: Record<string, string> }
) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    extraHTTPHeaders: options?.extraHTTPHeaders,
  });
  const page = await ctx.newPage();
  const diagnostics: CaptureDiagnostics = {
    viewport: { width, height },
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    requestFailures: [],
  };

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") diagnostics.consoleErrors.push(text);
    if (msg.type() === "warning") diagnostics.consoleWarnings.push(text);
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    diagnostics.requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown",
    });
  });

  DIAGNOSTICS.set(page, diagnostics);
  return page;
}

export async function devLogin(
  page: Page,
  email: string,
  password: string,
  redirectTo = "/admin"
) {
  const url =
    `${BASE_URL}/api/auth/dev-login` +
    `?email=${encodeURIComponent(email)}` +
    `&password=${encodeURIComponent(password)}` +
    `&redirect=${encodeURIComponent(redirectTo)}`;
  await page.goto(url, { timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 90_000 });
}

// Set dev-bypass-user cookie so /api/auth/me resolves without WorkOS session.
// Requires PLAYWRIGHT_TEST_AUTH_BYPASS=true on the server.
export async function setBypassUser(page: Page, email: string) {
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

export async function otpLogin(page: Page, email: string, otp: string) {
  await page.goto(`${BASE_URL}/login`, { timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 90_000 });

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ timeout: 10_000 });
  await emailInput.fill(email);
  await page.keyboard.press("Enter");

  // OTP field — flexible selector for common patterns
  const otpInput = page
    .locator('input[inputmode="numeric"], input[maxlength="6"], input[name="otp"]')
    .first();
  await otpInput.waitFor({ timeout: 15_000 });
  await otpInput.fill(otp);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("networkidle");
}

export async function capture(page: Page, subdir: string, name: string) {
  const dir = path.join(SCREENSHOT_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}_${DATE}.png`);
  const diagnostics = DIAGNOSTICS.get(page);
  if (diagnostics) {
    try {
      diagnostics.pageState = await page.evaluate(() => {
        const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
        const h1Text = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        return {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState,
          h1Text,
          bodyTextPreview: bodyText.slice(0, 400),
        };
      });
    } catch {
      // ignore pageState collection failures so screenshot capture still succeeds
    }
  }
  await page.screenshot({ path: file, fullPage: true });
  if (diagnostics) {
    const metadataFile = `${file}.meta.json`;
    fs.writeFileSync(
      metadataFile,
      JSON.stringify(
        {
          ...diagnostics,
          capturedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }
  console.log(`  ✓ ${subdir}/${name}_${DATE}.png`);
  return file;
}

export type GotoAndWaitOptions = {
  settleMs?: number;
  afterLoad?: (page: Page) => Promise<void>;
};

// Navigate and wait for network + app loading spinner + React render settle
export async function gotoAndWait(
  page: Page,
  url: string,
  settleMsOrOptions: number | GotoAndWaitOptions = 500
) {
  const options =
    typeof settleMsOrOptions === "number"
      ? { settleMs: settleMsOrOptions }
      : settleMsOrOptions;
  // Use "load" (not "networkidle") — networkidle blocks until zero network
  // requests for 500ms, so any polling/SSE page waits up to the full timeout.
  const response = await page.goto(url, { timeout: 60_000, waitUntil: "load" });
  const diagnostics = DIAGNOSTICS.get(page);
  if (diagnostics) {
    diagnostics.lastNavigation = {
      requestedUrl: url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      ok: response?.ok() ?? null,
    };
  }
  if (response && !response.ok()) {
    throw new Error(
      `Navigation failed with ${response.status()} for ${url} (final: ${page.url()})`
    );
  }
  if (options.afterLoad) {
    await options.afterLoad(page);
  }
  // networkidle fallback: catches pages that load data without skeletons.
  // 6s cap prevents blocking on polling/SSE pages.
  try {
    await page.waitForLoadState("networkidle", { timeout: 6_000 });
  } catch { /* polling page or already idle */ }
  await page.waitForTimeout(options.settleMs ?? 500);
}

// Scroll through the full page height, capturing one screenshot per viewport section.
// Files named: name.png (top), name-1.png, name-2.png, ...
export async function captureAllSections(page: Page, subdir: string, name: string) {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = page.viewportSize()?.height ?? 1080;
  const sections = Math.ceil(scrollHeight / viewportHeight);

  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, subdir, name);

  for (let i = 1; i < sections; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight);
    await page.waitForTimeout(300);
    await capture(page, subdir, `${name}-${i}`);
  }
}

// Authenticated API call reusing the browser's session cookies
export async function apiGet<T = unknown>(page: Page, apiPath: string): Promise<T | null> {
  try {
    const res = await page.request.get(`${BASE_URL}${apiPath}`);
    if (!res.ok()) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
