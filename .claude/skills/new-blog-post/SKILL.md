---
description: Scaffold a new blog post folder with brief.json and content.md
argument-hint: <post-slug>
allowed-tools: Bash, Write, Edit, Read
---

# /new-blog-post <post-slug>

Scaffold a new blog post.

## Steps

1. Create `packages/blog-post-template/in/<post-slug>/`
2. Copy `in/.example/` (brief.json, content.md)
3. Set defaults (title, target, category, tags)
4. Print next steps

## Next Steps After Scaffolding

```bash
# Generate outline with AI — use packages/blog-post-template/prompts/outline.md
# Write content.md from outline

# Publish to NodeBB
pnpm --filter blog-post-template publish-post --post=<slug> --target=nodebb

# Publish to Discourse
pnpm --filter blog-post-template publish-post --post=<slug> --target=discourse
```

> Note: NodeBB/Discourse instances not yet deployed.
> Add NODEBB_BASE_URL, NODEBB_TOKEN (or Discourse equivalents) to .env.production first.

## Files Created

- `packages/blog-post-template/in/<slug>/brief.json`
- `packages/blog-post-template/in/<slug>/content.md`
