# marketing-studio

A monorepo for AI-assisted marketing content creation and automated channel publishing.

Each package owns one complete marketing artifact. AI agents handle content quality; code handles publishing.

**Brands**: brandA + brandB + ...

---

## Channel Status

| Channel | Status | Notes |
|---------|--------|-------|
| Email (AWS SES) | ✅ Live | SES keys configured |
| Blog (NodeBB) | ✅ Code ready | Instance not deployed |
| Blog (Discourse) | ✅ Code ready | Instance not deployed |
| Card news render (Sharp) | ✅ Live | Instagram 1080×1080 / Facebook 1200×630 |
| Card news upload (Meta) | STUB | Awaiting Meta App approval |
| Video | STUB | Awaiting kvidai CLI SDK MCP |
| Push | STUB | Awaiting kvidai web push SDK |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Type check
pnpm -r typecheck

# Email dry run (no SES call)
pnpm --filter email-blast-template send -- --dry-run --campaign=.example

# Render card news
pnpm --filter cardnews-template render -- --set=.example --brand=kvidai
```

---

## Creating a New Artifact

Use Claude Code slash commands to scaffold an `in/{slug}/` folder and write a brief:

```
/new-email-blast     # email campaign
/new-cardnews        # card news set
/new-blog-post       # blog post
/new-campaign        # multi-channel campaign
```

Full workflow guide: `context/WORKFLOW-INDEX.md`

---

## Structure

```
packages/shared/              # @marketing-studio/* internal libraries
packages/email-blast-template/
packages/blog-post-template/
packages/cardnews-template/
packages/video-template/      # scaffold only
packages/push-template/       # scaffold only
context/                      # AI agent specs, brief templates, brand rules
docs/channels/                # per-channel integration guides
```

---

## Environment Variables

Copy `.env.example` to `.env.production` or `.env.{brandname}` and fill in your keys.

See `.env.example` `.env.{examplebrand}` for all available variables.

---

## AI Agent Guide

See `CLAUDE.md`.
