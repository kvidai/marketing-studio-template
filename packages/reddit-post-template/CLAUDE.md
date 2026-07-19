# reddit-post-template

Reddit 채널 게시 패키지. `@marketing-studio/publish-reddit` 어댑터를 호출하는 CLI 템플릿.

## Entry Point

`src/publish.ts` — `pnpm publish-post` 실행 시 진입점.

Args:
- `--post=<slug>` — `in/<slug>/` 폴더 지정 (기본값: `.example`)
- `--dry-run` — API 호출 없이 페이로드 출력
- `--subreddit=<name>` — brief.json의 subreddit 오버라이드

## 주요 흐름

1. `loadEnv()` + `parseEnv()` — 5개 REDDIT_* 키 검증
2. `in/<slug>/brief.json` 로드
3. kind=self면 `in/<slug>/body.md` 자동 로드
4. dry-run이면 콘솔 출력 후 종료
5. `getAccessToken()` → kind별 `submit*Post()` 호출
6. `outputs/<slug>/reddit-result.json` 저장

## ENV 요구사항

```
REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT
```
모두 optional (미설정 시 한글 에러 출력 후 종료).

## 명령어

```bash
pnpm publish-post --post=.example --dry-run
pnpm publish-post --post=my-slug --subreddit=test
pnpm publish-post --post=my-slug
pnpm typecheck
```

## 지원하지 않는 것

- `kind=video` — 에러 메시지로 shared lib 직접 호출 안내
- 갤러리(복수 이미지) — Reddit API 별도 엔드포인트 필요
