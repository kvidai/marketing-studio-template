---
description: Scaffold a new Reddit post folder with brief.json and body.md
argument-hint: <post-slug>
allowed-tools: Bash, Write, Edit, Read
---

# /new-reddit-post <post-slug>

Scaffold a new Reddit post.

## Steps

1. Create `packages/reddit-post-template/in/<post-slug>/`
2. Copy `in/.example/` (brief.json, body.md)
3. Set defaults (subreddit=KvidAI, kind=self, title)
4. Print next steps

## Next Steps After Scaffolding

```bash
# Edit brief.json (subreddit, kind, title)
vi packages/reddit-post-template/in/<slug>/brief.json

# Edit body.md (for kind=self)
vi packages/reddit-post-template/in/<slug>/body.md

# Dry run (no API call)
pnpm --filter reddit-post-template publish-post -- --post=<slug> --dry-run

# Test on r/test first
pnpm --filter reddit-post-template publish-post -- --post=<slug> --subreddit=test

# Publish to real subreddit
pnpm --filter reddit-post-template publish-post -- --post=<slug>
```

> Note: Reddit script app 발급 필요.
> https://www.reddit.com/prefs/apps → create another app → script
> `.env.production`에 REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT 추가.

## Files Created

- `packages/reddit-post-template/in/<slug>/brief.json`
- `packages/reddit-post-template/in/<slug>/body.md`
