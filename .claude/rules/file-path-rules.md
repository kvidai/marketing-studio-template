<!-- Source: epicmobile18/rules/core/file-path-rules.md -->
<!-- Version: 1.0.1 -->
<!-- Last Updated: 2026-03-09 -->

# File Path Naming Rules

Rules for specifying file paths based on context.

## Overview

| Context | Path Format | Example |
|---------|-------------|---------|
| **Working across monorepo** | `apps/{submodule}/...path.../filename` | `apps/web-service/docs/CLAUDE.md` |
| **Working in a single submodule** | `./...path.../filename` | `./docs/CLAUDE.md` |

## When Working Across the Monorepo

Use when modifying multiple submodules simultaneously or working from the monorepo root.

### Rule

- When referencing README.md/CLAUDE.md, **specify path starting from the submodule**
- Format: `apps/{submodule}/...path.../filename`

### ✅ Correct

```markdown
See: apps/web-service/docs/CLAUDE.md
Edit: apps/web-service/CLAUDE.md
Check: apps/strapi-ts/CLAUDE.md
Build: apps/billing-scheduler/README.md
```

### ❌ Avoid

```markdown
❌ ./docs/CLAUDE.md          # which submodule?
❌ docs/CLAUDE.md             # submodule omitted
❌ CLAUDE.md                  # no path
```

### Why

- Cross-submodule work (web-service ↔ strapi-ts, etc.) is frequent
- Clear distinction is necessary
- Prevents ambiguity

## When Working in a Single Submodule

Use when only that submodule is cloned and being worked on.

### Rule

- Use relative paths from the submodule root
- Format: `./...path.../filename` (explicit `./` prefix required)

### ✅ Correct

```markdown
See: ./docs/CLAUDE.md
Edit: ./CLAUDE.md
Check: ./README.md
Config: ./src/config/database.ts
```

### ❌ Avoid

```markdown
❌ docs/CLAUDE.md             # no ./ prefix (indistinguishable from a filename)
❌ CLAUDE.md                  # without ./, ambiguous whether it's a filename or path
❌ /docs/CLAUDE.md            # absolute path (meaningless in submodule context)
```

### Why

- No `apps/` directory
- Relative paths are sufficient
- `./` prefix: explicitly signals a path, prevents confusion with filenames

## Example Scenarios

### Scenario 1: Working across multiple submodules in monorepo

```markdown
# Task: Update documentation across submodules

Changes:
- apps/web-service/CLAUDE.md - Add QA conventions reference
- apps/strapi-ts/CLAUDE.md - Add API documentation link
- apps/web-service/docs/qa/CLAUDE.md - Update QA guidelines
```

### Scenario 2: Working in web-service submodule only

```markdown
# Task: Update web-service documentation

Changes:
- ./CLAUDE.md - Add QA conventions reference
- ./docs/qa/CLAUDE.md - Update QA guidelines
- ./README.md - Update installation guide
```

### Scenario 3: Incorrect mixing (❌)

```markdown
# ❌ Monorepo context but using relative paths
Changes:
- ./docs/CLAUDE.md           # which submodule?
- apps/strapi-ts/CLAUDE.md   # mixed styles

# ✅ Correct
Changes:
- apps/web-service/docs/CLAUDE.md
- apps/strapi-ts/CLAUDE.md
```

## Special Cases

### Monorepo Root Files

Explicitly mark monorepo root files:

```markdown
✅ /CLAUDE.md                 # Root CLAUDE.md
✅ kvidai/CLAUDE.md           # explicit
❌ CLAUDE.md                  # ambiguous (which location?)
```

### Config File References

```markdown
# Monorepo
apps/web-service/.env.local
apps/web-service/package.json

# Submodule
./.env.local
./package.json
```

## Summary

| Situation | Format | Example |
|-----------|--------|---------|
| Monorepo-wide work | `apps/{submodule}/path/file` | `apps/web-service/docs/CLAUDE.md` |
| Single submodule work | `./path/file` | `./docs/CLAUDE.md` |
| Monorepo root | `/file` or `kvidai/file` | `/CLAUDE.md` |
| General files (code) | Relative to project root | `src/lib/utils.ts` |

**Principle**: Be explicit about context, prevent ambiguity!
