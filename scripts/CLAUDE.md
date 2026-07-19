# scripts/ — Screenshot Automation

## Files

| File | Role |
|------|------|
| `screenshot-lib.ts` | Shared generic helpers — cross-repo import target |
| `screenshot-{projectName(affy, etc)}-lib.ts` | Repo-specific example wrapper — inject custom readiness callback on top of `screenshot-lib.ts` |
| `screenshot-lib.sh` | Shell equivalent (for agent-browser environments) |
| `screenshot-p1-template.ts` | Phase 1 template (public/no-auth pages) |
| `screenshot-ui.sh` | Shell-based full run template |

---

## `screenshot-lib.ts` — Shared Library

All screenshot scripts must import from this file. Do not duplicate helpers across scripts.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `BASE_URL` | `string` | `http://localhost:{PORT}` (override: `PORT=` or `BASE_URL=`) |
| `DATE` | `string` | `YYYYMMDD` — appended to every filename |
| `SCREENSHOT_DIR` | `string` | `docs/ui-screenshots/` (absolute path) |
| `launchBrowser()` | fn | Launch headless Chromium |
| `newPage(browser, w?, h?, options?)` | fn | New page at 1920×1080; optional `extraHTTPHeaders`; auto-attaches console/error/requestfailed listeners |
| `capture(page, subdir, name)` | fn | Save `{SCREENSHOT_DIR}/{subdir}/{name}_{DATE}.png` + `.meta.json` diagnostics |
| `captureAllSections(page, subdir, name)` | fn | Full-page scroll capture: `name.png`, `name-1.png`, `name-2.png`, … |
| `gotoAndWait(page, url, settleMsOrOptions?)` | fn | Generic navigate + status check + optional callback + networkidle wait |
| `devLogin(page, email, pw, redirectTo?)` | fn | Dev login via `/api/auth/dev-login` |
| `setBypassUser(page, email)` | fn | Set `dev-bypass-user` cookie (requires `PLAYWRIGHT_TEST_AUTH_BYPASS=true`) |
| `otpLogin(page, email, otp)` | fn | OTP login flow |
| `apiGet<T>(page, apiPath)` | fn | Authenticated API call reusing browser session |

### Diagnostics

`newPage()` automatically captures per-page:
- `console.error` messages
- `console.warning` messages
- `page.on('pageerror')` — uncaught JS errors
- `page.on('requestfailed')` — failed network requests

`capture()` writes these to `{file}.meta.json` alongside every screenshot.

Additional generic metadata written by `capture()` / `gotoAndWait()`:
- `lastNavigation.requestedUrl` / `finalUrl` / `status` / `ok`
- `pageState.url` / `title` / `readyState` / `h1Text` / `bodyTextPreview`

---

## Repo-specific wrappers (recommended)

Keep `screenshot-lib.ts` generic. If a repo needs custom readiness logic (auth spinner, skeletons, sidebar mount, app-specific loaders), add a thin wrapper file such as `screenshot-{projectName(affy, etc)}-lib.ts` instead of hardcoding project selectors into the shared library.

### Pattern

```ts
import type { Page } from "@playwright/test";
export * from "./screenshot-lib";
import { gotoAndWait as gotoAndWaitBase } from "./screenshot-lib";

export async function waitForProjectPageReady(page: Page) {
  // repo-specific waits here
}

export async function gotoAndWait(page: Page, url: string, settleMs = 500) {
  return gotoAndWaitBase(page, url, {
    settleMs,
    afterLoad: waitForProjectPageReady,
  });
}
```

### When to use which file

- Import `./screenshot-lib` when the repo needs only generic browser helpers.
- Import `./screenshot-{projectName(affy, etc)}-lib.ts` (or equivalent project wrapper) when the repo needs app-specific readiness waits.
- Never push project-specific DOM selectors into `screenshot-lib.ts` unless they are truly cross-repo.

---

## `screenshot-p{N}-{names}.ts` — Phase Scripts

### Naming Rule

```
screenshot-p{N}-{description1-description2-...}.ts
```

| Part | Rule |
|------|------|
| `p{N}` | Phase number. Lower = faster + no auth. Run in order. |
| `{description(s)}` | `kebab-case`. What role/feature this phase covers. |

### Phase Numbering Convention

| Phase | Scope | Auth | Typical run time |
|-------|-------|------|-----------------|
| `p1` | Public / no-auth pages | None | < 30s |
| `p2` | Admin portal | WorkOS / bypass | 1–3 min |
| `p3` | Affiliate / partner portal | WorkOS / bypass | 1–3 min |
| `p4+` | Scenario users (seed accounts) | OTP / bypass | 3–10 min |

- **P1 runs after every significant UI change** — it's the fastest sanity check.
- Higher phases run before releases or after auth/data-flow changes.

### Creating a New Phase Script

Use `./screenshot-lib` by default. If the repo has a project-specific wrapper such as `./screenshot-{projectName(affy, etc)}-lib.ts`, switch the import only when you actually need custom readiness waits.


```ts
/**
 * P{N} {Description} — {scope summary} (~{N} screens, ~{time})
 * Run when: {trigger condition}
 *
 * Usage:
 *   tsx scripts/screenshot-p{N}-{names}.ts
 *   PORT=3002 tsx scripts/screenshot-p{N}-{names}.ts
 */
import {
  launchBrowser, newPage, capture, captureAllSections,
  gotoAndWait, BASE_URL, DATE,
  // add auth helpers as needed: devLogin, setBypassUser, otpLogin
} from "./screenshot-lib";

async function main() {
  const browser = await launchBrowser();
  const page = await newPage(browser);

  console.log(`=== P{N} {Name} (${DATE}, ${BASE_URL}) ===`);

  // --- group by screen ---
  await gotoAndWait(page, `${BASE_URL}/{path}`);
  await captureAllSections(page, "{screen}", "{screen}_{feature}");
  // capture() for single viewport, captureAllSections() for full-page scroll

  await browser.close();
  console.log("=== P{N} done ===");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### Rules

- One script = one role or one phase of work. Do not mix unrelated roles.
- Use `captureAllSections` for content-heavy pages; `capture` for fixed-height screens.
- Auth setup goes **before** the first `gotoAndWait` call.
- Console/request errors are captured automatically — no manual listener needed.
- File names follow: `{screen}/{screen}_{feature}_{DATE}.png` (DATE appended by `capture()`).

---

## Running Scripts

```bash
# Single script
pnpm exec tsx scripts/screenshot-p1-template.ts

# Custom port
PORT=3002 pnpm exec tsx scripts/screenshot-p1-template.ts

# All phases in sequence
pnpm exec tsx scripts/screenshot-p1-template.ts && \
pnpm exec tsx scripts/screenshot-p2-{name}.ts
```
