---
description: Scaffold a new card news set folder with brief.json
argument-hint: <set-slug>
allowed-tools: Bash, Write, Edit, Read
---

# /new-cardnews <set-slug>

Scaffold a new card news set.

## Steps

1. Create `packages/cardnews-template/in/<set-slug>/`
2. Copy `in/.example/brief.json`
3. Set defaults (brand, format, slides skeleton)
4. Print next steps

## Next Steps After Scaffolding

```bash
# Generate slide content with AI — use context/template/brief-to-cardnews-template.md

# Render slides
pnpm --filter cardnews-template render --set=<slug> --brand=kvidai

# QA with vision-checker
cd .agents/skills/vision-checker
tsx check-image.ts --dir=../../packages/cardnews-template/outputs/<slug>

# Upload (after Meta app approval)
pnpm --filter cardnews-template upload --set=<slug> --platform=instagram
```

## Files Created

- `packages/cardnews-template/in/<slug>/brief.json`
