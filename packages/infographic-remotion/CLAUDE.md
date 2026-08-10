# infographic-remotion

Remotion 렌더 패키지. 두 용도:
1. **인포그래픽 클립**(`Infographic`) — 부분 MP4 를 kvid.ai composition 에 삽입.
2. **모션 카드뉴스 family**(예시 `SampleCardNews`) — 포스터형 카드뉴스를 씬별 모션으로 렌더 → `video-template` cardnews 모드가 씬별 클립으로 잘라 composition 에 얹는다.

> **새 카드뉴스 만들기**: `src/sample-cardnews/` 를 복제해 톤/모티프/씬을 **처음부터** 자기 포스터에 맞게 설계한다(기존 family 코드 복붙 금지 — `.claude/rules/video-generation-rules.md`). `Root.tsx` 에 등록 + `render-<family>` CLI 추가. 상세 흐름: `packages/video-template/CLAUDE.md`.
> QR·마스코트 등 포스터 자산은 `public/<family>/` 에 두고 `staticFile` 로 참조(예시는 자산 없이 QR 플레이스홀더).

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
