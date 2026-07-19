---
description: Scaffold a new email campaign folder with brief.json
argument-hint: <campaign-slug>
allowed-tools: Bash, Write, Edit, Read
---

# /new-email-blast <campaign-slug>

Scaffold a new email blast campaign.

## Steps

1. Create `packages/email-blast-template/in/<campaign-slug>/`
2. Copy files from `in/.example/` (brief.json, body.html, body.txt)
3. Set defaults in brief.json (subject placeholder, fromName)
4. Print next steps

## Next Steps After Scaffolding

```bash
# Generate copy with AI — use context/template/brief-to-email-template.md

# Preview (dry run)
pnpm --filter email-blast-template send --campaign=<slug> --dry-run

# Test send to admin
pnpm --filter email-blast-template send --campaign=<slug> --to=$KVIDAI_ADMIN_EMAIL

# Production send
pnpm --filter email-blast-template send --campaign=<slug>
```

## Files Created

- `packages/email-blast-template/in/<slug>/brief.json`
- `packages/email-blast-template/in/<slug>/body.html`
- `packages/email-blast-template/in/<slug>/body.txt`
