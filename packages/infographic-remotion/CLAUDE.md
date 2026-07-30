# infographic-remotion

Remotion **인포그래픽 클립 전용** 패키지. 부분 MP4 만 렌더해 kvid.ai composition 에 삽입한다 (통짜 완성영상 금지 — 그건 kvid.ai 에디터 담당).

## Entry points
- `src/index.ts` — registerRoot
- `src/Root.tsx` — `<Composition id="Infographic">` 등록 + `calculateMetadata` 로 props 의 width/height/fps/durationSec 반영
- `src/Infographic.tsx` — 컴포넌트 (제목 + spring 애니메이션 가로 바)
- `src/schema.ts` — zod 입력 스키마 + defaultProps
- `src/render.ts` — headless 렌더 CLI (`@remotion/bundler` + `@remotion/renderer`)

## Commands
```bash
pnpm --filter infographic-remotion render -- --in=<json> --out=<mp4>
pnpm --filter infographic-remotion render -- --campaign=<slug> [--name=infographic-01]
pnpm --filter infographic-remotion studio        # 디자인 미리보기
pnpm --filter infographic-remotion typecheck
```

## 입력 스키마 (schema.ts)
`{ title, subtitle?, items:[{label,value,unit?}](1~6), accentColor, bgColor, textColor, width=1080, height=1920, fps=30, durationSec=6 }`
- 색은 /new-video 가 `@marketing-studio/brand` 에서 주입 (여기 하드코드 금지).

## 파이프라인 내 위치
`/new-video` 4단계 → 이 패키지로 `campaigns/<slug>/assets/infographic-*.mp4` 렌더 → kvidai-media 업로드 → add_asset 삽입.

## 주의
- Remotion 4.0.382 / React 19 (락파일 기존 버전 고정 — 새 버전 추가 금지).
- 첫 렌더 시 chromium headless shell 자동 다운로드.
- `tsconfig` 는 `moduleResolution: Bundler` (base 의 NodeNext 오버라이드 — 확장자 없는 import 허용).
