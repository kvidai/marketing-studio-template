<!-- Source: epicmobile18/rules/contextual/docs/ui-testing.md -->
<!-- Version: 1.5.2 -->
<!-- Last Updated: 2026-04-21 -->

# UI Testing Guide (Base Reference)

> **This is a base reference file.**
> Copy and customize as `docs/ui-testing-custom.md` in your project
> to reflect platform-specific tooling and workflows.

## Supported Platforms

| Platform | Typical Tool |
|----------|-------------|
| **Browser (Web)** | agent-browser, Playwright |
| **Mobile App** | Appium, Detox, Maestro |
| **Desktop App** | Playwright (Electron), PyAutoGUI |

## Core Principle

**UI screenshots are more effective than E2E test code**:
- Test code must be read to understand; screenshots can be verified at a glance
- The fastest way to communicate current UI state to other contributors

## Preconditions

> **UI Test is 3rd priority (E2E).
> All lower-level tests must pass first.**

Based on the test strategy in `testing-conventions.md`:

| Order | Type | Completion Condition |
|-------|------|---------------------|
| 1 | Unit Test | All unit tests ✅ pass |
| 2 | Integration Test | All integration tests ✅ pass |
| 3 | **UI Test (E2E)** | ← start here |

Do not proceed to UI Test while Unit / Integration tests are failing.
Resolve code-level issues first, then move to E2E validation.

## Screenshot Storage Location

**Purpose determines location.** Choose one per project and document it in `ui-testing-custom.md`.

### Option A: `docs/ui-screenshots/` — Visual Manual / Team Review

Use when screenshots are:
- Committed to the repo and reviewed on GitHub
- Serving as a visual manual (e.g., FHD 1920×1080 reference images)
- Updated manually before releases or after UI changes

```
docs/ui-screenshots/
├── README.md                                      # screen ↔ URL mapping table
├── home/                                          # screen: /
│   └── home_default_20260421.png
├── login/                                         # screen: /login
│   ├── login_default_20260421.png
│   └── login_otp_20260421.png
├── dashboard/                                     # screen: /dashboard (auth required)
│   └── dashboard_filter-export_20260421.png
├── mobile/                                        # Mobile screens
│   └── home/
│       └── mobile-home_signup_20260421.png
└── desktop/                                       # Desktop screens
    └── main/
        └── desktop-main_default_20260421.png
```

✅ Committed to git — visible on GitHub  
✅ Suitable for non-developers to review UI state  
✅ Default viewport: **1920×1080 (FHD)**

### Option B: `tests/snapshots/` or `tests/e2e/screenshots/` — Test Artifacts / Regression

Use when screenshots are:
- Generated automatically by CI on every run
- Compared against baselines for regression detection (snapshot testing)
- Temporary artifacts — typically `.gitignore`d, preserved only on failure

```
tests/
├── snapshots/               # Playwright / Detox snapshot baselines
│   ├── home.png
│   └── login.png
└── e2e/
    └── screenshots/         # CI failure dumps (gitignored)
```

✅ Managed by testing tool (auto-diff on mismatch)  
✅ CI integration: save on failure, discard on pass  
⚠️ Baseline files committed; failure dumps gitignored

### Decision Guide

| Question | Answer → Location |
|----------|------------------|
| Will a human review these images? | Yes → `docs/` |
| Does CI auto-generate and compare them? | Yes → `tests/` |
| Should they persist across branches? | Yes → `docs/` |
| Are they discarded after a passing run? | Yes → `tests/` |
| Both (manual reference + regression)? | Both — separate directories |

### Filename Convention

```
docs/ui-screenshots/{screen}/{screen}_{feature}_{YYYYMMDD}.png
```

- **폴더(screen)**: URL 또는 화면 이름 — 폴더별로 묶어서 볼 때
- **파일명에도 screen 포함**: 파일만 모아서 볼 때도 어디서 찍었는지 즉시 식별 가능
- **feature**: 테스트한 기능 — 무엇을 찍었는지
- **날짜**: `_YYYYMMDD` suffix — 언제 찍었는지

기능을 2개 이상 함께 테스트했다면 `-`로 연결:

```
{screen}/{screen}_{feature1}-{feature2}-{feature3}_{YYYYMMDD}.png
```

| Example | Screen | Feature |
|---------|--------|---------|
| `login/login_default_20260421.png` | /login | 기본 로그인 |
| `login/login_otp_20260421.png` | /login | OTP 인증 |
| `dashboard/dashboard_filter-export_20260421.png` | /dashboard | 필터 + 내보내기 |
| `checkout/checkout_cart-payment-confirm_20260421.png` | /checkout | 결제 전체 흐름 |
| `mobile/home/mobile-home_signup_20260421.png` | 모바일 홈 | 회원가입 |

**규칙 요약**:
- screen 폴더: `kebab-case`, URL path 기반 (`/dashboard` → `dashboard/`)
- 파일명 구분자: `_` (언더스코어) 3개 — `{screen}_{feature}_{date}`
  - 첫 번째 `_`: screen / feature 구분
  - 마지막 `_`: feature / date 구분 (`split('_').at(-1)`로 date 분리)
- feature 내 복합 기능: `-` (하이픈) 연결
- `docs/ui-screenshots/README.md`에 screen ↔ URL 매핑 테이블 유지

### Screenshot Lifecycle — Cleanup After Each Run

After a new set of screenshots is generated, old and new files coexist in the directory.
**AI must not auto-delete old screenshots** — UI correctness requires human eyes.

**AI notification to output after every screenshot run:**

```
📸 Screenshots generated: {list of new files}

⚠️  Old and new screenshots now coexist in docs/ui-screenshots/.
    Please review visually (open both in GitHub / file viewer),
    confirm the new screenshots look correct, then:

    1. Delete old files manually
    2. git add docs/ui-screenshots/
    3. git commit -m "docs: update UI screenshots (YYYYMMDD)"
    4. git push
```

> **After generating UI screenshots**, verify each image using the `vision-checker` skill or `.claude/agents/vision-checker.md` agent.
>
> **기본 사용 (default prompt만):**
> ```bash
> pnpm --dir .agents/skills/vision-checker check /abs/path/to/screenshot.png \
>   --prompt-file .agents/skills/vision-checker/prompts/ui-screenshot.md
> ```
>
> **기본 + 화면별 custom check 추가 (`--prompt-text` 또는 `--prompt-file` 혼합 가능):**
> ```bash
> # 텍스트로 추가
> pnpm --dir .agents/skills/vision-checker check /abs/path/to/screenshot.png \
>   --prompt-file .agents/skills/vision-checker/prompts/ui-screenshot.md \
>   --prompt-text "Check if [screen name] renders correctly. Also verify the checkout button is above the fold."
>
> # 화면별 전용 파일로 추가
> pnpm --dir .agents/skills/vision-checker check /abs/path/to/screenshot.png \
>   --prompt-file .agents/skills/vision-checker/prompts/ui-screenshot.md \
>   --prompt-file prompts/checkout-specific.md
> ```
>
> `--prompt-file` / `--prompt-text`는 여러 번, 어떤 순서로든 반복 가능하며 입력 순서대로 이어붙여집니다.

---

## Browser (Web) — agent-browser

### Sample Scripts

| File | Role |
|------|------|
| `scripts/screenshot-lib.ts(.sh)` | 공통 헬퍼 함수 (DATE, init_viewport, notify_old_files 등) |
| `scripts/screenshot-ui.ts(.sh)` | 촬영 메인 스크립트 템플릿 |

두 파일을 `contextual/scripts/`에서 복사 후 프로젝트에 맞게 수정.

> **`.sh` 스크립트를 사용하지 않는 환경이라면** (예: Playwright TypeScript로 직접 구성하는 경우)
> 위 샘플 스크립트를 **로직 참고용**으로만 활용하고, 동일한 규칙(DATE suffix, notify_old_files 알림)을 `.ts` 파일 안에서 구현할 것.

### Automated Screenshot Script (Recommended)

```bash
# 1. Start test DB (first time only)
docker-compose -f docker-compose.test.yml up -d

# 2. Take all screenshots automatically
bash scripts/screenshot-ui.sh

# 3. Review old vs new, delete old, then commit
git add docs/ui-screenshots/
git commit -m "docs: update UI screenshots (YYYYMMDD)"
git push
```

### Helper Library (`scripts/screenshot-lib.ts` OR `screenshot-lib.sh`)

Common patterns are extracted into a library. `source` it when writing new screenshot scripts.

```bash
SCREENSHOT_DIR="/path/to/output"
source "$(dirname "$0")/screenshot-lib.sh"
```

#### Available Functions

**`screenshot_all_sections NAME URL [SLEEP_SECS]`** — Full-page split capture (viewport-sized chunks).

```bash
screenshot_all_sections "home" "$BASE_URL/" 5
```

**`set_locale LOCALE`** — Sets the locale cookie before opening a page.

```bash
set_locale en   # English
set_locale ko   # Korean
```

**`otp_login EMAIL CODE`** — Calls OTP verify API via browser eval → sets httpOnly session cookie.

```bash
otp_login "admin@example.com" "111111"
```

**`browser_json EXPR API_PATH`** — Fetches JSON via authenticated fetch.

```bash
ITEM_ID=$(browser_json "d.items?.[0]?.id||''" "/api/admin/items")
```

**`ensure_server PORT START_CMD [LOG]`** — Skips if server already running; otherwise starts and waits.

```bash
ensure_server 3000 "npm run dev"
```

### agent-browser Basic Commands

```bash
agent-browser set-viewport 1920 1080  # set viewport to FHD (default for this project)
agent-browser open <url>              # open page
agent-browser screenshot <path>       # save screenshot
agent-browser snapshot -i             # list interactive elements (with @ref)
agent-browser click @e1               # click element
agent-browser fill @e2 "text"         # type text
agent-browser wait 2000               # wait 2 seconds
agent-browser eval "<js-code>"        # execute JavaScript
```

> Always call `set-viewport 1920 1080` before the first screenshot in a session.

### Scroll Screenshots (Full Page Sections)

Use `screenshot_all_sections` from `screenshot-lib.ts` — auto-calculates shots based on page height:

```
shots = ceil(document.body.scrollHeight / window.innerHeight)
```

| Shot | Filename |
|------|---------|
| 1st (top) | `{name}.png` |
| 2nd | `{name}-1.png` |
| Nth | `{name}-{N-1}.png` |

---

## Mobile App — Appium / Detox / Maestro

> Customize tool choice in your project's `docs/ui-testing-custom.md`.

### Screenshot Workflow (Generic)

```bash
# 1. Start emulator / connect device
# 2. Start app
# 3. Take screenshot via tool CLI
# 4. Save to docs/ui-screenshots/mobile/
# 5. Commit
```

### Maestro Example

```yaml
# .maestro/take-screenshots.yaml
appId: com.example.myapp
---
- launchApp
- takeScreenshot: docs/ui-screenshots/mobile/home.png
- tapOn: "Login"
- takeScreenshot: docs/ui-screenshots/mobile/login.png
```

```bash
maestro test .maestro/take-screenshots.yaml
```

### Detox Example

```ts
// e2e/screenshots.test.ts
it('captures home screen', async () => {
  await device.launchApp();
  await device.takeScreenshot('home');
});
```

```bash
detox test --configuration ios.sim.debug
```

---

## Desktop App — Playwright (Electron) / PyAutoGUI

> Customize tool choice in your project's `docs/ui-testing-custom.md`.

### Playwright (Electron) Example

```ts
// tests/desktop/screenshot.spec.ts
import { _electron as electron } from 'playwright';

test('captures main window', async () => {
  const app = await electron.launch({ args: ['main.js'] });
  const page = await app.firstWindow();
  await page.screenshot({ path: 'docs/ui-screenshots/desktop/main.png' });
  await app.close();
});
```

```bash
npx playwright test tests/desktop/
```

---

## `ui-testing-custom.md` — What to Write

The script (`screenshot-ui.ts`, `ui-test.ts`, etc.) holds the implementation.
This file records **decisions and context that the script cannot express**:

```markdown
# UI Testing — {Project Name}

## Decisions
- Storage: `docs/ui-screenshots/` | `tests/snapshots/` (pick one, state why)
- Resolution: 1920×1080 (FHD) | default viewport
- Tool: agent-browser | Maestro | Playwright | ...
- Script: `scripts/screenshot-ui.ts`

## Screens to Cover
- `/` (home), `/login`, `/dashboard` (auth required)
- Pending: `/settings`

## Project-Specific Notes
- Seed accounts: see `.env.test`
- [Any quirks not obvious from the script]
```

Keep it under 20 lines. Do not repeat what is already in the script.

---

## Console Error Monitoring (Runtime Error Detection)

UI 테스트 실행 중 Chrome DevTools console error / runtime error를 캡처한다.
파일 업로드, API 호출, 렌더링 오류 등 **눈에 보이지 않는 런타임 에러**를 스크린샷과 함께 기록.

> **AI는 감지된 에러를 자동으로 수정하지 않는다.**
> 런타임 에러는 맥락 없이 판단 불가 — 사람이 확인 후 수정 여부를 결정한다.

### agent-browser (shell script)

`screenshot-lib.sh`의 `init_console_listener` / `report_console_errors` 사용:

```bash
# 페이지 open 직후 리스너 주입
agent-browser open "$BASE_URL/upload" && sleep 3
init_viewport
init_console_listener        # ← console.error / error / unhandledrejection 캡처 시작

# 실제 동작 수행 (파일 업로드 등)
agent-browser click @{upload-button} && sleep 3

# 스크린샷 후 에러 보고
screenshot_all_sections "upload/upload_file_${DATE}" "$BASE_URL/upload" 1
report_console_errors "upload/upload_file_${DATE}.png"
# → 에러 없으면: ✅ no console errors
# → 에러 있으면: ⚠️  목록 출력 + 사람이 확인하세요 안내
```

캡처 대상:

| 이벤트 | 예시 |
|--------|------|
| `console.error(...)` | `[console.error] Failed to fetch /api/upload` |
| `window.error` | `[error] TypeError: Cannot read ... (main.js:142)` |
| `unhandledrejection` | `[unhandledrejection] Error: 413 Payload Too Large` |

### Playwright (TypeScript)

```ts
// 테스트 시작 시 등록
page.on('console', msg => {
  if (msg.type() === 'error')
    console.error(`[browser console.error] ${msg.text()}`);
});
page.on('pageerror', err => {
  console.error(`[pageerror] ${err.message}`);
});
page.on('requestfailed', req => {
  console.error(`[requestfailed] ${req.url()} — ${req.failure()?.errorText}`);
});

// 테스트 내에서 에러 수집 후 assert
const errors: string[] = [];
page.on('pageerror', err => errors.push(err.message));
// ... 동작 수행 ...
expect(errors, '런타임 에러 없어야 함').toHaveLength(0);
```

---

## Playwright E2E Tests (Web)

```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # headed mode (local display required)
npm run test:e2e:report   # open report
```

Config: `playwright.config.ts` / Tests: `tests/e2e/` / Report: `playwright-report/`

- All e2e tests should use API mocking — **no real DB needed**

---

## Troubleshooting

### Only Loading Spinner Captured

**Symptom**: Screenshot shows a loading spinner instead of actual content.

**Fix**: Change `sleep 2` → `sleep 5` or more.

---

### Authenticated Page Redirects to Login

**Symptom**: Opening an authenticated page captures the login page instead.

**Debug:**
```bash
agent-browser eval "JSON.stringify(Object.keys(localStorage))"
agent-browser eval "localStorage.clear(); sessionStorage.clear(); window.location.href = '/login';"
sleep 3 && agent-browser snapshot -i
```

**Fix**: Complete login step before capturing authenticated pages.

---

### CJK Font Rendering Issue

**Symptom**: Korean characters appear as □□□ in screenshots.

**Fix:**
```bash
fc-list :lang=ko | head -5
DEBIAN_FRONTEND=noninteractive sudo apt-get install -y fonts-noto-cjk
fc-cache -fv
fc-list :lang=ko | head -5
```

> Run `fc-cache -fv` before using `agent-browser` in a new server environment.
> If this doesn't help, write seed data in English as the most reliable fallback.

---

### pnpm Monorepo Package Version Conflict

**Symptom**: Package version conflict error when starting the dev server.

**Fix:**
```bash
pnpm install                          # from monorepo root
rm -rf apps/{app-name}/.next/cache    # if Next.js project
npm run dev
```
