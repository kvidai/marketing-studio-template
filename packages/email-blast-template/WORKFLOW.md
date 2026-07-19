# email-blast-template — Workflow

## 채널 개요
AWS SES v3 기반 마케팅 이메일 발송. 발송마다 `in/{campaign}/` 폴더를 신규 생성하여 사용.

## 빠른 시작

```bash
# 1. 새 캠페인 폴더 생성
cp -r in/.example in/my-campaign-slug

# 2. brief.json 작성 (제목, 수신자 등)
vi in/my-campaign-slug/brief.json

# 3. AI로 이메일 본문 생성 → body.html + body.txt 작성
# (prompts/body-copy.md 프롬프트 참고)

# 4. 드라이런으로 미리보기
pnpm send --campaign=my-campaign-slug --dry-run

# 5. 관리자 계정으로 테스트 발송
pnpm send --campaign=my-campaign-slug --to=admin@example.com

# 6. 실 발송 (brief.json의 recipients 기준)
pnpm send --campaign=my-campaign-slug
```

## 디렉토리 구조

```
email-blast-template/
├── in/
│   ├── .example/           # 예제 — cp해서 사용
│   │   ├── brief.json
│   │   ├── body.html
│   │   └── body.txt
│   └── {campaign}/         # 실제 캠페인 (gitignore 권장)
├── outputs/{campaign}/
│   └── send-log.json       # 발송 완료 후 생성
├── prompts/
│   ├── subject-line.md     # 제목 생성 프롬프트
│   └── body-copy.md        # 본문 생성 프롬프트
├── src/send.ts
└── WORKFLOW.md
```

## Phase 1 — 콘텐츠 기획

1. 발송 목적, 타겟 독자, CTA 정의
2. `prompts/subject-line.md` 프롬프트 → Claude에게 제목 5안 생성 요청
3. `prompts/body-copy.md` 프롬프트 → Claude에게 본문 초안 생성 요청
4. 생성된 카피를 `in/{campaign}/body.html`과 `body.txt`에 저장

## Phase 2 — 검토 & 발송

1. 드라이런으로 레이아웃 확인: `pnpm send --campaign=xxx --dry-run`
2. 테스트 발송: `pnpm send --campaign=xxx --to=your@email.com`
3. 확인 후 실 발송: `pnpm send --campaign=xxx`
4. `outputs/{campaign}/send-log.json`에서 MessageId 확인

## ENV 요구사항

`.env.production` 기준:

| 키 | 필수 | 설명 |
|----|------|------|
| `AWS_SES_KEY` | ✅ | AWS Access Key |
| `AWS_SES_SECRET` | ✅ | AWS Secret Key |
| `AWS_SES_REGION` | ✅ | `us-east-1` |
| `KVIDAI_AWS_SEND_EMAIL_MARKETING` | ✅ | 발신 이메일 |
| `KVIDAI_ADMIN_EMAIL` | ✅ | 기본 테스트 수신자 |
