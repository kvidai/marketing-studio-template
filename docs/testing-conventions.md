<!-- Source: epicmobile18/rules/contextual/docs/testing-conventions.md -->
<!-- Version: 1.4.0 -->
<!-- Last Updated: 2026-03-09 -->

# Testing Conventions

## Test Strategy

### Test Priority by Type

| Priority | Type | Description | Required |
|----------|------|-------------|----------|
| 1 | Unit Test | Tests for **small code units** — individual functions/classes | Required |
| 2 | Integration Test | Tests combining multiple modules/components (API, service integration) | Required |
| 3 | Browser Test (E2E) | Tests for real user flows → see `ui-testing.md` | Core plan features only |

> **Follow execution order**: Unit → Integration → Browser (E2E).
> Do not proceed to a lower-level test while a higher-level test is failing.

## Mock Tests — SDK vs REST API

Before writing mock test code, first check whether an **official SDK** for the target service exists in your project's language.

### SDK Usage Criteria

| Condition | Decision |
|-----------|----------|
| SDK exists + updated within the last 6 months | ✅ Prefer SDK |
| SDK exists + last update more than 6 months ago | ❌ Use REST API |
| No SDK | ❌ Use REST API |

**Why prefer SDK**: Using the type/model definitions bundled in the SDK ensures mock object structure matches actual responses, improving test accuracy.

### How to Find SDKs

Check the official package registry and GitHub for each language:

| Language | Where to Search | Example Command |
|----------|----------------|-----------------|
| TypeScript / Node.js | npmjs.com | `npm info {package} time.modified` |
| Python | pypi.org | `pip index versions {package}` |
| Go | pkg.go.dev | `go list -m -json {module}@latest` |
| Other | GitHub / official docs | Search `{service-name} sdk {language}` |

> If update date is hard to confirm, use the last commit date on the GitHub repo.

### ✅ SDK Usage Examples

```typescript
// TypeScript - using built-in SDK types
import Dodopayments from 'dodopayments';
import type { Payment } from 'dodopayments/resources';

const mockPayment: Payment = { ... }; // type-safe mock
```

```python
# Python - using SDK model classes
from dodopayments import Dodopayments
from dodopayments.types import Payment

mock_payment = Payment(id="pay_123", status="succeeded", ...)
```

```go
// Go - using SDK structs
import "github.com/dodopayments/dodopayments-go"

mockPayment := dodopayments.Payment{ID: "pay_123", Status: "succeeded"}
```

### ❌ Direct REST API Usage (when SDK is missing or outdated)

```typescript
// No type safety — structure errors possible
const mockResponse = { id: 'pay_123', status: 'succeeded' };
```

## Self-Improvement Loop

Automatically iterate fixes when errors occur after running tests:

```
1. Write test code
2. Run tests
3. Error? → Analyze cause → Fix code → Back to 2
4. Success? → Move to next step
```

- Prevent infinite loops: report to user after 3 repetitions of the same error
- Watch for regressions in existing functionality when making fixes

## Meaningful Coverage Strategy

### Coverage Type Priority

| Type | Meaning | Target |
|------|---------|--------|
| **Line** | Lines executed | Baseline only — insufficient alone |
| **Branch** | Both sides of if/else covered | Required (70%+) |
| **Mutation** | Code variants caught by tests | Primary quality metric (80%+) |
| **Path** | All condition combinations | Impractical — use property tests instead |

**Goal: Branch + Mutation coverage, not just line coverage.**

### Test Case Discovery Methods

#### Boundary Value Analysis
Test the edges of valid input ranges. Always include: `min`, `min−1`, `max`, `max+1`, `0`, `-1`, `NaN`, `Infinity`, `null`, `undefined`, `""`.

#### Equivalence Partitioning
Group inputs that produce identical behavior → test one representative per group. Skip redundant cases within the same group.

#### Decision Table Testing
List all condition combinations as a table → each row becomes one test case. Essential when multiple conditions interact.

```typescript
// | userPlan   | isRunning | hasCapacity | result            |
// | free       | false     | true        | start             |
// | free       | true      | true        | reject (duplicate)|
// | pro        | false     | false       | queue             |
// | enterprise | false     | false       | priority queue    |
```

#### State Transition Testing
Map all valid transitions → test each path including invalid ones.

```
idle → running → completed
     → running → paused → running
     → running → error → idle (retry)
     → running → error → error (max retry exceeded)
// Also test: completed → running (must throw)
```

### Expanded Tool Map

| Purpose | TS/JS | Python | Go | Rust |
|---------|-------|--------|----|------|
| Mutation | Stryker | mutmut, Cosmic Ray | gremlins | cargo-mutants |
| Property/fuzz | fast-check, @jazzer.js | Hypothesis, atheris | rapid, `go test -fuzz` | proptest |
| Race condition | — | — | `go test -race` | loom |
| API contract | Schemathesis, Pact | Schemathesis | Pact | — |
| Snapshot/regression | vitest snapshots | syrupy | cupaloy | — |

> Core tool selection (Stryker / fast-check / Hypothesis / `go test -race` / Schemathesis) is in `workflow-rules.md`.

### AI Prompt Patterns for Test Case Discovery

AI generates cases; algorithmic tools validate them. Use these prompts in sequence:

**Pattern 1 — Branch analysis (start here)**
```
Analyze this function and list:
1. All branch conditions
2. Boundary values for each condition
3. Invalid inputs (null, undefined, empty, negative, NaN)
4. Concurrency/ordering edge cases
Return case list only — no test code yet:
[paste code]
```

**Pattern 2 — Mutation perspective**
```
Generate 20 mutations for this code:
- Comparison operators (>, >=, <, <=, ===, !==)
- Logic operators (&& → ||)
- Off-by-one (±1 on boundaries)
- Condition inversion (add/remove !)
For each mutation, what test input would catch it?
```

**Pattern 3 — Fix survived mutants (use after Stryker run)**
```
Stryker survived mutants from my last run:

[file: runner.ts, line 42]
Original: if (retryCount >= maxRetry)
Mutated:  if (retryCount > maxRetry)  ← survived

Write the minimum vitest test case(s) to kill each mutant.
```

**Pattern 4 — Assess existing tests**
```
Review these tests and identify:
1. Bugs they would NOT catch
2. Mutants likely to survive (Stryker perspective)
3. Missing test cases (High / Medium / Low priority)

[paste existing test code]
[paste implementation code]
```

### Practical Workflow (AI + Algorithmic Tools)

```
① Write code
② Ask AI for case list (Pattern 1)
③ Add fast-check / Hypothesis property tests (crash + invariant checks)
④ Write unit tests from case list
⑤ Run Stryker → check survived mutants
⑥ Feed survived mutants to AI (Pattern 3) → add missing tests
⑦ Repeat ⑤–⑥ until mutation score ≥ 80%
```

**Key principle**: AI generates candidates; Stryker gives the final verdict — it's math, not opinion.

---

## Browser Test

### When to Run

- Test only **core features related to the current plan** instead of the full 60-minute test suite
- See agent-browser setup in CLAUDE.md and `ui-testing.md`

### UI Screenshots — `scripts/screenshot-ui.sh`

Automated screenshot script. When implementing a new feature, add that page to the script then run it.

**Prerequisites:**
```bash
# 1. Start test DB
docker-compose -f docker-compose.test.yml up -d

# 2. Set environment variables (.env.local)
DATABASE_URL={test_db_url}
```

**Run:**
```bash
bash scripts/screenshot-ui.sh
```

**Output:** `docs/ui-screenshots/*.png` — commit to view instantly on GitHub

**Adding a new page + capturing it (instruction to AI):**
```
Add a screenshot of the /{new-feature-path} page
to the {section-name} section in scripts/screenshot-ui.sh,
then run the script and save the image to docs/ui-screenshots/.
Filename: {feature-name}.png
```

> **Rule**: After modifying the script, always run it → save `docs/ui-screenshots/*.png` → complete `git commit`

### Time Optimization

- Narrow test scope to core features
- Minimize unnecessary navigation and wait times

## QA Documentation

### Scope

| Scope | File Location | Content |
|-------|--------------|---------|
| Monorepo QA | `docs/qa/` (root) | Overall integration test results |
| Subrepo QA | each `apps/*/docs/qa/` | Individual service test results |

### Required Items

- Test date
- Test environment (staging/production)
- Pass/Fail per test item
- Cause and action taken for failures

## Test Seed Data Scripts

Rules for managing seed scripts for local DB manual testing.

### Location and Naming

```
scripts/
├── seed-test-users.ts          # common test users
├── seed-{feature-name}-data.ts # feature-specific test data
```

### Creating + Running a New Seed Script (instruction to AI)

```
Create scripts/seed-{feature-name}-data.ts
and run it against the local test DB to actually generate the seed data.

Data to create:
- {model1}: {description}
- {model2}: {description}

DB URL: {DATABASE_URL}
```

> **Rule**: After creating the script, always run it → generate data in DB → verify API behavior using the test commands printed at the end of the script

### Direct Execution

```bash
DATABASE_URL={db_url} {runtime} scripts/seed-{feature-name}-data.ts
# e.g.: DATABASE_URL=postgresql://... tsx scripts/seed-feature-data.ts
```

### Seed Script Writing Principles

- Use upsert → ensures idempotency (safe to run multiple times)
- Use fixed IDs (`id: "seed-{feature}-{entity}"`) → reusable across re-runs
- Print test commands at the end of the script → enables immediate API testing
- Always close DB connection in a `finally` block

---

## Test Environment

### Stopping Processes

> After testing, always stop all server instances.
> Leaving them running risks zombie processes modifying DB data.

### Node.js Version

- Manage Node version per submodule via `.nvmrc`
- Also specify in `package.json` `engines` field
- On version mismatch, switch with `nvm use` before testing
