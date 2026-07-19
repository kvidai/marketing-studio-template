# cardnews-template — Workflow

## 채널 개요

카드뉴스 이미지 렌더 → Instagram/Facebook 업로드 (Meta Graph API).

> **현재 상태**:
> - **렌더**: 완전 구현 (satori / puppeteer 선택 가능, 로컬 실행 가능)
> - **업로드**: STUB (Meta App 승인 후 구현 예정)

---

## 배경 이미지 전략

> 공통 원칙: `context/common/image-design.md`

배경 경로를 지정하지 않으면 코드 생성 다크 그라디언트가 fallback으로 사용된다.

### brief.json에 배경 경로 지정

```json
{
  "slides": [
    { "layout": "title",   "headline": "메인 타이틀", "backgroundImage": "assets/backgrounds/bg-title.png" },
    { "layout": "content", "headline": "헤드라인",    "backgroundImage": "assets/backgrounds/bg-content.png" },
    { "layout": "closing", "headline": "CTA 문구",    "backgroundImage": "assets/backgrounds/bg-closing.png" }
  ]
}
```

---

## 빠른 시작

```bash
# Campaign 모드 (권장)
pnpm --filter cardnews-template render -- \
  --campaign=my-campaign-slug \
  --brand=kvidai \
  --lang=ko \
  --renderer=html        # html (puppeteer) 또는 satori

# Standalone 모드
pnpm --filter cardnews-template render -- \
  --set=my-set-slug \
  --brand=kvidai
```

### 렌더러 선택

| 옵션 | 장점 | 단점 |
|------|------|------|
| `--renderer=html` (권장) | 브라우저와 동일 렌더링, CSS 그대로 사용, 디버깅 쉬움 | Chrome 필요 |
| `--renderer=satori` | Chrome 불필요, 빠름 | CSS 지원 제한적, 폰트 fallback 복잡 |

---

## 디렉토리 구조

```
campaigns/{slug}/
├── brief.json               ← 슬라이드 내용
├── cardnews.json            ← 카드뉴스 오버라이드 (선택)
├── cardnews.en.json         ← 영문 버전 (선택)
├── assets/
│   └── backgrounds/         ← 외부 디자인 툴에서 export한 배경 PNG
│       ├── bg-title.png
│       ├── bg-content.png
│       └── bg-closing.png
└── out/
    ├── cardnews/ko/         ← satori 렌더 결과
    └── cardnews-html/ko/    ← puppeteer 렌더 결과
```

---

## brief.json 구조

```json
{
  "title": "카드뉴스 제목",
  "brand": "kvidai",
  "format": "square",
  "slides": [
    {
      "layout": "title",
      "headline": "메인 타이틀",
      "body": "서브타이틀 (선택)",
      "backgroundImage": "assets/backgrounds/bg-title.png"
    },
    {
      "layout": "content",
      "headline": "헤드라인",
      "body": "본문 내용",
      "backgroundImage": "assets/backgrounds/bg-content.png"
    },
    {
      "layout": "closing",
      "headline": "CTA 문구",
      "backgroundImage": "assets/backgrounds/bg-closing.png"
    }
  ],
  "caption": "Instagram 캡션",
  "hashtags": ["#kvid", "#AI마케팅"]
}
```

## 슬라이드 레이아웃

| layout | 용도 | 권장 슬라이드 |
|--------|------|--------------|
| `title` | 표지 | 1번 슬라이드 |
| `content` | 본문 내용 | 2번 ~ N-1번 |
| `closing` | 마무리/CTA | 마지막 슬라이드 |

## ENV 요구사항

| 키 | 필수 | 설명 |
|----|------|------|
| 렌더: 없음 | — | ENV 불필요 |
| `META_PAGE_ACCESS_TOKEN` | 업로드 시 ✅ | Long-lived Page Token |
| `META_PAGE_ID` | 업로드 시 ✅ | Facebook Page ID |
| `META_IG_ACCOUNT_ID` | Instagram 업로드 시 ✅ | IG Professional Account ID |
