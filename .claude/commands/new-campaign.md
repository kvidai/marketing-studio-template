---
description: Scaffold an independent multi-channel campaign package
argument-hint: <campaign-slug>
allowed-tools: Bash, Write, Edit, Read
---

# /new-campaign <campaign-slug>

Creates a multi-channel campaign in `campaigns/<campaign-slug>/`.

## When to Use

- One campaign spans multiple channels simultaneously (email + blog + reddit + cardnews)
- A specific product launch / event needs one canonical content source
- Prefer this over per-channel `/new-*` commands when multi-channel distribution is intended

## Steps

1. Create `campaigns/<campaign-slug>/`
2. Scaffold with template files
3. Print next-step instructions

## Generated Structure

```
campaigns/<campaign-slug>/
├── brief.json      # shared: title, tags, images (canonical content)
├── body.md         # shared body text (blog, reddit self post, email fallback)
├── assets/         # images and videos (.gitkeep)
├── email.json      # email overrides: subject, previewText, fromName, recipients
├── blog.json       # blog overrides: target, category, tags
├── reddit.json     # reddit overrides: subreddit, kind, flair, nsfw
└── cardnews.json   # cardnews overrides: brand, format, slides, caption, hashtags
```

## Per-Channel Publish Commands

```bash
# Email
pnpm --filter email-blast-template send -- --campaign=<campaign-slug> --dry-run
pnpm --filter email-blast-template send -- --campaign=<campaign-slug>

# Blog
pnpm --filter blog-post-template publish-post -- --campaign=<campaign-slug> --target=nodebb
pnpm --filter blog-post-template publish-post -- --campaign=<campaign-slug> --target=discourse

# Reddit
pnpm --filter reddit-post-template publish-post -- --campaign=<campaign-slug> --dry-run
pnpm --filter reddit-post-template publish-post -- --campaign=<campaign-slug>

# Card news
pnpm --filter cardnews-template render -- --campaign=<campaign-slug>
pnpm --filter cardnews-template upload -- --campaign=<campaign-slug> --platform=instagram
```

## Standalone Channel Commands (single-channel, no campaign)

```bash
/new-email-blast <slug>    → packages/email-blast-template/in/<slug>/
/new-blog-post <slug>      → packages/blog-post-template/in/<slug>/
/new-reddit-post <slug>    → packages/reddit-post-template/in/<slug>/
/new-cardnews <slug>       → packages/cardnews-template/in/<slug>/
```
