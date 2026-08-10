# marketing-studio — 재현 실행 가이드

다른 PC에서 전체 환경을 동일하게 재현하기 위한 단계별 가이드.

---

## 1. 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
|------|----------|---------|
| **Node.js** | 22.x | `node --version` |
| **pnpm** | 10.x | `pnpm --version` |
| **Python** | 3.11+ | `python3 --version` |
| **ffmpeg** | 최신 | `ffmpeg -version` |
| **kvid CLI** | 0.8.0+ | `kvid --version` |

### Node.js 설치 (nvm 권장)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 22
nvm use 22
```

### pnpm 설치
```bash
npm install -g pnpm@10
```

### ffmpeg 설치 (카드뉴스 씬 클립 분할·음성 합성)
```bash
# macOS: brew install ffmpeg   /   Ubuntu: sudo apt-get install -y ffmpeg
```

### kvid CLI 설치 (영상 채널 — kvid.ai 업로드·프로젝트·TTS)
```bash
curl https://cli.kvid.ai/install -fsS | bash    # kvidai + kvid alias
kvid setup                                        # 또는 KVIDAI_API_KEY 환경변수
```
영상 파이프라인(video-template)은 `kvid` CLI 로 업로드·프로젝트 생성·composition 교체·TTS·agent 생성을 모두 수행한다. `kvid --version` 이 나와야 한다(v0.9.0+).

> **영상 3모드(agent[기본]·direct·cardnews) 전부 `kvid` CLI 만으로 동작** — APM 스킬 불필요.
> `kvidai-video-use`(대화형 영상 편집) 등 별도 스킬을 쓸 때만 `apm install --target codex`.

### (참고) 첫 카드뉴스/인포그래픽 렌더
`infographic-remotion` 첫 렌더 시 **Remotion 이 chromium headless shell 을 자동 다운로드**한다(수백 MB, 최초 1회만 느림).

---

## 2. 저장소 클론 및 Node 패키지 설치

```bash
git clone <repo-url> marketing-studio
cd marketing-studio

# 전체 모노레포 의존성 설치 (workspace 링크 포함)
pnpm install
```

`pnpm-workspace.yaml` 기준으로 `packages/shared/*`, `packages/*`, `campaigns/*` 전체가 한 번에 설치된다.

---

## 3. 환경 변수 설정

`.env.production` 파일을 루트에 생성한다. `.env.example`을 템플릿으로 사용:

```bash
cp .env.example .env.production
# 편집기로 실제 값 입력
```

### 필수 키 (SES 발송에 필요)
```env
AWS_SES_REGION=ap-northeast-2
AWS_SES_KEY=<IAM Access Key ID>
AWS_SES_SECRET=<IAM Secret Access Key>
KVIDAI_AWS_SEND_EMAIL_MARKETING=marketing@kvid.ai
KVIDAI_AWS_SEND_EMAIL_TRANSACTIONAL=no-reply@kvid.ai
KVIDAI_ADMIN_EMAIL=admin@kvid.ai
KVIDAI_SELF_URL=https://console.kvid.ai
```

### AI 도구 키 (콘텐츠 생성에 필요)
```env
KVIDAI_API_KEY=<key>
...
```

### Reddit 배포 키 (선택)
```env
REDDIT_CLIENT_ID=<14자 ID>
REDDIT_CLIENT_SECRET=<secret>
REDDIT_USERNAME=<username>
REDDIT_PASSWORD=<password>
REDDIT_USER_AGENT=marketing-studio/0.1 by u/<username>
```

### S3 에셋 업로드 키 (선택 — body.md 이미지 자동 업로드)
```env
AWS_S3_BUCKET=<버킷명>
AWS_S3_CDN_BASE=https://cdn.kvid.ai
```

### API 연결 테스트
```bash
npx tsx scripts/test-api-connections.ts
# Replicate / Deepgram / ElevenLabs 순서로 연결 확인
```

---

## 4. Python 가상환경 설정 (썸네일 생성용)

Python 스크립트는 캠페인별 `scripts/` 디렉토리에 있다.

```bash
cd campaigns/20260512-newspanda-iran-war/scripts

# 가상환경 생성 및 활성화
python3 -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# 의존성 설치
pip install -r requirements.txt

# 설치 확인
python3 -c "from PIL import Image; import replicate; print('OK')"
```

`requirements.txt` 내용:
```
Pillow>=10.0.0
replicate>=0.20.0
python-dotenv>=1.0.0
requests>=2.31.0
```

---

## 5. 타입 체크

```bash
pnpm -r typecheck
# 전체 패키지 TypeScript 타입 오류 확인
```

---

## 6. 캠페인 채널별 발행 명령

### 공통 패턴
```bash
pnpm --filter <template> <script> -- --campaign=<slug> [--lang=ko|en|th] [--dry-run]
```

`--dry-run` 플래그는 실제 API 호출 없이 페이로드만 출력한다.

### 이메일 (SES live)
```bash
# 미리보기
pnpm --filter email-blast-template send -- --campaign=20260512-newspanda-iran-war --dry-run

# 실제 발송 (KO 기본)
pnpm --filter email-blast-template send -- --campaign=20260512-newspanda-iran-war
```

### 카드뉴스 렌더 (Sharp, 의존성 없음)
```bash
# 3언어 렌더 (outputs/20260512-newspanda-iran-war/{ko,en,th}/)
pnpm --filter cardnews-template render -- --campaign=20260512-newspanda-iran-war --brand=kvidai --lang=ko
pnpm --filter cardnews-template render -- --campaign=20260512-newspanda-iran-war --brand=kvidai --lang=en
pnpm --filter cardnews-template render -- --campaign=20260512-newspanda-iran-war --brand=kvidai --lang=th
```

### 블로그 (NodeBB/Discourse 인스턴스 필요)
```bash
pnpm --filter blog-post-template publish-post -- --campaign=20260512-newspanda-iran-war --target=nodebb --dry-run
pnpm --filter blog-post-template publish-post -- --campaign=20260512-newspanda-iran-war --target=nodebb
```

### Reddit (REDDIT_* 키 필요)
```bash
# KO — r/NewsPanda 링크 게시
pnpm --filter reddit-post-template publish-post -- --campaign=20260512-newspanda-iran-war --dry-run
pnpm --filter reddit-post-template publish-post -- --campaign=20260512-newspanda-iran-war

# EN — r/MachineLearning self 게시
pnpm --filter reddit-post-template publish-post -- --post=20260512-newspanda-iran-war.en --dry-run
```

### Push (SDK STUB — dry-run까지만 가능)
```bash
pnpm --filter push-template send -- --campaign=20260512-newspanda-iran-war --lang=ko --dry-run
pnpm --filter push-template send -- --campaign=20260512-newspanda-iran-war --lang=en --dry-run
pnpm --filter push-template send -- --campaign=20260512-newspanda-iran-war --lang=th --dry-run
```

---

## 7. 영상 제작 워크플로우

kvidai 기반 — 로컬 렌더링 파이프라인 없음. 자세한 내용은
[`docs/channels/kvidai-video.md`](channels/kvidai-video.md) 참고.

```bash
# packages/video-template/prompts/{video-name}/ 에 brief.md, script.md, visuals.md 작성 후:
pnpm --filter video-template generate -- --project=prompts/{video-name} --output=outputs/{video-name}.mp4
```

kvidai가 project를 만들고 AI 에이전트가 스트리밍으로 영상을 생성하며, 완료되면
`https://kvid.ai/en/editor/{projectId}` 편집 URL을 출력한다. 렌더링은 kvidai
서버에서 처리되므로 로컬에 별도 렌더링 도구가 필요 없다.

예시(이미 kvidai로 생성된 결과물): `campaigns/20260525-semiconductor/shorts/*/kvidai-result.json`

---

## 8. 결과물 위치 요약

| 산출물 | 경로 |
|--------|------|
| 카드뉴스 PNG | `campaigns/<slug>/out/cardnews/{ko,en,th}/slide-*.jpg` |
| 이메일 발송 로그 | `campaigns/<slug>/out/email/send-log.json` |
| 블로그 결과 | `campaigns/<slug>/out/blog/{nodebb,discourse}-result.json` |
| Reddit 결과 | `campaigns/<slug>/out/reddit/reddit-result.json` |
| 영상 생성 결과 | kvidai 서버 렌더링 — `kvidai-result.json`에 project URL 기록, 파일은 로컬에 없음 |
| 중간 작업물 | `campaigns/<slug>/work/` (gitignored) |

---

## 9. 트러블슈팅

### `ERR_REQUIRE_ESM` / top-level await
모든 스크립트는 `tsx` 런타임으로 실행. `package.json` scripts에 `tsx src/xxx.ts` 형태로 등록되어 있어 `pnpm run` 으로 실행하면 자동 처리됨.

### Thai 텍스트 줄바꿈 깨짐
`packages/shared/render-image/src/index.ts`의 `wrapText`가 `\n`을 처리한다. 줄 너비는 28자 기준 (ASCII 환산). Thai 텍스트는 한 줄당 15-20 Thai 음절 이하로 유지 권장.

### pnpm install 후 workspace 링크 깨짐
`pnpm install --force` 로 재설치.
