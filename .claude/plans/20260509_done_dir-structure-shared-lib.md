# marketing-studio — directory structure + shared lib scaffold

> **Last Updated**: 2026-05-09
> **Version**: v0.3.0
> **Status**: done
> **Created In**: `/home/ubuntu/code_workspace/marketing-automate/`
> **Final Directory**: `/home/ubuntu/code_workspace/marketing-studio/`
> **GitHub**: `https://github.com/epicmobile18/marketing-studio` (private)

---

## Command Clarity Check

| Item | Status |
|------|--------|
| Scope | ✅ monorepo dir 구조 + shared lib + 채널별 template package |
| Done criteria | ✅ `pnpm install && pnpm -r typecheck` 통과, 채널별 WORKFLOW.md 존재 |
| Constraints | ✅ kvidai-template 패턴 복사만 (submodule 아님), .env.production 유지, 기존 .agents/skills/ 유지 |
| Error handling | ✅ video/push = stub (throw `not_yet_wired`), 나머지 채널 dry-run 옵션 포함 |

**Runnable**: ✅

---

## Changelog

| Date | Version | Changes | Directory | Author |
|------|---------|---------|-----------|--------|
| 2026-05-09 | v0.1.0 | 계획 수립 | `/home/ubuntu/code_workspace/marketing-automate/` | Claude |
| 2026-05-09 | v0.2.0 | 추가 Q&A 반영: Blog placeholder, CardNews 렌더전용, TS 통일, multi-brand ENV 분리 | `/home/ubuntu/code_workspace/marketing-automate/` | Claude |
| 2026-05-09 | v0.3.0 | **구현 완료**: 전체 패키지 생성, typecheck 통과, git init, GitHub push, 디렉토리 rename. `_shared/` → `shared/` 변경. context/commands/docs 영어 작성. | `/home/ubuntu/code_workspace/marketing-studio/` | Claude |

---

## Context

`/home/ubuntu/code_workspace/marketing-studio/` — 구현 완료.

**사용자 확정 사항**

| 항목 | 결정 |
|------|------|
| 프로젝트명 | `marketing-automate` → `marketing-studio` ✅ 완료 |
| kvidai-template | **패턴 복사만** (submodule/subtree 아님) ✅ |
| v1 채널 | Email = 풀 구현 ✅. Blog = 코드만(인스턴스 나중에) ✅. CardNews = 렌더만, 업로드 stub ✅. Video + Push = scaffold+stub ✅ |
| Subproject 단위 | **Hybrid** — 재사용 채널 template + 일회성 campaign package ✅ |
| 통합 방식 | [CLI, SDK, API, MCP] — 파이프라인 런타임 없음 ✅ |
| 코드 언어 | **TypeScript 통일** (tsx, no compile step) ✅ |
| 브랜드 | **Multi-brand** — kvid.ai + affy.ink. 현재는 `.env.production` 단일 파일, 추후 3개로 분리 예정 ✅ |
| shared 폴더 | `packages/_shared/` → `packages/shared/` (underscore 제거) ✅ |
| context/docs 언어 | README.md/WORKFLOW.md = 한국어. 나머지 context/, .claude/commands/, docs/channels/ = 영어 ✅ |

---

## Final Directory Layout

```
marketing-studio/
├── .env.production                        # AWS SES 키 설정 완료 (커밋됨, private repo)
├── .env.example                           # ✅ 키 템플릿
├── package.json                           # ✅ root workspace scripts
├── pnpm-workspace.yaml                    # ✅ packages/shared/*, packages/*
├── tsconfig.base.json                     # ✅ strict ES2022, NodeNext
├── README.md                              # ✅ 재작성 완료 (한국어)
├── CLAUDE.md                              # ✅ 재작성 완료 (영어)
│
├── packages/
│   ├── shared/                            # ✅ @marketing-studio/* 내부 libs
│   │   ├── env/                           # ✅ zod-validated .env.production 로더
│   │   ├── types/                         # ✅ Campaign, Artifact, Channel, BrandVoice, UploadResult
│   │   ├── brand/                         # ✅ kvidai + affy 팔레트, getBrand()
│   │   ├── prompt-kit/                    # ✅ email/blog/cardNews 프롬프트 fragments
│   │   ├── render-image/                  # ✅ Sharp 카드뉴스 renderSlide()
│   │   ├── send-email-ses/                # ✅ AWS SESv2 sendEmail() + sendEmailDryRun()
│   │   ├── publish-nodebb/                # ✅ NodeBB Write API /api/v3/topics
│   │   ├── publish-discourse/             # ✅ Discourse /posts.json
│   │   ├── upload-meta/                   # ✅ STUB — Meta App 승인 후 구현
│   │   ├── send-video-kvidai/             # ✅ STUB — @kvidai/cli sdk 완성 후 swap
│   │   └── send-push-kvidai/              # ✅ STUB — kvidai web push 완성 후 swap
│   │
│   ├── email-blast-template/              # ✅ send.ts (--dry-run, --campaign, --to)
│   ├── blog-post-template/                # ✅ publish.ts (--post, --target=nodebb|discourse)
│   ├── cardnews-template/                 # ✅ render.ts + upload.ts (--set, --brand, --platform)
│   ├── video-template/                    # ✅ scaffold — throws immediately
│   └── push-template/                     # ✅ scaffold — throws immediately
│
├── context/                               # ✅ 영어로 작성
│   ├── WORKFLOW-INDEX.md                  # ✅ 채널 상태 표 + 생성 흐름
│   ├── agents/                            # ✅ copywriter, brand-reviewer, upload-validator
│   ├── template/                          # ✅ brief-to-email, brief-to-cardnews
│   └── common/                            # ✅ brand-voice, image-specs
│
├── .claude/commands/                      # ✅ 영어로 작성
│   ├── new-email-blast.md
│   ├── new-blog-post.md
│   ├── new-cardnews.md
│   └── new-campaign.md
│
├── docs/channels/                         # ✅ 영어로 작성
│   ├── ses-aws.md
│   ├── nodebb.md
│   ├── discourse.md
│   ├── meta-graph.md
│   ├── kvidai-video.md
│   └── kvidai-push.md
│
├── .agents/skills/                        # KEEP ✅ grill-me, vision-checker 유지
├── scripts/                               # KEEP ✅ screenshot QA helpers
└── skills-lock.json                       # KEEP ✅
```

---

## Implementation & Test Status

| Package / File | 기능 | Impl | Typecheck | 비고 |
|---|---|---|---|---|
| `pnpm-workspace.yaml` | workspace 정의 | ✅ | ⏭️ | `packages/shared/*`, `packages/*` |
| `package.json` (root) | root scripts | ✅ | ⏭️ | tsx, typescript, vitest devDeps |
| `tsconfig.base.json` | 공통 TS config | ✅ | ⏭️ | ES2022, NodeNext, strict |
| `.env.example` | 키 템플릿 | ✅ | ⏭️ | |
| `shared/env` | zod env 로더 | ✅ | ✅ | findMonorepoRoot() 포함 |
| `shared/types` | 공통 타입 | ✅ | ✅ | Channel, Artifact, EmailBlastInput 등 |
| `shared/brand` | 브랜드 에셋 | ✅ | ✅ | kvidai + affy 팔레트, getBrand() |
| `shared/prompt-kit` | 프롬프트 fragments | ✅ | ✅ | emailPrompts, blogPrompts, cardNewsPrompts |
| `shared/render-image` | Sharp 카드뉴스 렌더 | ✅ | ✅ | renderSlide(), 3가지 포맷 상수 |
| `shared/upload-meta` | Meta Graph API | ✅ | ✅ | STUB — uploadToInstagram/Facebook throw |
| `shared/send-email-ses` | AWS SES v3 | ✅ | ✅ | createSesClient, sendEmail, sendEmailDryRun |
| `shared/publish-nodebb` | NodeBB API | ✅ | ✅ | POST /api/v3/topics, Bearer token |
| `shared/publish-discourse` | Discourse API | ✅ | ✅ | POST /posts.json, Api-Key headers |
| `shared/send-video-kvidai` | STUB | ✅ | ✅ | generateVideo, uploadVideo throw |
| `shared/send-push-kvidai` | STUB | ✅ | ✅ | sendPushNotification throw |
| `email-blast-template` | 이메일 발송 | ✅ | ✅ | --dry-run, --campaign, WORKFLOW.md, 2 prompts |
| `blog-post-template` | 블로그 발행 | ✅ | ✅ | --target=nodebb|discourse, WORKFLOW.md, 2 prompts |
| `cardnews-template` | 카드뉴스 렌더+업로드 | ✅ | ✅ | render.ts + upload.ts, WORKFLOW.md, 2 prompts |
| `video-template` | scaffold only | ✅ | ✅ | throws immediately, README, scene-structure prompt |
| `push-template` | scaffold only | ✅ | ✅ | throws immediately, README |
| `context/WORKFLOW-INDEX.md` | 채널 스위치보드 | ✅ | ⏭️ | 영어 |
| `context/agents/*.md` | agent specs | ✅ | ⏭️ | copywriter, brand-reviewer, upload-validator |
| `context/template/*.md` | 진입 템플릿 | ✅ | ⏭️ | brief-to-email, brief-to-cardnews |
| `context/common/*.md` | 크로스채널 규칙 | ✅ | ⏭️ | brand-voice, image-specs |
| `.claude/commands/*.md` | slash commands | ✅ | ⏭️ | new-email-blast, new-blog-post, new-cardnews, new-campaign |
| `docs/channels/*.md` | 채널 통합 노트 | ✅ | ⏭️ | 6개 파일, 영어 |
| `README.md` | 프로젝트 소개 | ✅ | ⏭️ | 한국어 |
| `CLAUDE.md` | AI agent 가이드 | ✅ | ⏭️ | 영어 |

**전체 typecheck**: `pnpm -r typecheck` — 16개 패키지 전부 통과 ✅

---

## Remaining Tasks

- [x] 워크스페이스 파일 생성: `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.env.example`
- [x] `packages/shared/env` — zod 로더
- [x] `packages/shared/types` — 공통 타입
- [x] `packages/shared/brand` — 브랜드 에셋 registry
- [x] `packages/shared/prompt-kit` — 프롬프트 fragments
- [x] `packages/shared/render-image` — Sharp 카드뉴스 primitives
- [x] `packages/shared/upload-meta` — Meta Graph API wrapper (STUB)
- [x] `packages/shared/send-email-ses` — AWS SES v3 wrapper
- [x] `packages/shared/publish-nodebb` — NodeBB client
- [x] `packages/shared/publish-discourse` — Discourse client
- [x] `packages/shared/send-video-kvidai` — STUB
- [x] `packages/shared/send-push-kvidai` — STUB
- [x] `packages/email-blast-template/` — 풀 파이프라인
- [x] `packages/blog-post-template/` — 풀 파이프라인
- [x] `packages/cardnews-template/` — 풀 파이프라인
- [x] `packages/video-template/` — scaffold + stub import
- [x] `packages/push-template/` — scaffold + stub import
- [x] `context/` 디렉토리 전체 생성 (영어)
- [x] `.claude/commands/*.md` 슬래시 커맨드 4개 (영어)
- [x] `docs/channels/*.md` 6개 (영어)
- [x] `README.md`, `CLAUDE.md` 재작성
- [x] `pnpm install && pnpm -r typecheck` 통과 확인
- [x] `git init` + initial commit (164 files)
- [x] GitHub repo 생성: `epicmobile18/marketing-studio` (private)
- [x] `git push -u origin main`
- [x] 디렉토리 이름 `marketing-automate` → `marketing-studio` 변경

---

## Channel Status (현재)

| 채널 | Render/Send | Upload | 언블로커 |
|------|------------|--------|---------|
| Email (SES) | ✅ 라이브 | — | 없음 |
| Blog (NodeBB) | ✅ 코드 완성 | ✅ 코드 완성 | 인스턴스 배포 필요 |
| Blog (Discourse) | ✅ 코드 완성 | ✅ 코드 완성 | 인스턴스 배포 필요 |
| Card News (렌더) | ✅ 라이브 | STUB | Meta App 승인 |
| Video | STUB | STUB | @kvidai/cli sdk mcp |
| Push | STUB | STUB | kvidai web push SDK |

---

## ENV 파일 구조 계획

현재 `.env.production` 하나에 모두 혼재. 향후 3개로 분리 예정:

| 파일 | 용도 | 주요 키 |
|------|------|---------|
| `kvidai.env.production` | kvid.ai 서비스 키 | `AWS_SES_*`, `KVIDAI_*`, NodeBB/Discourse |
| `affy.env.production` | affy.ink 서비스 키 | Resend 키, affy 관련 설정 |
| `brand.env.production` | 브랜드 에셋 + 소셜 계정 | Meta Page Token, IG Account ID |

---

## Research Log

### Search Keywords
- "kvidai-template packages structure"
- "pnpm-workspace.yaml monorepo shared packages"
- "AWS SES SDK v3 SendEmailCommand"
- "NodeBB Write API v3 topics"
- "Discourse API posts.json"
- "Instagram Graph API media container publish"
- "Facebook Graph API photos feed"

### Additional Q&A (2026-05-09)
- Blog 배포 상태: 계획 중 → placeholder URL로 코드 작성
- Meta Graph API: 앱 없음 → 렌더만, 업로드 stub
- 언어: TypeScript 통일 (Python 없음)
- 브랜드: kvid.ai + affy.ink 멀티. ENV 파일 3개 분리 예정
- `_shared/` → `shared/` (underscore 제거)
- context/commands/docs 파일: 영어로 작성

---

## Decision Log

### 채널별 단위 — 2026-05-09
**Decision**: 혼합 — 채널 템플릿(`*-template/`) + 일회성 campaign package

### kvidai-template 통합 방식 — 2026-05-09
**Decision**: 패턴 복사만 — submodule pin 관리 없이 `in/→src/→outputs/` 패턴만 채택

### 프로젝트명 — 2026-05-09
**Decision**: `marketing-studio` — 각 subproject가 독립 작품이라는 컨셉과 결이 맞음

### shared 폴더 — 2026-05-09
**Decision**: `packages/_shared/` → `packages/shared/` — underscore 없애달라는 사용자 요청 반영

### context 언어 — 2026-05-09
**Decision**: README.md/WORKFLOW.md = 한국어, 나머지 context + commands + docs/channels = 영어 ("사람이 거의 안 읽으니까")

---

## 향후 채널 확장 후보

**High fit**: SMS/KakaoTalk Bizmessage/LINE Official, X(Twitter) API v2, LinkedIn Posts, YouTube Shorts (Data API v3), Threads Graph API, Reddit API, Beehiiv/Buttondown newsletter API, Podcast RSS/Spotify, Telegram Bot API

**Medium fit**: TikTok Content Posting API, Meta/Google 광고 소재 생성, 보도자료

**Low fit (skill로)**: SEO 롱폼 감사, 경쟁사 스크래핑, 랜딩페이지 A/B 변형 생성
