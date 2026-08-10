# video-template

kvid.ai 비디오 채널 진입점. `campaigns/<slug>/video.json` 하나를 읽어 kvid.ai 프로젝트 composition 으로 조립한다. 실제 API 호출은 `@marketing-studio/send-video-kvidai`(배포 스킬 위임).

## Modes
- `direct` — scenes[] 를 직접 조립(에이전트 미사용) — ✅
- `agent` — 압축 브리프 + 첨부를 kvid.ai 에이전트에 위임 — ✅
- `cardnews` — Remotion 카드뉴스 무음 마스터를 씬별 클립으로 잘라 composition 에 얹음 — ✅

## Status
카드뉴스 모션 → kvid.ai 에디터 경로 포함, 3모드 동작. 최종 export 는 에디터에서 수동.

## Commands
```bash
pnpm --filter video-template generate -- --campaign=<slug> [--dry-run|--build-only|--new]
```

세부 사용법·모드별 video.json 스키마는 `CLAUDE.md` 참고.
