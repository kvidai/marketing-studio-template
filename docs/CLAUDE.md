<!-- Source: marketing-studio-template/rules/contextual/docs/CLAUDE.md -->
<!-- Version: 1.0.1 -->
<!-- Last Updated: 2026-03-09 -->

# docs/ - Documentation Directory

> **Writing principle**: AI reads this every conversation — minimize token usage. Be concise and stick to essentials.
>
> **⚠️ No duplication**: Write document content only in CLAUDE.md. Keep README.md minimal.
>
> **When adding new docs**: Update the CLAUDE.md of that directory; add only the filename to README.md.

## Example Directory Structure

```
docs/
├── ui-screenshots/      # Key UI screenshots (update and commit on UI changes)
├── qa/                  # QA test cases
└── prompts/       # AI conversation logs (by date)
```

## Document Categories

**Environment & Setup**
- `ENVIRONMENT_SETUP.md` - development environment
- `project-summary.md` - project overview
- `requirements.md` - requirements
- `current-status.md` - progress status

**Implementation Guides**
- Feature-specific implementation docs
- API migration guides

**Issues & Tasks**
- Known issue docs
- `task-breakdown.md` - task breakdown

## Writing Rules

- Filenames: `kebab-case.md`
- Add a CLAUDE.md to each subdirectory (AI index)
- Keep README.md as a file list only (no detailed content needed)
