# Image Design Guidelines

이미지를 생성하는 모든 채널(카드뉴스, 썸네일, 블로그 커버 등)에 공통 적용되는 설계 원칙.

## 배경 이미지 전략

배경은 외부 디자인 툴에서 만들어오는 것을 권장한다.

코드 생성 배경(SVG gradient, CSS)도 동작하지만(code기반 디자인은 반복 수정이 어렵고 결과 예측이 불가능하다), 외부 디자인 툴로 만든 배경은 퀄리티가 일정하고 반복 수정이 쉬우며 결과 예측이 가능하다. 빠른 프로토타이핑이나 텍스트 전용 슬라이드에는 코드 생성 배경을 그대로 써도 무방하다.

### 권장 워크플로우

```
[Figma / Canva / Photoshop]
    ↓ 배경 템플릿 디자인
    ↓ PNG export (채널별 해상도 → context/common/image-specs.md 참고)
    ↓
campaigns/{slug}/assets/backgrounds/
    bg-title.png     ← 표지용
    bg-content.png   ← 본문용
    bg-closing.png   ← 마무리용
    ↓
render → 배경 위에 텍스트/데이터 오버레이
```

### 배경 재사용 패턴

동일 배경 템플릿을 여러 캠페인에서 재사용하는 경우 브랜드 공용 폴더에 두고 경로로 참조한다.

```
campaigns/
├── _assets/                    ← 브랜드 공용 배경 (선택)
│   └── backgrounds/
│       ├── kvidai-bg-title.png
│       └── kvidai-bg-content.png
└── {slug}/
    └── assets/backgrounds/     ← 캠페인 전용 배경 (선택)
```

### 배경 미지정 시 fallback

배경 경로를 지정하지 않으면 각 렌더러의 코드 생성 배경(다크 그라디언트)이 자동으로 사용된다.

## 텍스트 오버레이 원칙

- 텍스트가 올라올 영역은 배경 디자인 단계에서 충분한 색 대비 확보
- 헤드라인 contrast ratio ≥ 4.5:1 (WCAG AA)
- 폰트: KO/EN → Pretendard, TH → NotoSansThai (렌더러가 자동 처리)

## 채널별 렌더러

| 채널 | 렌더러 | 배경 지원 |
|------|--------|---------|
| 카드뉴스 | satori / puppeteer (`--renderer=`) | `backgroundImage` 필드 |
| 썸네일 | Python + Pillow | `backgroundImage` 필드 |
| 블로그 커버 | (미구현) | — |
