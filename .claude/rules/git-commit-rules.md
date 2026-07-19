<!-- Source: epicmobile18/rules/core/git-commit-rules.md -->
<!-- Version: 1.0.1 -->
<!-- Last Updated: 2026-03-09 -->

# Git Commit Message Rules

## Core Principles

- Write **concisely and clearly**
- **Exclude** auto-generated phrases like Co-Authored-By
- Use Conventional Commits

## Conventional Commits

Format: `type: description`

### Type

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add user authentication` |
| `fix` | Bug fix | `fix: resolve login timeout issue` |
| `docs` | Documentation changes | `docs: update API documentation` |
| `chore` | Other changes (build, config, etc.) | `chore: update dependencies` |
| `refactor` | Code refactoring | `refactor: simplify validation logic` |
| `test` | Add/modify tests | `test: add unit tests for auth` |
| `style` | Code formatting (no functional change) | `style: fix indentation` |
| `perf` | Performance improvement | `perf: optimize database queries` |

### Scope (optional)

Format: `type(scope): description`

Examples:
- `feat(api): add new endpoint`
- `fix(auth): resolve token expiration`
- `docs(readme): update installation guide`

### Breaking Changes

Mark breaking changes with `!`:

```
feat(api)!: change authentication method
```

Or add `BREAKING CHANGE:` to the commit body:

```
feat: update API response format

BREAKING CHANGE: response now uses camelCase instead of snake_case
```

## Prohibited

### ❌ Never include

1. **Emojis**
   ```
   ❌ ✨ feat: add new feature
   ✅ feat: add new feature
   ```

2. **Claude/AI mentions**
   ```
   ❌ feat: add feature (generated with Claude Code)
   ❌ Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ✅ feat: add feature
   ```

3. **Unnecessary auto-generated phrases**
   ```
   ❌ Generated with Claude Code
   ❌ Created by AI Assistant
   ✅ (no extra messages)
   ```

## Good Examples

```bash
# Basic
feat: allow provided config object to extend other configs

# With scope
feat(api): add endpoint for user credits

# Breaking change
feat(auth)!: require email verification for new users

# Multi-line
feat: add user notification system

- Add email notification service
- Add push notification service
- Update user preferences schema
```

## Bad Examples

```bash
# Too vague
❌ fix: bug fix
❌ update: changes

# Emojis
❌ ✨ feat: new feature
❌ 🐛 fix: bug fix

# AI mentions
❌ feat: add feature (Co-Authored-By: Claude)
❌ Generated with Claude Code
```

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
