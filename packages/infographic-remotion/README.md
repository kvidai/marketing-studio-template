# infographic-remotion

## Features
- 데이터 인포그래픽(제목 + 애니메이션 바차트) → MP4 클립 렌더 — ✅ done
- headless 렌더 (studio 불필요) — ✅ done
- 다양한 차트 타입(라인/도넛 등) — 📋 planned

## Status
Remotion **인포그래픽 클립 전용** 패키지. 통짜 완성영상 아님 — 부분 MP4 만 렌더해 kvid.ai composition 에 삽입.

## 사용
```bash
# 명시적 입출력
pnpm --filter infographic-remotion render -- --in=in/.example/infographic.json --out=/tmp/ig.mp4

# 캠페인 편의 (campaigns/<slug>/infographic.json → campaigns/<slug>/assets/<name>.mp4)
pnpm --filter infographic-remotion render -- --campaign=<slug> --name=infographic-01

# 디자인 미리보기 (studio)
pnpm --filter infographic-remotion studio
```
렌더된 MP4 → kvidai-media 업로드 → add_asset 으로 composition 삽입 (video.json.insertAssets). 상세: CLAUDE.md.
