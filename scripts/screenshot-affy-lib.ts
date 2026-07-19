import type { Page } from "@playwright/test";
export * from "./screenshot-lib";
import { gotoAndWait as gotoAndWaitBase } from "./screenshot-lib";

export async function waitForAffyPageReady(page: Page) {
  // Wait for auth spinner to clear
  try {
    await page.waitForFunction(
      () => !document.body?.textContent?.includes("Loading your dashboard"),
      { timeout: 15_000 }
    );
  } catch {
    /* no spinner */
  }

  // For auth-gated sidebar layouts (merchant/agency/affiliate), the layout
  // returns null while auth is loading. Wait for the sidebar to appear,
  // which signals auth resolved and the full UI has rendered.
  try {
    await page.waitForSelector('[data-sidebar="sidebar"]', {
      timeout: 10_000,
      state: "attached",
    });
  } catch {
    /* public page or non-sidebar layout */
  }

  // Two-phase skeleton wait: wait for skeleton to appear then disappear.
  // This is the reliable signal that data has loaded.
  try {
    await page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length > 0,
      { timeout: 3_000 }
    );
    await page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      { timeout: 15_000 }
    );
  } catch {
    /* no skeleton or already cleared */
  }
}

export async function gotoAndWait(page: Page, url: string, settleMs = 500) {
  return gotoAndWaitBase(page, url, {
    settleMs,
    afterLoad: waitForAffyPageReady,
  });
}
