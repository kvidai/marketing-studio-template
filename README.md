# marketing-studio

A monorepo for AI-assisted marketing content creation and automated channel publishing.

Each package owns one complete marketing artifact. AI agents handle content quality; code handles publishing.

**Brands**: brandA + brandB + ...

> **처음 클론했다면**: 사람은 `docs/SETUP.md` 를 따라 설치, 또는 **Claude Code 에게 "docs/SETUP.md 보고 설치해줘"** 라고 하면 에이전트가 같은 문서로 설치한다. 영상 채널은 `kvid` CLI(`curl https://cli.kvid.ai/install -fsS | bash`) 가 필요하다.

---

## Channel Status

| Channel | Status | Notes |
|---------|--------|-------|
| Email (AWS SES) | ✅ Live | SES keys configured |
| Blog (NodeBB) | ✅ Code ready | Instance not deployed |
| Blog (Discourse) | ✅ Code ready | Instance not deployed |
| Card news render (Sharp) | ✅ Live | Instagram 1080×1080 / Facebook 1200×630 (정적 이미지) |
| Card news upload (Meta) | STUB | Awaiting Meta App approval |
| Video (kvid.ai) | ✅ Live | `kvid` CLI 기반 — agent / direct / **cardnews(모션 카드뉴스 → 에디터 composition)**. export 는 에디터에서 |
| Motion cardnews (Remotion) | ✅ 예시 제공 | `SampleCardNews` 복제해 자기 포스터 family 설계 → cardnews 모드로 composition |
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

# Render card news (정적 이미지)
pnpm --filter cardnews-template render -- --set=.example --brand=kvidai
```

### 영상 / 모션 카드뉴스 (kvid.ai)

```bash
# 0) kvid CLI 설치 + 키 (한 번)  —  curl https://cli.kvid.ai/install -fsS | bash
#    .env.production 에 KVIDAI_API_KEY / KVIDAI_USER_EMAIL / KVIDAI_BASE_URL

# 1) 예시 카드뉴스 무음 마스터 렌더 (첫 실행 시 chromium 자동 다운로드)
pnpm --filter infographic-remotion render-sample -- --campaign=.example --name=cardnews-silent

# 2) 씬별 클립 분할 → kvid.ai composition 조립 → 에디터 URL
#    (campaigns/.example/video.cardnews.json 을 video.json 으로 복사 후)
pnpm --filter video-template generate -- --campaign=.example
```

새 포스터로 만들려면: 대화형으로 `/new-video` 사용(권장), 또는 `src/sample-cardnews/` 를 복제해 자기 family 설계.
상세: `packages/video-template/CLAUDE.md`, `.claude/rules/video-generation-rules.md`.

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
