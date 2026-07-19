<!-- Source: epicmobile18/rules/core/plan-conventions.md -->
<!-- Version: 1.3.0 -->
<!-- Last Updated: 2026-05-06 -->

# Plans Directory

## Naming Convention

```
YYYYMMDD_{status}_{description}.md
```

| Status | Meaning |
|--------|---------|
| `todo` | Not yet started |
| `wip` | In progress |
| `done` | Completed |

```
20260130_done_video-edit-skill-setup.md
20260131_wip_add-cli-tests.md
20260201_todo_pypi-publish.md
```

## File Search

**At session start: check for wip plans first. If found, read and resume before starting new work.**

```bash
ls .claude/plans/*_wip_*.md          # in progress — check this first
ls .claude/plans/*_done_*.md         # completed
ls .claude/plans/*_todo_*.md         # to-do
ls -t .claude/plans/*.md | head -5   # latest
```

## File Template

```markdown
# {Title}

> **Last Updated**: YYYY-MM-DD
> **Version**: vX.X.X
> **Status**: {status}
> **Created In**: {absolute path — never changes}

---

## Command Clarity Check

<!-- Run check per ⛔ Command Clarity Check Before Plan Run section -->
**Runnable**: ✅/❌

---

## Changelog

| Date | Version | Changes | Directory | Author |
|------|---------|---------|-----------|--------|
| YYYY-MM-DD | vX.X.X | Description | /abs/path | Name |

---

## Implementation & Test Status

| File | Feature | Impl | Unit Test | Integration Test |
|------|---------|------|-----------|------------------|
| `apps/api/src/**/abc.ts` | `fn_name` | ✅/❌ | ✅/❌ | ✅/❌/⏭️ |

---

## Remaining Tasks

- [ ] Task 1

---

## Research Log

### Search Keywords
- "exact term used"

### Reference URLs
- https://example.com  <!-- record every URL read, even if invalid -->

### Key Findings
- Facts that influenced a decision (not URL summaries)

---

## Decision Log

### {Title} — YYYY-MM-DD

| # | Option | Pros | Cons | Fit when |
|---|--------|------|------|----------|
| 1 | Option A [recommended] | ... | ... | ... |
| 2 | Option B | ... | ... | ... |

**Decision**: {choice} — **Why**: {reason}

---

## Decision Conversation Summary

- Initial: {A} → Changed to: {B} — Trigger: {key reason for change}
```

## Status Icons

| Icon | Meaning |
|------|---------|
| ✅ | Done / Pass |
| ❌ | Not done / Fail / N/A |
| ⏭️ | Skip (condition not met) |
| 🚧 | In progress |

---

## ⛔ Command Clarity Check Before Plan Run (CRITICAL)

**Before running a plan, verify the command is clear enough on two dimensions. Keep asking until both pass.**

### Structural Check

| Item | What to confirm |
|------|----------------|
| Scope | What is being built or changed? |
| Done criteria | When is it "done"? |
| Constraints | What must not be touched? What must be preserved? |
| Error handling | How are errors/edge cases handled? |

### Intention Mirror

When the command is ambiguous, state your interpretation and confirm before acting.

```
"I read this as internal cleanup inside auth — does it include API interface changes too?"
```

- Confirm the **direction**, not a file list — files are AI's job to find
- Skip if Done criteria is already unambiguous

### Multiple-Choice Questions

Present options inline in chat as usual. Also write the full pros/cons table to the plan file's Decision Log, then tell the user: `"Detailed comparison written to plan file — check it before deciding."`

```markdown
## Decision Log

### DB 선택 — YYYY-MM-DD

| # | Option | Pros | Cons | Fit when |
|---|--------|------|------|----------|
| 1 | PostgreSQL [recommended] | ACID, mature | heavier setup | team has DB ops experience |
| 2 | SQLite | zero-config, fast | no concurrency | single-user / local only |
| 3 | PlanetScale | serverless, auto-scale | vendor lock-in, cost | serverless env, no DB ops |

**Decision**: — **Why**:
```

### Answer Validation

If the user picks an option with no explanation on a hard-to-reverse decision, probe once:

```
"You picked [X] — is it because [specific reason]? Just confirming this fits your situation."
```

- Applies when: user answers with just "1", "A", "yes", or mirrors the recommendation verbatim
- Skip for trivial choices; apply on decisions that are hard to reverse or affect large scope

### Run Condition

Proceed when Structural Check is fully ✅ and ambiguous commands are resolved via Intention Mirror.

If blocked → re-ask only the unresolved items, repeat until conditions pass.

### ❌ Blocked Example

```markdown
## Command Clarity Check

| Item | Status |
|------|--------|
| Scope | ✅ |
| Done criteria | ❌ |
| Constraints | ✅ |
| Error handling | ❌ |

**Runnable**: ❌
→ Pending:
1. Done criteria: What is the success condition?
2. Error handling: Is rollback required on failure?
```

---

## ⛔ Directory Tracking (CRITICAL)

**A plan file can move across directories. Every write must record which directory it came from.**

| Level | Field | Rule |
|-------|-------|------|
| File | `Created In` header | Directory where file was first created. **Never changes.** |
| Entry | `Directory` column in Changelog | Working directory at time of each write. Update on every write. |

```bash
pwd  # check before writing
```

---

## ⛔ Continuous Mid-Work Updates (CRITICAL)

**Create the plan file at task start. Update throughout — never batch-update at the end.**

Claude Code sessions can die at any time. If nothing is recorded, the next session starts from scratch with no context.

| When | What to record |
|------|---------------|
| Task start | Remaining Tasks list, approach |
| After search/research | Search Keywords, Reference URLs, Key Findings |
| After a decision | Decision Log (chosen + rejected + why) |
| After each task completes | `[ ]` → `[x]`, update Implementation Status |
| When blocked / direction changes | What failed, why direction changed |
| When scope turns out larger than expected | Stop — report to user, get confirmation before continuing |
| Before session end | Current state, next resumption point |

### Research Log rules
- Record every search term used (exact)
- Record every URL read (even if invalid/dead)
- Key Findings = facts that influenced a decision — **not** URL summaries

### Decision Log rules
- Always include rejected options with reasons — that's the entire point
- Decision Conversation Summary: record only **moments when a decision changed**, not full conversation

### ❌ Prohibited — batch update at the end

```markdown
## Remaining Tasks
- [ ] Task 1    ← no updates from start to finish

## Research Log
(empty)         ← nothing recorded during the session
```

If the session dies in this state, recovery is impossible.

---

## ⛔ Plan File Update Rules (CRITICAL)

When updating, reflect results but **never delete existing scenarios, design, or calculation content**.

| ❌ Avoid | ✅ Correct |
|---------|-----------|
| Delete scenario details when marking done | Update header + add Changelog row |
| Remove calculation content when adding test results | Update implementation status table with ✅ |
| "Summarize" by deleting detailed formulas | Add Test Execution Results section below the status table |

**Test Execution Results** go directly below `Implementation & Test Status`:

```markdown
## Test Execution Results
\`\`\`
Test Files  N passed (N)
Tests       N passed (N)
Duration    X.Xs
✓ path/to/test.ts  (N tests) Xms
\`\`\`
```

---

## ⛔ Plan File Scope Rules (CRITICAL)

### 1 Plan = 1 Feature

One plan file covers exactly one feature. Bundle = impossible to track. Split when:

| Situation | Action |
|-----------|--------|
| 2+ features in one file | Split by feature |
| Remaining Tasks > 10 | Split by phase |
| Feature can complete independently | Separate file |

```
✅ 20260421_wip_login-ui.md
   20260421_wip_login-otp.md

❌ 20260421_wip_login-and-dashboard-and-filter.md
```

### Completing a plan

Change status to `done` and commit:

```bash
mv .claude/plans/20260421_wip_login-otp.md \
   .claude/plans/20260421_done_login-otp.md
git add .claude/plans/
git commit -m "docs: complete login-otp plan"
```
