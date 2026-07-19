<!-- Source: epicmobile18/rules/core/workflow-rules.md -->
<!-- Version: 1.7.0 -->
<!-- Last Updated: 2026-05-05 -->

# Workflow Rules

## ⛔ Monorepo Backend Logic Placement (CRITICAL)

**If a dedicated API/backend app exists in the monorepo, all backend logic goes there. Never in Next.js.**

### Why

Next.js can technically run server-side logic (API routes, Server Actions, Route Handlers), so AI defaults to putting backend code there. But if a dedicated backend app (e.g., `apps/api`) exists, that is the single source of backend truth. Mixing backend logic into Next.js causes:
- Duplication and drift between two "backends"
- Business logic that becomes untestable / undeployable independently
- Refactoring cost every time the frontend framework changes

### Rule

| Monorepo has | Backend logic goes to | Next.js handles |
|---|---|---|
| `apps/api` (Express/Fastify/NestJS/etc.) | `apps/api/src/` | UI rendering + API calls only |
| `apps/api` + `apps/web` (Next.js) | `apps/api/src/` | `apps/web` → calls `apps/api` via HTTP |
| Next.js only (no dedicated backend) | Next.js API routes / Server Actions | ✅ acceptable |

### ✅ Correct

```
apps/api/src/modules/payment/payment.service.ts   ← business logic here
apps/web/src/app/checkout/page.tsx                ← calls apps/api via fetch()
```

### ❌ Prohibited

```
apps/web/src/app/api/payment/route.ts   ← duplicating business logic that belongs in apps/api
apps/web/src/lib/payment.ts             ← backend service logic inside Next.js project
```

### Check Before Writing Backend Code

```bash
# Confirm dedicated backend app exists
ls apps/   # look for: api, server, backend, strapi, etc.
```

If `apps/api` (or equivalent) exists → implement there, not in Next.js.

---

## ⛔ DB Usage Rules (CRITICAL)

**Always use dev-local DB for development and testing. Never use staging DB as default.**

### Why

Staging DB is shared across the entire team.
AI agent access to staging DB blocks other developers' work.
Schema changes, data corruption, and migration failures affect the whole team.

### Rules

| Environment | DB | AI agent |
|-------------|-----|----------|
| **dev-local** | Local DB | ✅ Default. All dev/test/schema changes here |
| **staging** | Remote DB (shared) | ❌ Prohibited. QA only after PR merge |
| **production** | Remote DB (live) | ❌ Strictly prohibited |

> **staging exception**: backfill or staging-specific E2E tasks only.
> All other dev/debug/AI agent work → dev-local.

---

## Branch Workflow

### Branch Naming

| Branch | Purpose | Push |
|--------|---------|------|
| `main` / `develop` | Protected branches | Direct push prohibited |
| `develop-{username}` | Personal development branch | Push then create PR |
| `feature/*`, `fix/*` | Feature/fix branches | Push then create PR |

```bash
# ✅ Correct flow
git checkout -b develop-kincjf
# ... work ...
git push origin develop-kincjf
gh pr create --base develop

# ❌ Prohibited
git push origin develop  # direct push prohibited
```

### Monorepo Submodule Rules

- All submodules follow the same branch-commit-push order
- Create individual branches per submodule, then PR

## Work Completion Checklist

**Always** follow this order when finishing work:

### 1. Tests

#### 환경 변수 (CRITICAL)

**테스트 실행 시 반드시 `development.env` (dev-local) 를 먼저 로드해야 한다.**
- 별도 env가 지정되지 않은 경우 → `development.env` 사용
- `pnpm test` 스크립트는 `dotenv -e development.env -e .env -- vitest run` 형태로 작성

```bash
# ✅ development.env 자동 로드 (권장)
pnpm test                    # = dotenv -e development.env -e .env -- vitest run
pnpm test:coverage

# ✅ 직접 env 지정 시
dotenv -e staging.env -e .env -- vitest run

# ❌ env 없이 vitest run만 실행 금지 (환경변수 누락으로 테스트 불안정)
# vitest run
```

```bash
# Run unit tests
# Run integration tests
# Run browser tests if needed
```

- On error: analyze root cause, fix, retest (self-improvement)
- On success: proceed to next step

#### Test Coverage (필수 확인)

TDD 작업 완료 후 coverage 측정 필수. **80% 미달 시 추가 테스트 작성 후 진행.**

```bash
pnpm test:coverage   # vitest coverage 실행
```

| Metric | 최소 기준 |
|--------|----------|
| Statements | **80%** |
| Lines | **80%** |
| Functions | **80%** |
| Branches | **70%** |

**vitest 설정** (`vitest.config.ts`):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',           // npm: @vitest/coverage-v8
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      reporter: ['text', 'text-summary'],
    },
  },
});
```

**package.json**:
```json
"test:coverage": "vitest run --coverage"
```

> unit + integration + e2e 3계층 구성 시 coverage 80% 이상이어야 결과를 신뢰할 수 있음.
> CI/CD에서 threshold 미달 시 빌드 실패 처리 권장.

#### Coverage 측정 방식: fast vs instrumented

대부분의 언어에서 coverage 측정 방식은 2가지로 나뉜다:

| 방식 | 특징 | Branch 정확도 |
|------|------|--------------|
| **Fast/Native** | 런타임 내장 (빠름, 오버헤드 없음) | 관대함 — 일부 분기 누락 가능 |
| **Instrumented** | 소스코드에 계측 코드 삽입 (느림) | 엄격함 — `&&`, `??`, ternary 등 세밀하게 검출 |

두 방식은 **branch coverage에서 10~15%p 차이**가 나는 것이 정상.

##### Coverage Provider example (vitest: v8 vs istanbul)
| | v8 | istanbul |
|---|---|---|
| 방식 | V8 native (빠름) | 소스 인스트루먼테이션 (느림) |
| Branch 정확도 | 관대함 — 일부 분기 누락 | 엄격함 — `&&`, `??`, ternary 전부 검출 |
| 실측 차이 | branch ~78% | ~63% (동일 코드베이스, 약 15%p 차이) |

기본값 `v8`. branch 커버리지 의심 시 `istanbul`로 교차 확인:

**권장**: 2가지 방식의 tool을 함께 설정해두고, 기본은 fast로 돌리되 branch 커버리지 정확도가 필요할 때 instrumented로 교차 확인.

**예시 (JS/TS — vitest)**:
```bash
# fast (V8 native)
vitest run --coverage --coverage.provider=v8

# instrumented (소스 인스트루먼테이션)
vitest run --coverage --coverage.provider=istanbul
```

> 언어별 대응: Python → `coverage.py`(fast) vs `pytest-cov --branch`(instrumented), Go → `go test -cover`(fast) vs `gocover-cobertura`(instrumented)

#### Testing Philosophy: Validating AI-Generated Tests

**Core Constraint**: AI cannot objectively assess its own test quality — use algorithmic tools to find what AI misses.

| Purpose | TS/JS | Python | Go |
|---------|-------|--------|----|
| Mutation (logic holes) | Stryker | mutmut | gremlins |
| Property/fuzz (unexpected input) | fast-check | Hypothesis | `go test -fuzz` |
| Race conditions | — | — | `go test -race` |
| API contracts | Schemathesis, Pact | ← same | ← same |

**Pass Criteria**:
- Stryker mutation score **>= 80%** before PR merge
- Property tests must cover: `null`, `undefined`, empty, boundary values
- Any survived mutant = test gap → must fix before merge

**What AI Must Not Do**:
- Self-assess completeness ("these tests look comprehensive")
- Skip Stryker citing time constraints
- Merge without algorithmic validation

### 2. QA Documentation

- Write QA docs for both monorepo and subrepo separately
- Record test results

### 3. Update Plan File

```bash
# Update plan file status, implementation status, remaining tasks
# Change status to done when complete
```

### 4. Clean Up Processes (REQUIRED)

> **Zombie process warning**: Failing to stop used instances can leave zombie processes
> that continuously modify DB schema/data. Hard for humans to notice and difficult to resolve.

```bash
# Stop all instances used
# e.g., web-service dev server, strapi, database, etc.
# Check port usage
lsof -i :3000  # or the relevant port
```

### 5. Commit & Push

```bash
git add <files>
git commit -m "feat: description"
git push origin develop-{username}
# Create PR
gh pr create --base develop
```

## Task-Type Checklists

### Adding a New Feature

1. Create plan file (`.claude/plans/`)
2. Create relevant components/modules
3. Add i18n translations (if project supports it)
4. Add type definitions
5. Run lint/typecheck
6. Write and run tests

### Modifying Existing Features

1. Identify scope of impact
2. Update translation files (if needed)
3. Verify type safety
4. Run lint/typecheck

### Documentation Only

1. Follow file path naming rules (see `file-path-rules.md`)
2. For new docs: update CLAUDE.md of that directory, add filename only to README.md
3. Check consistency across related docs (README ↔ CLAUDE.md)
4. Verify example code actually works

### Working in Monorepo Submodule

1. Read that submodule's `CLAUDE.md` first
2. Work and commit from within the submodule directory
3. Update submodule reference from root (separate commit)

### Fixing Bugs

1. Write a reproducing test first → confirm it fails
2. Fix the bug → confirm the test passes

### Refactoring

1. Confirm all existing tests pass → refactor → re-run
2. Add new tests as needed

## ⛔ Code Editing Rules (CRITICAL)

### Developer Comments in Code Files — Never Delete

**AI must never delete developer-written comments when editing or merging source code files.**

Scope: **source code files only** (`.ts`, `.js`, `.py`, `.go`, `.java`, etc.)
Documentation files (`.md`, `.txt`, etc.) are excluded — their content may be modified freely.

Developer comments capture intent, constraints, and context that are not visible in the code itself.
Deleting them loses information that cannot be recovered from the code alone.

#### Rules

| Action | Rule |
|--------|------|
| Editing a function | Keep all existing comments above, inside, and below |
| Refactoring | Preserve comments even if code structure changes |
| Merging / applying changes | Restore any comments that were dropped during merge |
| "Cleaning up" | Never treat code comments as clutter to remove |
| Adding new code | Do not remove nearby comments to make room |

#### ✅ Correct

```ts
// Stripe requires amount in cents, not dollars
const amount = dollars * 100;
```

→ After editing: comment stays exactly as-is.

#### ❌ Prohibited

```ts
// Before (developer wrote this)
// Stripe requires amount in cents, not dollars
const amount = dollars * 100;

// After AI edit — comment silently removed ← NEVER DO THIS
const amount = dollars * 100;
```

> **Exception**: Only remove a comment if the code it describes has been completely deleted and the comment no longer refers to anything.

---

## External Code Policy

- Do **not** modify external/reference project code
- If integration is needed, write adapters/wrappers in your own project code

## Node.js Version Management

- If submodules use different Node.js versions: specify in `.nvmrc` + `package.json` `engines`

## Worktree Cleanup

Clean up completed worktrees immediately:

```bash
git worktree list          # check current state
git worktree remove <path> # remove completed worktree
git worktree prune         # clean up leftovers
```

---

## Parallel Development (Multiple AI Agents)

Basic rules when multiple AI agents work on the same repo simultaneously.

**When to create a worktree**:

| Situation | Action |
|-----------|--------|
| Short task or no file overlap with other agents | Work in current tree |
| Possible overlap with other agent's files | Create worktree |
| Current tree has large dirty state / conflict risk | Create worktree |

**⛔ Worktree exclusivity (CRITICAL)**:
Once a worktree is created, ALL edits must happen INSIDE that worktree — never switch back to the parent directory to edit files.

| Situation | Rule |
|-----------|------|
| Worktree created | Work exclusively inside that worktree until PR merge |
| Parent needs a change | Commit it in parent BEFORE creating the worktree, or include it in the worktree branch |
| Tempted to edit parent | STOP — make the change inside the worktree instead |

```
# ❌ PROHIBITED — jumping between parent and worktree
edit file in ../project-main       # parent
edit file in ../project-agent-1    # worktree
edit file in ../project-main       # back to parent — causes divergence and code chaos

# ✅ Correct — stay in one place
cd ../project-agent-1
# all edits here until PR merge
```

**Why**: Cross-tree edits cause conflicting state that is hard to detect and nearly impossible to untangle. The AI cannot track which tree is "current truth."

**Worktree setup (per task — do not reuse)**:
1. `git worktree add ../{project}-feat-x -b feat/{feature}`
2. Copy `.env*` files manually (gitignored — not auto-copied)
3. Symlink `node_modules` (monorepo installs are slow):
   `ln -s $(pwd)/node_modules ../{project}-feat-x/node_modules`
4. Use separate plan files — never let two worktrees edit the same plan simultaneously

**Completion flow (REQUIRED — agent owns this end-to-end)**:

```bash
# 1. Commit all work in the worktree (feature branch)
cd ../{project}-feat-x
git add <files>
git commit -m "feat: ..."

# 2. Switch to original worktree (parent branch is checked out there) and merge
cd ../{project}                    # original worktree — not the main branch, the parent branch dir
git merge feat/{feature}          # or --squash for a single clean commit

# 3. Run full monorepo tests on the merged state
pnpm test                          # must be green before pushing

# 4. Push parent branch
git push origin {parent-branch}

# 5. Clean up worktree and feature branch
git worktree remove ../{project}-feat-x
git branch -d feat/{feature}
```

> "Task done" = merged + tests green + parent branch pushed. Never mark done before all three.

**Plan file sync (git only)**:
Plan files in the worktree reach the parent via `git merge` — no `cp` or `rsync`.
If a plan file must reach parent before merge (agent handoff): `git cherry-pick <plan-commit-hash>`.

**Conflict escalation — STOP and report to human when**:
- Same function edited differently by two agents
- File deleted by one agent, modified by another
- Shared type/interface changed incompatibly
- > 5 files in conflict
- Safe to auto-resolve: import order, whitespace, `pnpm-lock.yaml`

> Full guide: `docs/parallel-dev-workflow.md`

---

## ⛔ Committing to Other Project Directories (CRITICAL)

**Never commit to a project outside the current working directory without explicit instruction.**

### Rule

- Only commit within the repo/directory the user is currently working in
- To sync rules to another project: run the sync script, then **stop** — do NOT `git add` or `git commit` in that project
- Committing to another project requires an **explicit command** from the user: "commit", "push", "반영해줘"

### Why

Other project directories may have in-progress work (unstaged changes, WIP files) that must not be bundled into unrelated commits. Broad `git add <dir>` commands silently pick up those changes.

### ✅ Correct

```bash
# Sync only — stop here, report what changed
./templates/sync-rules.sh --root /path/to/other-project
git -C /path/to/other-project diff --stat .claude/rules/ docs/
# → "These files changed. Commit?" — wait for user confirmation
```

### ❌ Prohibited

```bash
# Never do this without explicit instruction
cd /path/to/other-project
git add docs/          # may include unrelated WIP changes
git commit -m "..."    # committing to another project without permission
```
