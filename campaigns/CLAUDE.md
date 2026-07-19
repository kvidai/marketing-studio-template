# campaigns/ — Multi-Channel Campaign Content

각 캠페인은 하나의 디렉토리 안에 **공통 콘텐츠 원본 + 채널별 오버라이드**를 함께 보관한다.

## 디렉토리 구조

```
campaigns/
└── {slug}/
    ├── brief.json       # 공통: title, tags, images
    ├── body.md          # 공통 본문 (블로그·레딧 self·이메일 fallback)
    ├── assets/          # 이미지·영상 원본
    ├── email.json       # 이메일 전용 (subject, previewText, fromName, recipients)
    ├── blog.json        # 블로그 전용 (target, category, tags)
    ├── reddit.json      # 레딧 전용 (subreddit, kind, flair, nsfw)
    └── cardnews.json    # 카드뉴스 전용 (brand, format, slides, caption, hashtags)
```

## 머지 규칙

각 채널 CLI가 `{ ...brief.json, ...{channel}.json }` 으로 머지한다. 채널 오버라이드가 공통값보다 우선.

## 채널 CLI가 campaigns/ 를 읽는 조건

- `--campaign=<slug>` 플래그 사용 시
- Email: `--campaign=<slug>` 전달 + `campaigns/{slug}/brief.json` 존재 시 자동 적용 (없으면 `in/{slug}/`로 폴백)

## 발행 명령어

```bash
pnpm --filter email-blast-template send -- --campaign=<slug> --dry-run
pnpm --filter blog-post-template publish-post -- --campaign=<slug> --target=nodebb
pnpm --filter reddit-post-template publish-post -- --campaign=<slug> --dry-run
pnpm --filter cardnews-template render -- --campaign=<slug>
pnpm --filter cardnews-template upload -- --campaign=<slug> --platform=instagram
```

## 신규 캠페인 생성

```bash
/new-campaign <slug>   # campaigns/<slug>/ 스캐폴드 생성
```
