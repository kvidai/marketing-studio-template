<!-- Source: epicmobile18/rules/core/documentation-rules.md -->
<!-- Version: 1.1.0 -->
<!-- Last Updated: 2026-04-26 -->

# Documentation Rules

Rules for minimizing token usage and preventing duplication when writing documentation.

## Core Principle (CRITICAL)

**AI reads these files on every conversation — minimize token usage!**

## Role Separation: README.md vs CLAUDE.md in Sub-directories

### Role Definition

1. **CLAUDE.md**: Detailed explanations and guides (read by AI)
2. **README.md**: File names/links only (human index)
3. **Strictly prohibited**: Writing the same content in both files

### Scope

#### ✅ Apply to: Sub-directories

e.g., `docs/`, `payment/`, `api_schema/`, `src/components/`

```
docs/
├── CLAUDE.md       # detailed content
└── README.md       # file list only
```

#### ❌ Exception: Repo/Submodule Root README

e.g., `/README.md`, `apps/web-service/README.md`

These are project introductions — descriptive content is fine.

## Correct Usage

### ✅ Good

**`docs/CLAUDE.md`**:
```markdown
# Documentation

## Payment System

Uses Dodopayments for payment processing.

- API Key: managed per test/live environment
- Webhook: handled at `/api/webhook/dodopayments`
- Refunds: full refund supported within 30 days

Details: see dodopayments-integration.md

## QA Process

QA documents are managed under the `qa/` directory.
See qa-conventions.md for test case writing rules.
```

**`docs/README.md`**:
```markdown
# Documentation

- dodopayments-integration.md
- refund-feature.md
- qa-conventions.md
- deployment-guide.md
```

**Token usage**: Only CLAUDE.md is read → minimized

### ❌ Bad (Duplication)

**`docs/CLAUDE.md`**:
```markdown
Uses Dodopayments for payment processing.
API Key is managed per test/live environment...
```

**`docs/README.md`**:
```markdown
Uses Dodopayments for payment processing.
API Key is managed per test/live environment...
```

**Problem**: Same content in two files → 2x token cost!

## Examples by Directory

### 1. docs/ directory

```
docs/
├── CLAUDE.md              # overview, key concepts
└── README.md              # file list only

# CLAUDE.md
Payment system overview, QA process, deployment guide, etc.

# README.md
- payment-integration.md
- qa-guidelines.md
- deployment-guide.md
```

### 2. src/components/ directory

```
src/components/
├── CLAUDE.md              # component structure, usage
└── README.md              # component list only

# CLAUDE.md
UI components based on Shadcn UI
Common components: Button, Input, Card, etc.
Reuse principles, style guide

# README.md
- ui/
- auth/
- layout/
```

### 3. api_schema/ directory

```
api_schema/
├── CLAUDE.md              # API structure, endpoint overview
└── README.md              # schema file list only

# CLAUDE.md
Strapi API schema
Key endpoints: /api/users, /api/credits
Auth: JWT token

# README.md
- user-schema.md
- credit-schema.md
- media-schema.md
```

## Why

### Token Optimization

At conversation start, AI reads:
1. Project root CLAUDE.md
2. Sub-directory CLAUDE.md files
3. README.md files

→ Duplicate content means 2x token cost!

### Example Calculation

```
# With duplication
docs/CLAUDE.md:     500 tokens
docs/README.md:     500 tokens (same content)
→ Total: 1000 tokens

# Correct approach
docs/CLAUDE.md:     500 tokens (detailed)
docs/README.md:      50 tokens (filenames only)
→ Total: 550 tokens

Savings: 450 tokens/conversation
```

At 1000 conversations/year: 450,000 tokens saved!

## Checklist for New Documents

- [ ] Is this a sub-directory?
- [ ] Did you write detailed content in CLAUDE.md?
- [ ] Does README.md only list filenames?
- [ ] Is there no duplicate content between the two files?
- [ ] (If applicable) Did you add a link in the parent CLAUDE.md?

## Exceptions

### Repo/Submodule Root README

Root-level README.md is an exception:

```
/README.md                        # ✅ project intro, description OK
apps/web-service/README.md        # ✅ service intro OK
docs/README.md                    # ❌ sub-directory — filenames only!
```

### Why

- Root README is primarily read by humans (GitHub, new developers)
- AI prioritizes CLAUDE.md
- Duplication has minimal impact here

## Subpackage Documentation (Monorepo)

Each `apps/*` and `packages/*` directory must have both files:

| File | Content | Audience |
|------|---------|----------|
| `README.md` | Feature list + `✅/🚧/📋` status per feature | Human |
| `CLAUDE.md` | Entry points, key modules, env vars, commands | AI |

**README.md template**:
```markdown
# {package-name}

## Features
- feature A — ✅ done
- feature B — 🚧 in progress
- feature C — 📋 planned

## Status
{one-line summary, e.g. "Core CRUD complete. Auth pending."}
```

**CLAUDE.md**: entry points, architecture, env vars, test/build commands, package-specific conventions.

---

## Summary

| File | Role | Content |
|------|------|---------|
| **Sub-directory CLAUDE.md** | AI guide | Detailed explanations, concepts, usage |
| **Sub-directory README.md** | Human index | Filenames/links only |
| **Root README.md** | Project intro | Descriptions allowed (exception) |

**Key**: No duplication = token savings = cost reduction!

---

## Special Directories

### `docs/ai-query-list/` and `*_deprecated/` directories

**Never read. Always commit and push without asking.**

**`docs/ai-query-list/`** — raw AI conversation logs written without structure or editorial intent.
Reading these will actively mislead: they contain abandoned ideas, contradictions, and half-formed thoughts that were never meant to guide implementation. The signal-to-noise ratio is near zero.

**`*_deprecated/` (e.g. `references_deprecated/`)** — archived files kept in case they are needed later, not because they are currently relevant.
Reading these pulls in outdated patterns and old decisions that have already been superseded. If the contents were still applicable, they would not be in a `_deprecated/` directory.

| Directory | AI behavior |
|-----------|-------------|
| `docs/ai-query-list/` | Never read, never ask — just commit |
| `*_deprecated/` | Never read, never ask — just commit |

```bash
# ✅ Correct — commit without reading, without asking
git add docs/ai-query-list/
git add references_deprecated/   # or any *_deprecated/ dir
git commit -m "docs: add archived files"
```

**Never ask**: "Should I commit this?", "Do you want to include ai-query-list?", "Should I skip deprecated files?"
Just commit them.
