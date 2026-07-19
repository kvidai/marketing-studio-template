<!-- Source: epicmobile18/rules/dev-standards/docs/parallel-dev-workflow.md -->
<!-- Version: 1.0.0 -->
<!-- Last Updated: 2026-05-05 -->

# Parallel Development with Git Worktree

여러 AI agent(Claude Code, Codex 등)가 동시에 같은 repo에서 작업할 때의 전략.

## Worktree 생성 여부 판단

Worktree는 항상 필요한 게 아니다. 작업 규모와 충돌 가능성을 먼저 판단한다.

| 상황 | 권장 |
|------|------|
| 작업이 30분 이내 완료 예상 | 그냥 현재 tree에서 작업 |
| 다른 agent와 **겹치는 파일 없음** | 그냥 현재 tree에서 작업 |
| 다른 agent와 **같은 파일 수정** 가능성 있음 | worktree 생성 |
| 작업이 길고 branch 분리가 필요 | worktree 생성 |
| 현재 tree에 dirty state가 크고 conflict 우려 | worktree 생성 |

> **판단 기준**: "이 작업이 다른 agent의 파일을 건드리나?" → YES면 worktree, NO면 그냥 작업.

---

## ⛔ Worktree Exclusivity (CRITICAL)

**Once a worktree is created, ALL file edits must happen INSIDE that worktree — never switch back to the parent directory to edit files.**

| Situation | Rule |
|-----------|------|
| After creating a worktree | Work exclusively inside it until PR merge |
| Parent directory needs a change | Commit it in parent BEFORE creating the worktree, or include it in the worktree branch |
| Tempted to edit parent | STOP — make that change inside the worktree instead |

```
# ❌ PROHIBITED — jumping between parent and worktree
edit ../project-main/src/foo.ts        # parent
edit ../project-agent-1/src/bar.ts     # worktree
edit ../project-main/src/baz.ts        # back to parent — causes code divergence

# ✅ Correct — stay in one place
cd ../project-agent-1
# all edits here until PR merge
```

**Why**: Cross-tree edits cause the two trees to diverge — there is no longer a clear "source of truth."
The AI cannot reliably track which tree holds which version across sessions → leads to duplicated, lost, or entangled code.

---

## Why Worktree, Not Separate Repo

| 방식 | 장점 | 단점 |
|------|------|------|
| **git worktree** | 단일 git history, branch/PR flow 유지, storage 효율 | node_modules 각자 설치 필요 |
| **separate repo clone** | 완전 독립 | history 분리, sync 부담, git remote 꼬임 |

→ **worktree 권장**. separate repo는 monorepo 구조를 망가뜨린다.

---

## Worktree 생성 절차

### 1. 새 worktree 생성

```bash
# 기본 패턴
git worktree add ../{project}-{feature} -b {branch-name}

# 예시
git worktree add ../kvidai-billing-pricing -b feat/billing-pricing
git worktree add ../kvidai-auth-refactor -b feat/auth-refactor
```

### 2. `.env*` 파일 복사 (필수)

`.env*` 파일은 gitignore 대상이므로 새 worktree에 자동 복제되지 않는다.

```bash
# 원본 worktree에서 실행
ORIGINAL_DIR=$(pwd)
NEW_WORKTREE=../{project}-{feature}

# 모든 .env* 파일 복사
find "$ORIGINAL_DIR" -name "*.env*" -not -path "*/node_modules/*" -not -path "*/.git/*" | while read f; do
  rel="${f#$ORIGINAL_DIR/}"
  dest="$NEW_WORKTREE/$rel"
  mkdir -p "$(dirname "$dest")"
  cp "$f" "$dest"
  echo "copied: $rel"
done
```

또는 수동으로 앱별 복사:

```bash
cp apps/web-service/.env.local         ../kvidai-billing-pricing/apps/web-service/.env.local
cp apps/web-service/.env.development   ../kvidai-billing-pricing/apps/web-service/.env.development
cp apps/strapi-ts/.env                 ../kvidai-billing-pricing/apps/strapi-ts/.env
```

### 3. node_modules (symlink 권장)

Monorepo install이 오래 걸리면 symlink로 공유한다 — 패키지 변경 없는 feature 작업에 안전.

```bash
# root node_modules symlink
ln -s $(pwd)/node_modules ../{project}-{feature}/node_modules

# 앱별 node_modules (monorepo)
for app in apps/*/; do
  ln -s $(pwd)/$app/node_modules ../{project}-{feature}/$app/node_modules 2>/dev/null || true
done
```

패키지 추가/변경이 필요한 worktree는 `pnpm install` 별도 실행.

---

---

## Work Scope 분리 전략 (핵심)

**같은 파일을 두 agent가 동시에 수정하면 merge conflict 발생** → scope를 반드시 나눈다.

### ✅ 좋은 분리

```
Agent 1: billing/pricing UI (apps/web-service/src/billing/*)
Agent 2: backend entitlement/router (apps/api/src/entitlement/*)
```

```
Agent 1: feature A 전체 (frontend + backend)
Agent 2: feature B 전체 (frontend + backend)
```

### ❌ 나쁜 분리

```
Agent 1: apps/web-service/src/components/Button.tsx 수정
Agent 2: 같은 Button.tsx 수정
```

### Plan File Separation

Each worktree manages its own plan files independently.
Two worktrees must never edit the same plan file simultaneously.

Plan files are created inside the worktree where the work happens — this is what enables traceability.
Each plan file records its **Working Directory** in the header so any future session can tell where the work was done.

```
../project-agent-1/.claude/plans/20260505_wip_billing-pricing.md
../project-agent-2/.claude/plans/20260505_wip_auth-refactor.md
```

```markdown
# billing-pricing plan header example
> **Working Directory**: /home/ubuntu/code_workspace/project-agent-1
```

---

## 완료 후 정리

### Task Completion → Merge Flow (REQUIRED)

**The agent owns this end-to-end. "Task done" = merged + tests green + parent branch pushed.**

```bash
# 1. Commit all work in the worktree (on feature branch)
cd ../{project}-feat-x
git add <files>
git commit -m "feat: ..."

# 2. Switch to original worktree (parent branch is checked out there) and merge
cd ../{project}                    # original worktree — parent branch (e.g. develop), NOT the main branch
git merge feat/{feature}          # squash for a single clean commit: git merge --squash feat/{feature} && git commit

# 3. Run full monorepo tests on the merged state — must be green
pnpm test
# On failure: fix → retest → do not push until green

# 4. Push parent branch
git push origin {parent-branch}

# 5. Clean up
git worktree remove ../{project}-feat-x
git branch -d feat/{feature}
```

**Pre-push checklist**:
- [ ] Feature branch merged into parent
- [ ] `pnpm test` (full monorepo) green
- [ ] `git push origin {parent-branch}` done

---

### Plan File Sync — Git Only (CRITICAL)

**Plan files must be created inside the worktree where the work happens** — this is what makes the work traceable.
They reach the parent branch via `git merge` — no `cp` or `rsync`.

A plan file can move across directories (parent → worktreeA → worktreeB → parent). Two-level tracking is required:

| Level | Field | Rule |
|-------|-------|------|
| **File level** | `Created In` header | Directory where the file was first created. Never changes. |
| **Entry level** | `Directory` column in Changelog | Current working directory at the time of each write. |

```markdown
# feat-x plan

> **Created In**: /home/ubuntu/code_workspace/project-feat-x

## Changelog

| Date | Version | Changes | Directory | Author |
|------|---------|---------|-----------|--------|
| 2026-05-06 | v1.0.0 | Initial plan | /home/ubuntu/code_workspace/project-feat-x | kincjf |
| 2026-05-06 | v1.1.0 | Research findings | /home/ubuntu/code_workspace/project-feat-x | kincjf |
| 2026-05-07 | v1.2.0 | Implementation done | /home/ubuntu/code_workspace/project-feat-x | kincjf |
```

```bash
# ✅ Correct — plan file reaches parent via git merge (step 2 of completion flow)
mv .claude/plans/20260506_wip_feat-x.md .claude/plans/20260506_done_feat-x.md
git add .claude/plans/
git commit -m "docs: complete feat-x plan"
# → lands in parent on git merge

# ❌ Prohibited — file copy bypassing git
cp ../{project}-feat-x/.claude/plans/20260506_done_feat-x.md ../{project-main}/.claude/plans/
rsync -a ../{project}-feat-x/.claude/plans/ ../{project-main}/.claude/plans/
```

**If a plan file must reach parent before merge** (e.g., handoff to another agent):
`git cherry-pick <plan-commit-hash>` — a git operation, not a file copy.

```bash
git log --oneline .claude/plans/          # find the commit hash in the worktree
cd ../{project-main}
git cherry-pick <hash>
```

### 현재 worktree 상태 확인

```bash
git worktree list
```

---

## 빠른 참조 (Quick Reference)

```bash
# 1. 생성 (per task — reuse 하지 않음)
git worktree add ../project-feat-x -b feat/my-feature
ln -s $(pwd)/node_modules ../project-feat-x/node_modules
cp .env* ../project-feat-x/

# 2. 작업 (worktree 안에서만)
cd ../project-feat-x
# ... 작업 ...
git add <files> && git commit -m "feat: ..."

# 3. 완료 — merge + test + push (original worktree = parent branch dir)
cd ../project                      # parent branch (e.g. develop) — NOT the main branch
git merge feat/my-feature
pnpm test                          # green 확인 필수
git push origin {parent-branch}

# 4. 정리
git worktree remove ../project-feat-x
git branch -d feat/my-feature

# 확인
git worktree list
```

---

## Operational Rules

### 1. Sync Parent Branch Before Starting Every Task

Reused worktrees accumulate drift. Always pull the latest parent branch (the branch the worktree was originally created from) before branching.

```bash
# Before every new task in a reused worktree
git checkout {parent-branch}   # the branch the worktree was created from, or as specified by the user — NOT necessarily main
git pull origin {parent-branch}
git checkout -b feat/new-task
```

Skipping this causes large diffs and conflict explosions at PR time — especially bad with multiple agents pushing to the parent branch frequently.

---

### 2. Keep Branches Short-Lived (< 1 day target)

The longer a branch lives, the more other agents' merges accumulate on the parent branch, and the harder rebase becomes.

| Branch age | Risk |
|------------|------|
| < 4 hours | Minimal conflict risk |
| 4–24 hours | Moderate — rebase before PR |
| > 1 day | High — conflicts likely, rebase required |

**Rules**:
- Break large tasks into smaller PRs that can merge within a day
- If a branch goes stale (> 1 day), rebase on parent branch before continuing:
  ```bash
  git fetch origin
  git rebase origin/{parent-branch}
  ```

---

### 3. Agent Inter-dependency Handling

Agents communicate only through git — no direct coordination.
If Agent B depends on code that Agent A hasn't merged yet, running them in parallel causes broken imports or missing types.

**Rule: dependent tasks run serially, independent tasks run in parallel.**

```
# ✅ Parallel — no shared files
Agent 1: feat/billing-ui      (apps/web-service/src/billing/*)
Agent 2: feat/auth-refactor   (apps/api/src/auth/*)

# ❌ Parallel — B depends on A's output
Agent 1: feat/new-types       (packages/types/src/payment.ts)
Agent 2: feat/use-new-types   (imports from packages/types) ← blocked until A merges
```

**When dependency is unavoidable**:
1. Agent A merges to {parent-branch} first
2. Agent B pulls {parent-branch}, then starts
3. Or: put both in the same worktree as one task

---

### 4. Merge Conflict Ownership

Parallel agents will inevitably produce conflicts. Responsibility is simple:
**the agent that submits its PR later owns the rebase.**

```
Agent 1 PR merged at 14:00  ← merged first, no action needed
Agent 2 PR opened at 14:30  ← must rebase on {parent-branch} before merge
```

```bash
# Agent 2: rebase before PR review or merge
git fetch origin
git rebase origin/{parent-branch}
# resolve conflicts, then force-push branch
git push --force-with-lease
```

**Rules**:
- Never merge a branch that has conflicts — always rebase first
- If rebase has many conflicts, the branch has lived too long → see Branch Lifetime rule above
- `--force-with-lease` only (never `--force`) — prevents overwriting others' pushes

---

### 5. All Worktrees Busy — Scale Up

If all 3 worktrees are LIVE, create additional ones following the same setup.
Extra worktrees (agent-4+) are **temporary** — remove when the task is done.

```bash
# Add a temporary extra worktree
N=4  # or 5, 6...
git worktree add ../project-agent-$N {parent-branch}
ln -s $(pwd)/node_modules ../project-agent-$N/node_modules
for app in apps/*/; do
  ln -s $(pwd)/$app/node_modules ../project-agent-$N/$app/node_modules 2>/dev/null || true
done
cp .env* ../project-agent-$N/
echo "PORT=300$N" >> ../project-agent-$N/.env.local

# Remove when done (unlike pool worktrees 1-3 which are permanent)
git worktree remove ../project-agent-$N
git worktree prune
```

---

### 6. Worktree Recovery (Bad State)

When a pool worktree gets into a bad state, recover by case — no need to recreate from scratch.

**Case 1: node_modules symlink broken**
```bash
rm -rf ../project-agent-N/node_modules
ln -s $(pwd)/node_modules ../project-agent-N/node_modules
for app in apps/*/; do
  rm -rf ../project-agent-N/$app/node_modules
  ln -s $(pwd)/$app/node_modules ../project-agent-N/$app/node_modules 2>/dev/null || true
done
```

**Case 2: Git state corrupted** (detached HEAD, stuck merge/rebase conflict)
```bash
cd ../project-agent-N
git rebase --abort 2>/dev/null; git merge --abort 2>/dev/null
git reset --hard HEAD
git checkout {parent-branch}
git pull origin {parent-branch}
rm -f .agent.lock
```

**Case 3: .env missing or outdated**
```bash
find /original/project -name "*.env*" -not -name ".env.local" \
  -not -path "*/node_modules/*" | while read f; do
  rel="${f#/original/project/}"
  cp "$f" "../project-agent-N/$rel"
done
# Re-apply port override
echo "PORT=300N" >> ../project-agent-N/.env.local
```

**Case 4: Completely broken — full reset**
```bash
# Fast reset — node_modules is symlinked so no install needed
git worktree remove ../project-agent-N --force
git worktree add ../project-agent-N {parent-branch}
ln -s $(pwd)/node_modules ../project-agent-N/node_modules
for app in apps/*/; do
  ln -s $(pwd)/$app/node_modules ../project-agent-N/$app/node_modules 2>/dev/null || true
done
cp .env* ../project-agent-N/
echo "PORT=300N" >> ../project-agent-N/.env.local
```

---

### 7. Push to Remote After Every Logical Commit

Never let work exist only on disk. Push the feature branch after every meaningful commit so:
- Other agents can see progress without waiting for PR
- Work is recoverable if the process crashes or the worktree is reset

```bash
# First push — set upstream
git push -u origin feat/{name}

# Subsequent pushes — just push
git push
```

**Rules**:
- Push at least once per logical unit of work (not just at the end)
- Never accumulate > 5 unpushed commits — push incrementally
- Never push directly to `{parent-branch}` — feature branch only
- `--force` is banned. `--force-with-lease` only when rebasing a previously pushed branch

---

### 8. Rebase to Integrate — Never Merge

When pulling in updates from the parent branch, always use **rebase**, never `git merge`.

```bash
# ✅ Correct — keeps history linear
git fetch origin
git rebase origin/{parent-branch}

# ❌ Wrong — creates a merge commit, pollutes history
git merge origin/{parent-branch}
```

| Situation | Command |
|-----------|---------|
| Integrate parent updates mid-task | `git rebase origin/{parent-branch}` |
| Branch went stale (> 1 day) | `git fetch && git rebase origin/{parent-branch}` |
| Final merge into parent via PR | squash merge (`gh pr merge --squash`) — one clean commit per feature |

**Why squash on final merge**: parallel agents produce many small commits. Squashing keeps the parent branch history readable — one entry per feature, not 20 "wip" commits.

---

### 9. Conflict Escalation — Know When to Stop

Not all conflicts are safe to auto-resolve. Getting this wrong corrupts the parent branch.

| Conflict type | Action |
|---------------|--------|
| Import order, whitespace, lock file (`pnpm-lock.yaml`) | Auto-resolve — safe |
| Same function edited differently by two agents | Stop — escalate to human |
| File deleted by one agent, modified by another | Stop — escalate to human |
| Shared type/interface changed incompatibly | Stop — escalate to human |
| > 5 files in conflict | Stop — escalate to human |

**Escalation procedure**:
```bash
git rebase --abort          # cancel the rebase, return to clean state
# Report to human:
# "Rebase on {parent-branch} has conflicts in: [file list]
#  Reason: [what changed on both sides]
#  Need guidance before continuing."
```

Do NOT attempt to auto-resolve logic conflicts by guessing intent. A wrong resolution is worse than stopping.

---

## Common Pitfalls

### 0. .env Out of Sync

`.env*` files are copied once at worktree setup and never auto-updated.
If a worktree is missing env values or has outdated ones, copy from the original tree — **one-way only: original → worktree**.

```bash
# Copy specific file from original to worktree
cp /original/project/.env.development ../project-agent-1/.env.development

# Or re-copy all .env files (preserves PORT overrides in .env.local)
find /original/project -name "*.env*" \
  -not -name ".env.local" \
  -not -path "*/node_modules/*" | while read f; do
  rel="${f#/original/project/}"
  cp "$f" "../project-agent-1/$rel"
done
```

> Never copy `.env*` from a worktree back to the original — worktrees may have worktree-specific overrides (e.g. PORT).

---

### 1. Port Conflicts

Multiple worktrees running dev servers simultaneously will clash on the same port.
Assign fixed ports per worktree in `.env.local` during initial setup.

```bash
# agent-1/.env.local
PORT=3001

# agent-2/.env.local
PORT=3002

# agent-3/.env.local
PORT=3003
```

Add during pool setup:
```bash
for i in 1 2 3; do
  echo "PORT=300$i" >> ../project-agent-$i/.env.local
done
```

---

### 2. Package Install in Symlinked Worktree

**Problem**: `node_modules` is symlinked to the original tree. Running `pnpm install new-pkg` inside a worktree modifies the **original** node_modules — all other worktrees are immediately affected.

**Rule**: Always install packages in the **original tree only**. All symlinked worktrees benefit automatically.

```bash
# ✅ Install in original tree
cd /original/project
pnpm add new-package

# ❌ Never install inside a worktree with symlinked node_modules
cd ../project-agent-1
pnpm add new-package   # modifies shared node_modules silently
```

**Error resolution**:

| Situation | Fix |
|-----------|-----|
| Accidentally installed in worktree (symlink intact) | Already applied to original — run `pnpm install` in original to sync lockfile |
| Symlink broken / corrupted after install | `rm ../project-agent-N/node_modules && ln -s $(pwd)/node_modules ../project-agent-N/node_modules` |
| Worktree needs a **different version** than others | Break symlink for that worktree only: `rm node_modules && pnpm install` inside it |

#### Codegen / Postinstall Commands (Prisma, GraphQL, etc.)

Commands that **write files into `node_modules`** must also run in the original tree only.
Running them inside a symlinked worktree modifies the shared `node_modules` — all worktrees are affected immediately.

```bash
# ✅ Run in original tree
cd /original/project
pnpm --filter @scope/api prisma generate
pnpm --filter @scope/api generate  # GraphQL codegen, etc.

# ❌ Never run inside a symlinked worktree
cd ../project-agent-1
npx prisma generate   # writes to shared node_modules/.prisma — affects all worktrees
```

**Prisma + monorepo specifics**:

| Situation | Fix |
|-----------|-----|
| Schema changed in a worktree branch | Run `prisma generate` in original tree after merging to {parent-branch} |
| Worktree gets stale Prisma client | Already fixed by running generate in original — symlink picks it up automatically |
| Two worktrees have conflicting schemas | Scope conflict — these tasks must run serially, not in parallel (see Agent Inter-dependency) |

---

### 3. Shared Git Stash

**Problem**: All worktrees share the same `.git` directory, so `git stash` entries are shared across all worktrees. `git stash list` shows stashes from every worktree mixed together — applying the wrong one corrupts your working state.

**Rule**: Always prefix stash messages with the worktree name.

```bash
# ✅ Named stash — always use -m
git stash push -m "agent-1/feat-billing: WIP auth check"

# ❌ Anonymous stash — impossible to tell which worktree it belongs to
git stash
```

**Before applying, always inspect**:
```bash
git stash list                        # see all stashes with names
git stash show -p stash@{N}          # inspect contents before applying
git stash apply stash@{N}            # apply specific stash by index
```

**Error resolution**:

| Situation | Fix |
|-----------|-----|
| Applied wrong stash | `git checkout -- .` to discard, re-apply correct stash |
| Applied wrong stash with conflicts | `git reset HEAD && git checkout -- .`, then apply correct one |
| Avoid stash confusion entirely | Use a temp commit instead: `git commit -m "wip: temp"` → later `git reset HEAD~1` |
