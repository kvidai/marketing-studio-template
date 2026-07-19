# reddit-post-template — Workflow

## 채널 개요

Reddit 공식 OAuth API로 r/KvidAI(또는 임의 서브레딧)에 텍스트·링크·이미지 게시물 발행.
발행마다 `in/{post}/` 폴더 생성 후 `outputs/{post}/reddit-result.json` 저장.

> **현재 상태**: 코드 완성. Reddit script app 발급 후 `.env.production`에 5개 키 추가하면 즉시 사용 가능.

## 빠른 시작

```bash
# 1. 새 포스트 폴더 생성
cp -r in/.example in/my-post-slug

# 2. brief.json + body.md 작성
vi in/my-post-slug/brief.json   # subreddit, kind, title 설정
vi in/my-post-slug/body.md       # self post 본문 (kind=self 시)

# 3. Dry run (API 호출 없음)
pnpm publish-post --post=my-post-slug --dry-run

# 4. 실제 발행
pnpm publish-post --post=my-post-slug

# 5. 서브레딧 임시 오버라이드 (r/test에서 검증)
pnpm publish-post --post=my-post-slug --subreddit=test
```

## 디렉토리 구조

```
reddit-post-template/
├── in/
│   ├── .example/
│   │   ├── brief.json      ← 기본 설정
│   │   └── body.md         ← self post 본문
│   └── {post}/
│       ├── brief.json
│       ├── body.md          ← kind=self 시 필수 (또는 brief.text)
│       └── hero.png         ← kind=image 시 필수
└── outputs/{post}/
    └── reddit-result.json  ← {id, permalink, url, kind, subreddit, timestamp}
```

## Kind별 brief.json 예시

### kind=self (텍스트 게시물)
```json
{
  "subreddit": "KvidAI",
  "kind": "self",
  "title": "포스트 제목",
  "nsfw": false,
  "spoiler": false,
  "sendreplies": true
}
```
→ `body.md` 파일 자동 로드 (없으면 `brief.text` 사용)

### kind=link (링크 게시물)
```json
{
  "subreddit": "KvidAI",
  "kind": "link",
  "title": "포스트 제목",
  "url": "https://kvid.ai/..."
}
```

### kind=image (이미지 게시물)
```json
{
  "subreddit": "KvidAI",
  "kind": "image",
  "title": "포스트 제목",
  "image": "hero.png"
}
```
→ `in/{post}/hero.png` 파일 필요

### kind=video (비디오 — 템플릿 미지원)
템플릿 CLI는 video를 지원하지 않습니다.
`@marketing-studio/publish-reddit`의 `submitVideoPost()`를 직접 호출하세요.

## Phase 1 — 콘텐츠 작성

1. `/new-reddit-post <slug>` 슬래시 커맨드로 폴더 스캐폴드
2. `brief.json`에서 subreddit, kind, title 설정
3. `body.md`에 마크다운 본문 작성 (kind=self)
4. 이미지 파일 준비 (kind=image)

## Phase 2 — 발행

1. `--dry-run`으로 페이로드 확인
2. `--subreddit=test`로 r/test에서 먼저 검증
3. `outputs/{post}/reddit-result.json`에서 게시 URL 확인
4. brief.json의 subreddit을 실제 서브레딧으로 변경 후 재발행

## ENV 요구사항

| 키 | 필수 | 설명 |
|----|------|------|
| `REDDIT_CLIENT_ID` | ✅ | script app의 client_id (앱 이름 아래 14자 코드) |
| `REDDIT_CLIENT_SECRET` | ✅ | script app secret |
| `REDDIT_USERNAME` | ✅ | Reddit 계정 username |
| `REDDIT_PASSWORD` | ✅ | Reddit 계정 password (2FA 미사용 계정만) |
| `REDDIT_USER_AGENT` | ✅ | 예: `marketing-studio/0.1 by u/KvidAIBot` |

발급: https://www.reddit.com/prefs/apps → "create another app" → script 타입 선택

## Anti-spam 주의

- 신규 계정 / 저 카르마 계정은 자동 게시가 shadowban될 수 있음
- 본인 소유 서브레딧(r/KvidAI)은 문제없음
- 외부 서브레딧에 반복 게시 시 모더레이터 차단 주의
