# blog-post-template — Workflow

## 채널 개요
NodeBB / Discourse REST API로 블로그/포럼 글 발행. 발행마다 `in/{post}/` 폴더 생성.

> **현재 상태**: NodeBB/Discourse 인스턴스 미배포. 인스턴스 준비 후 `.env.production`에 URL + API키 추가 필요.

## 빠른 시작

```bash
# 1. 새 포스트 폴더 생성
cp -r in/.example in/my-post-slug

# 2. brief.json + content.md 작성
vi in/my-post-slug/brief.json
vi in/my-post-slug/content.md

# 3. NodeBB 발행
pnpm publish-post --post=my-post-slug --target=nodebb

# 4. Discourse 발행
pnpm publish-post --post=my-post-slug --target=discourse
```

## 디렉토리 구조

```
blog-post-template/
├── in/
│   ├── .example/
│   │   ├── brief.json
│   │   └── content.md
│   └── {post}/
├── outputs/{post}/
│   ├── nodebb-result.json
│   └── discourse-result.json
├── prompts/
│   ├── outline.md
│   └── section-writer.md
└── WORKFLOW.md
```

## Phase 1 — 콘텐츠 작성

1. `prompts/outline.md` → Claude에게 아웃라인 생성 요청
2. `prompts/section-writer.md` → 섹션별 내용 생성
3. 완성된 마크다운을 `in/{post}/content.md`에 저장

## Phase 2 — 발행

1. `in/{post}/brief.json` 설정 (title, category, tags, target)
2. 발행: `pnpm publish-post --post=xxx --target=nodebb`
3. `outputs/{post}/nodebb-result.json`에서 URL 확인

## ENV 요구사항

| 키 | 필수 | 설명 |
|----|------|------|
| `NODEBB_BASE_URL` | NodeBB 시 ✅ | 인스턴스 URL |
| `NODEBB_TOKEN` | NodeBB 시 ✅ | Bearer Token |
| `DISCOURSE_BASE_URL` | Discourse 시 ✅ | 인스턴스 URL |
| `DISCOURSE_API_KEY` | Discourse 시 ✅ | API Key |
| `DISCOURSE_API_USERNAME` | Discourse 시 ✅ | API Username |
