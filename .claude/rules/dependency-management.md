<!-- Source: epicmobile18/rules/core/dependency-management.md -->
<!-- Version: 1.0.1 -->
<!-- Last Updated: 2026-03-09 -->

# Dependency Management Rules

## Core Principles

- Understand before acting — read existing code/configs first
- Respect existing decisions — every config exists for a reason
- Investigate root causes, not symptoms
- When uncertain, ask instead of guessing

---

## Dependency Management - CRITICAL

### The RIGHT way to solve conflicts: Find compatible versions

When packages conflict:
1. Analyze which versions are incompatible
2. Find version combination that works together
3. Test it actually works
4. Document if needed

### BANNED: Overrides/Resolutions

**NEVER** suggest these — they hide problems:
- npm: `overrides`
- pnpm: `pnpm.overrides`
- yarn: `resolutions`
- pip: `--force-reinstall`, `--ignore-requires-python`
- cargo: `[patch]` (except local dev)
- go: `replace` (except local dev)

Why: Hide compatibility problems, break in production, human has never needed them.

---

## Version Management

### Before modifying dependency files:
(package.json, requirements.txt, pyproject.toml, Cargo.toml, go.mod, Gemfile, etc.)

- Read the file completely
- Understand current constraints
- Check runtime/language version requirements
- **ASK before major version changes**
- Show diff for significant changes

### Version formats:
- **NORMAL**: `"package": "^1.2.3"` — semver range, standard practice
- **WHEN NEEDED**: `"package": "1.2.3"` — exact version
- **NEVER**: `"package": "*"` or `"latest"` — unpredictable

### Lock files:
- Don't add if gitignored
- Don't manually edit

---

## Problem Solving

### When errors occur:
1. Read full error message
2. Investigate root cause
3. Find compatible versions (not overrides)
4. Test solution
5. Explain if complex

### AVOID quick hacks:
- Overrides/resolutions
- `--force`, `--ignore-*` flags
- Disabling type/lint checks
- Suppressing warnings without understanding
- "Try upgrading everything"
- Repeating same failing command

### When stuck:
- Explain what you tried and why it failed
- Admit uncertainty
- Ask for guidance

---

## Code Changes

- Read context before modifying
- Preserve comments and documentation
- Match existing style
- Show diffs for significant changes
- Explain complex refactoring decisions

---

## Configuration Files

Handle with care:
- Dockerfiles, CI/CD configs
- .env files, language version files
- Linter/formatter configs

Show diff before modifying critical configs.

---

## Communication

- Explain what and why
- Show concrete examples
- Present alternatives when multiple options exist
- Admit when unsure

---

## Red Flags - STOP and ASK

Before suggesting:
- Adding overrides/resolutions
- Major version upgrades
- Changing runtime versions
- Using `--force` flags

---

## Golden Rule

**Dependency conflicts → Find compatible versions (NOT overrides)**

When in doubt: explain and ask.
