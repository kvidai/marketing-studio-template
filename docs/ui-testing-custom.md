<!-- Source: epicmobile18/rules/contextual/docs/ui-testing-custom.md -->
<!-- Version: 1.0.0 -->
<!-- Last Updated: 2026-04-21 -->

# UI Testing — {PROJECT_NAME}

> **AI Instructions**: Fill in all `{...}` placeholders based on this project's actual setup.
> Read `scripts/screenshot-ui.[ts(prefer), sh]` (or equivalent) and `CLAUDE.md` before filling.
> Delete this instruction block when done.

## Decisions

| Item | Value |
|------|-------|
| Platform | `{web / ios / android / electron / ...}` |
| Tool | `{agent-browser / Maestro / Detox / Playwright / ...}` |
| Script | `{scripts/screenshot-ui.ts}(prefer) or {scripts/screenshot-ui.sh}` |
| Screenshot storage | `{docs/ui-screenshots/}` or `{tests/snapshots/}` |
| Reason for storage choice | `{manual review / CI regression / both}` |
| Resolution | `1920×1080 (FHD)` |
| Auth method | `{email+password / OTP / token injection / none}` |

## Screenshot Scripts

> **Do not put all cases in one file.**
> Split by phase (auth level / run frequency) and by role or feature group.
> Naming: `screenshot-p{N}-{case1}-{case2}.ts`

### Phase Table

| Script | Auth | Scope | Run when |
|--------|------|-------|----------|
| `screenshot-p1-{public}.ts` | None | Public / no-auth pages | After every UI change |
| `screenshot-p2-{role}.ts` | Required | Authenticated role pages | Before release / after auth change |
| `screenshot-p3-{role}.ts` | Required | Another role or feature group | Same as above |
| … | … | … | … |

> See `scripts/CLAUDE.md` for phase numbering convention and script template.

### Script Index

| Script | Scope | Screens | Run time |
|--------|-------|---------|----------|
| `scripts/screenshot-p1-{name}.ts` | `{public pages}` | `{/}, {/login}` | `~{N}s` |
| `scripts/screenshot-p2-{name}.ts` | `{role}` | `{/dashboard}, {/...}` | `~{N}min` |

> Fill in one row per script. Add rows as scripts are created.

## Screens to Cover

> Map each screen to a phase script. One script = one auth level or one role group.

| Screen / URL | Auth | Phase script | Status |
|--------------|------|-------------|--------|
| `{/}` | No | `p1-{name}` | ✅ |
| `{/login}` | No | `p1-{name}` | ✅ |
| `{/dashboard}` | Yes | `p2-{name}` | ⏳ |
| `{/...}` | `{...}` | `p{N}-{name}` | ⏳ |

## Project-Specific Notes

- Seed accounts: `{see .env.test / admin@example.com → OTP 111111}`
- `{Any env setup, font issues, port conflicts, or quirks not obvious from the script}`

## Reference

- Base guide: `docs/ui-testing.md`
- Script helpers: `scripts/screenshot-lib.ts` (see `scripts/CLAUDE.md`)
- Screenshots index: `{docs/ui-screenshots/README.md}`

## Screenshot Visual Verification

Use the `vision-checker` skill to validate screenshots without loading raw images into the conversation context.

```
/vision-checker {docs/ui-screenshots/}
```

