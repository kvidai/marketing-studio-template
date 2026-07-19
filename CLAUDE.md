# CLAUDE.md — marketing-studio

AI coding agent guide for this monorepo.

---

## Project Overview

| Field | Value |
|-------|-------|
| **Project** | marketing-studio |
| **Brands** | kvid.ai + affy.ink |
| **Purpose** | Per-artifact marketing content creation + channel upload automation |
| **Package Manager** | pnpm (workspace) |
| **Runtime** | Node.js 22+, TypeScript via `tsx` (no compile step) |
| **Channels** | Email (SES), Blog (NodeBB/Discourse), Card News (Instagram/Facebook), Reddit, Video/Push (stub) |

## Monorepo Structure

```
marketing-studio/
├── campaigns/                     # multi-channel campaigns (canonical content source)
│   └── {slug}/                    # brief.json + body.md + {channel}.json overrides
│
├── packages/
│   ├── shared/                    # @marketing-studio/* internal libs
│   │   ├── env/                   # zod-validated .env.production loader
│   │   ├── types/                 # cross-channel types
│   │   ├── brand/                 # brand palette + voice registry
│   │   ├── prompt-kit/            # reusable prompt fragments
│   │   ├── render-image/          # Sharp card-news primitives
│   │   ├── send-email-ses/        # AWS SES SDK wrapper
│   │   ├── publish-nodebb/        # NodeBB Write API client
│   │   ├── publish-discourse/     # Discourse REST API client
│   │   ├── upload-meta/           # Instagram + Facebook Graph API (STUB)
│   │   ├── send-video-kvidai/     # @kvidai/cli wrapper (STUB)
│   │   ├── send-push-kvidai/      # kvidai web push (STUB)
│   │   └── publish-reddit/        # Reddit OAuth API client (text/link/image/video)
│   │
│   ├── email-blast-template/      # Email channel — fully wired (SES live)
│   ├── blog-post-template/        # Blog channel — code ready (instances TBD)
│   ├── cardnews-template/         # Card news — render ready, upload STUB
│   ├── reddit-post-template/      # Reddit channel — code ready (script app TBD)
│   ├── video-template/            # SCAFFOLD — blocked on @kvidai/cli sdk mcp
│   └── push-template/             # SCAFFOLD — blocked on kvidai web push SDK
│
├── context/                       # AI agent specs, brief templates, brand rules
│   ├── WORKFLOW-INDEX.md          # master channel switchboard
│   ├── agents/                    # role-by-role agent specs
│   ├── template/                  # brief → artifact entry templates
│   └── common/                    # brand voice, image specs
│
├── .claude/commands/              # /new-email-blast, /new-cardnews, etc.
├── .agents/skills/                # vision-checker, grill-me (pre-installed)
├── .env.production                # live keys (AWS SES wired; others commented)
├── .env.example                   # template — mirror of .env.production keys
└── docs/channels/                 # per-channel integration notes
```

## Key Rules

| Rule | File |
|------|------|
| Documentation (CLAUDE.md vs README.md) | `.claude/rules/documentation-rules.md` |
| File path conventions | `.claude/rules/file-path-rules.md` |
| Git commit messages | `.claude/rules/git-commit-rules.md` |
| Plan file conventions | `.claude/rules/plan-conventions.md` |
| Workflow checklist | `.claude/rules/workflow-rules.md` |
| Coding guidelines | `.claude/rules/coding-guidelines.md` |
| Dependency management | `.claude/rules/dependency-management.md` |

## Running Packages

All packages use `tsx` — no build step needed.

```bash
# Campaign mode (multi-channel) — reads from campaigns/{slug}/
pnpm --filter email-blast-template send -- --campaign=.example --dry-run
pnpm --filter blog-post-template publish-post -- --campaign=.example --target=nodebb
pnpm --filter reddit-post-template publish-post -- --campaign=.example --dry-run
pnpm --filter cardnews-template render -- --campaign=.example

# Standalone mode (single-channel) — reads from packages/{template}/in/{slug}/
pnpm --filter email-blast-template send -- --campaign=.example          # fallback to in/ if no campaigns/
pnpm --filter blog-post-template publish-post -- --post=.example --target=nodebb
pnpm --filter cardnews-template render -- --set=.example --brand=kvidai
pnpm --filter cardnews-template upload -- --set=.example --platform=instagram
pnpm --filter reddit-post-template publish-post -- --post=.example --dry-run

# Typecheck all packages
pnpm -r typecheck
```

## Environment Variables

Single source: `.env.production`. Loaded via `@marketing-studio/env` in every package.

```bash
# Required (SES live):
AWS_SES_REGION, AWS_SES_KEY, AWS_SES_SECRET
KVIDAI_AWS_SEND_EMAIL_MARKETING, KVIDAI_AWS_SEND_EMAIL_TRANSACTIONAL
KVIDAI_ADMIN_EMAIL, KVIDAI_SELF_URL

# Optional (add when service is ready):
NODEBB_BASE_URL, NODEBB_TOKEN
DISCOURSE_BASE_URL, DISCOURSE_API_KEY, DISCOURSE_API_USERNAME
META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_IG_ACCOUNT_ID
REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT
```

## Workflow Entry Points

**Multi-channel campaign** (one content → all channels):
- `/new-campaign <slug>` → creates `campaigns/{slug}/` with shared brief + per-channel overrides

**Single-channel standalone**:
- **Email**: `/new-email-blast` → creates `packages/email-blast-template/in/{slug}/`
- **Blog**: `/new-blog-post` → creates `packages/blog-post-template/in/{slug}/`
- **Card news**: `/new-cardnews` → creates `packages/cardnews-template/in/{slug}/`
- **Reddit**: `/new-reddit-post` → creates `packages/reddit-post-template/in/{slug}/`

Then follow `context/WORKFLOW-INDEX.md` → each channel's `WORKFLOW.md`.

## Channel Status

| Channel | Render/Send | Upload | Blocker |
|---------|------------|--------|---------|
| Email (SES) | ✅ Live | — | None |
| Blog (NodeBB) | ✅ Ready | ✅ Ready | Instance not deployed |
| Blog (Discourse) | ✅ Ready | ✅ Ready | Instance not deployed |
| Card News (render) | ✅ Live | STUB | Meta App approval |
| Reddit | ✅ Ready | ✅ Ready | script app 발급 필요 |
| Video | STUB | STUB | @kvidai/cli sdk mcp |
| Push | ✅ CLI ready (send STUB) | STUB | kvidai web push SDK |

## STUB Pattern

STUBs throw immediately with a descriptive error:
```
packages/shared/upload-meta/src/index.ts       → "META STUB: configure Meta App first"
packages/shared/send-video-kvidai/src/index.ts → "VIDEO STUB: @kvidai/cli not yet wired"
packages/shared/send-push-kvidai/src/index.ts  → "PUSH STUB: kvidai push SDK not yet wired"
```
To unlock a stub: replace the throw in the corresponding `packages/shared/` file.

## Plan Files

Active plans: `.claude/plans/`

```bash
ls .claude/plans/*_wip_*.md   # in-progress — read first
```

## QA Tools

- Card news visual QA: `.agents/skills/vision-checker/` (wired for Claude + Codex)
- Pre-flight scope review: `.agents/skills/grill-me/`
- Screenshot helpers: `scripts/screenshot-*.{ts,sh}`
