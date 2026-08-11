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

## 시작하기 — 클론에서 에디터 영상까지 (전체 시나리오)

이 저장소를 클론한 사용자가 자기 포스터/자료로 **kvid.ai 에디터에 카드뉴스 영상**을 만들기까지의 전 과정.

### 사전 준비 (1회)
- **kvid.ai 계정 + API 키** — https://app.kvid.ai/settings 에서 발급, 크레딧 확인
- macOS 또는 Linux + 터미널

### 1단계 — 내 저장소로 받기 (둘 중 택1)
- **권장 — "Use this template"**: GitHub 저장소 상단 초록 **"Use this template"** 버튼 → 내 계정에 **독립 repo** 생성. 우리 repo 는 못 건드리고(권한상 안전), 내 작업은 내 repo 에 push. 이후 프레임워크 업데이트는 아래 [업데이트](#업데이트--최신-유지) 참고.
  ```bash
  git clone https://github.com/<나>/<내-repo> marketing-studio && cd marketing-studio
  ```
- **간단 — 그냥 clone**: 우리 repo 를 직접 clone (개인 실험용). push 는 권한상 안 됨.
  ```bash
  git clone https://github.com/kvidai/marketing-studio-template marketing-studio && cd marketing-studio
  ```

### 2단계 — 설치 (둘 중 택1, 결과 동일)
- **사람이 수동으로**: `docs/SETUP.md` 를 따라 Node 22 · pnpm 10 · ffmpeg · poppler(PDF 자료용) · `pnpm install` · kvid CLI 설치
  ```bash
  curl https://cli.kvid.ai/install -fsS | bash   # kvid CLI (영상 채널 필수)
  pnpm install
  ```
- **Claude Code(에이전트)에게**: 이 폴더에서 Claude Code 를 열고 **"`docs/SETUP.md` 보고 설치해줘"** → 에이전트가 같은 문서로 설치

### 3단계 — 키 설정 (셋 중 택1, 제일 쉬운 걸로)
- **A. 원클릭(권장)**: `pnpm setup` → 키/이메일 물어보면 붙여넣기. `.env.production` 자동 생성·기입
  ```bash
  pnpm setup                                   # 대화형
  # 또는 pnpm setup --api-key <KEY> --email <EMAIL>   # 한 줄로
  ```
- **B. Claude Code 에게**: "내 kvid 키 `<KEY>`, 이메일 `<EMAIL>` 로 설정해줘" → 에이전트가 `.env.production` 작성
- **C. 수동**: `cp .env.example .env.production` 후 `KVIDAI_API_KEY` / `KVIDAI_USER_EMAIL` 입력

> `.env.production` 은 **실제 키**라 gitignore 됨 — **커밋되지 않는다**(각자 로컬에만). `KVIDAI_BASE_URL` 은 선택(기본 api.kvid.ai).
> 영상 3가지 모드가 전부 **`kvid` CLI 만으로 동작**한다 — 별도 설치 불필요:
> - **agent (기본)**: 압축 브리프 + 첨부만 주면 kvid.ai 에이전트가 대본·씬·미디어·조립까지 자동
> - **direct (확장)**: 씬을 정확히 지정해 composition 직접 조립
> - **cardnews (확장)**: Remotion 모션 카드뉴스를 씬별 클립으로 잘라 composition
> (`kvidai-video-use` 같은 별도 대화형 편집 스킬을 쓸 때만 `apm install --target codex`)

### 4단계 — (선택) 설치 검증: 예시 파이프라인 먼저 돌려보기
```bash
# 예시 카드뉴스 무음 마스터 렌더 (첫 실행 시 chromium 자동 다운로드)
pnpm --filter infographic-remotion render-sample -- --campaign=.example --name=cardnews-silent

# campaigns/.example/video.cardnews.json 을 video.json 으로 복사한 뒤:
pnpm --filter video-template generate -- --campaign=.example
# → 출력된 kvid.ai/en/editor/<id> 로 샘플 카드뉴스가 뜨면 설치 정상
```

### 5단계 — 실제 영상 만들기 (대화형, 권장)
1. 포스터·브랜드 자료를 `references/` 또는 `campaigns/<slug>/` 에 넣는다
2. Claude Code 에 **"이 포스터로 카드뉴스 영상 만들어줘"** (`/new-video`)
3. 에이전트가 자동으로:
   - 포스터 분석 → `<family>-cardnews.json`(씬 콘텐츠) 작성
   - `src/sample-cardnews/` 를 복제해 **자기 포스터용 family 를 처음부터 설계**(톤·모티프·QR) — 기존 family 코드 복붙 금지(`.claude/rules/video-generation-rules.md`)
   - 무음 마스터 렌더 → **cardnews 모드**(씬 분할 → 업로드 → composition) → **에디터 URL**
   - (원하면) 나레이션: 대본 → `kvid voice`(TTS) → 리드인 무음 패딩 → 씬별 오디오 트랙
4. **kvid.ai 에디터**에서 씬 순서·길이·자막 편집 후 export

### 그 외 채널
정적 카드뉴스(인스타)·이메일·블로그·레딧은 각각 `/new-cardnews` · `/new-email-blast` · `/new-blog-post` · `/new-reddit-post` (각 채널 키 필요).

상세 문서: `packages/video-template/CLAUDE.md`(cardnews 모드·나레이션), `.claude/skills/new-video/SKILL.md`, `docs/channels/kvid-composition-guide.md`.

---

## 업데이트 — 최신 유지

우리가 레시피/CLI/스킬을 개선하면, **내 작업(campaigns·references·presets)은 그대로 두고** 프레임워크만 최신으로 받을 수 있다.

```bash
pnpm doctor        # 원클릭 전체 최신화: 프레임워크 + kvid CLI + 플랫폼 스킬
# 또는 부분만:
pnpm run upgrade   # 프레임워크(레시피/규칙/코드)만 upstream 최신으로  (campaigns/references/presets 는 안 건드림)
kvid update        # kvid CLI 만
```

- **왜 안전한가**: 프레임워크(`.claude/` `packages/` `scripts/` 등)와 내 콘텐츠(`campaigns/` `references/` `presets/`)가 **다른 폴더**라, `pnpm run upgrade` 는 프레임워크 폴더만 upstream 최신으로 덮어쓴다. 내 콘텐츠·`README.md`·`.env.production` 은 건드리지 않는다.
- **영상 실행 시** kvid CLI 가 최소 버전 미만이면 자동으로 "`kvid update` 하세요" 안내와 함께 멈춘다(과거버전 조용한 오류 방지). 계약: `.claude/rules/upstream-cli-contract.md`.
- `pnpm run upgrade` 후 `pnpm install` 한 번(의존성 바뀌었을 수 있음) → 확인하고 커밋.

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

> **영상 / 모션 카드뉴스**는 위 [시작하기 시나리오](#시작하기--클론에서-에디터-영상까지-전체-시나리오) 참고 (kvid CLI 설치 → 샘플 검증 → `/new-video`).

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
packages/shared/              # @marketing-studio/* internal libraries (send-video-kvidai 포함)
packages/email-blast-template/
packages/blog-post-template/
packages/cardnews-template/   # 정적 이미지 카드뉴스 (Sharp)
packages/infographic-remotion/# Remotion 렌더 — Infographic + SampleCardNews(모션 카드뉴스 예시)
packages/video-template/      # kvid.ai 영상 채널 (agent/direct/cardnews) — kvid CLI 위임
packages/push-template/       # scaffold only
context/                      # AI agent specs, brief templates, brand rules
docs/channels/                # per-channel integration guides
docs/SETUP.md                 # 설치 가이드 (사람 수동 / 에이전트 공용)
```

---

## Environment Variables

Copy `.env.example` to `.env.production` or `.env.{brandname}` and fill in your keys.

See `.env.example` `.env.{examplebrand}` for all available variables.

---

## AI Agent Guide

See `CLAUDE.md`.
