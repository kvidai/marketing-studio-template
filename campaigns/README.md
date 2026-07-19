# campaigns/

각 캠페인은 하나의 폴더. 콘텐츠 원본 1개 → 채널별 자동 배포.

## 폴더 네이밍

```
20260511-launch-kvidai/     # 날짜-설명 (권장)
q2-product-update/          # 분기-주제
weekly-digest-2026-20/      # 반복 시리즈
```

> ASCII kebab-case만 사용. 한글·공백·특수문자 금지 (CLI 인자로 그대로 쓰임).

## 폴더 구조

```
campaigns/{slug}/
├── brief.json      ← 공통: title, tags, images
├── body.md         ← 공통 본문 (블로그·레딧·이메일 fallback)
├── assets/         ← 이미지·영상 원본
├── email.json      ← 이메일 전용: subject, previewText, fromName, recipients
├── blog.json       ← 블로그 전용: target, category, tags
├── reddit.json     ← 레딧 전용: subreddit, kind, flair, nsfw
└── cardnews.json   ← 카드뉴스 전용: brand, format, slides, caption, hashtags
```

## 사용 패턴

### 1단계 — 스캐폴드

```bash
/new-campaign 20260511-launch-kvidai
```

### 2단계 — 콘텐츠 작성

```
campaigns/20260511-launch-kvidai/brief.json   ← 제목·태그
campaigns/20260511-launch-kvidai/body.md      ← 본문
campaigns/20260511-launch-kvidai/email.json   ← 이메일 제목·수신자
campaigns/20260511-launch-kvidai/reddit.json  ← 서브레딧·종류
campaigns/20260511-launch-kvidai/cardnews.json ← 슬라이드 정의
```

### 3단계 — 채널별 발행

```bash
# 이메일
pnpm --filter email-blast-template send -- --campaign=20260511-launch-kvidai --dry-run
pnpm --filter email-blast-template send -- --campaign=20260511-launch-kvidai

# 블로그
pnpm --filter blog-post-template publish-post -- --campaign=20260511-launch-kvidai --target=nodebb

# 레딧
pnpm --filter reddit-post-template publish-post -- --campaign=20260511-launch-kvidai --dry-run
pnpm --filter reddit-post-template publish-post -- --campaign=20260511-launch-kvidai

# 카드뉴스
pnpm --filter cardnews-template render -- --campaign=20260511-launch-kvidai
pnpm --filter cardnews-template upload -- --campaign=20260511-launch-kvidai --platform=instagram
```

결과물은 각 패키지의 `outputs/20260511-launch-kvidai/` 에 저장됨.

## 머지 규칙

`{ ...brief.json, ...{channel}.json }` — 채널 오버라이드가 우선.

예: `brief.json`의 `tags`를 `blog.json`에서 재정의하면 blog 채널에만 적용.

## 단일 채널만 쓸 때

특정 채널 파일이 없어도 OK — 없는 채널은 그냥 실행 안 하면 됨.
블로그 없이 이메일+레딧만 쓰는 캠페인이면 `blog.json` 만들 필요 없음.

---

- .example/
- 20260511-kvidai-launch/
- 20260525-semiconductor/ — video shorts via kvidai (see docs/channels/kvidai-video.md)
