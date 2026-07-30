# kvidai Video — Integration Guide

> ⚠️ **필독**: composition 필수 설정·함정(asset filename, 이미지 contain, yuv420p, 트랙 z-순서, 디버깅 순서)은 `kvid-composition-guide.md` 참조. 같은 삽질 반복 방지.


## Overview

비디오 채널 = **kvid.ai AI 에이전트를 쓰지 않고**, 에이전트의 역할(미디어 생성 + composition 조립)을 **Claude Code 가 직접** 수행한다.
- 미디어(voice/image/video/인포그래픽)는 kvidai CLI + Remotion 으로 **내가 생성**.
- composition 은 scene plan → tracks/items 로 **내가 직접 빌드**해서 `replace-composition` 으로 넣음.
- 커스텀 API 클라 직접 작성 금지 — `@marketing-studio/send-video-kvidai` 가 배포 스킬(kvidai-media/video-project) 을 위임 호출.
- 정본 = kvid.ai 에디터 export. 추가로 campaigns/<slug>/ 에 저장.
- Remotion = 인포그래픽 클립 전용(부분 MP4).

대화형 진입점: `/new-video` (`.claude/skills/new-video/SKILL.md`).

## Env
```
KVIDAI_API_KEY=<APIM key>           # api-key 헤더
KVIDAI_BASE_URL=https://api.kvid.ai
```
(email 불필요 — api-key 가 신원. 문서: kvidai-documentation/docs/api-services)

## Workflow (video-template)
```bash
# 0. /new-video 로 미디어 생성 + campaigns/<slug>/video.json (scene plan) 작성
pnpm --filter video-template generate -- --campaign=<slug> --dry-run      # 자산 존재 검증
pnpm --filter video-template generate -- --campaign=<slug> --build-only   # composition JSON 로컬 빌드(크레딧 0)
pnpm --filter video-template generate -- --campaign=<slug>                # 업로드→create→조립→아카이브
```

### video.json = scene plan
```jsonc
{
  "presetId": "<선택>", "width": 1080, "height": 1920, "fps": 30,
  "scenes": [
    { "durationSec": 4.2, "background": "#0A0A1A",
      "visual": { "type": "image|video", "file": "assets/s1.png" },
      "voice":  { "file": "assets/s1.mp3" },
      "captions": [ { "text": "자막", "top": 1400 } ] }
  ]
}
```

### 조립 로직 (send-video-kvidai)
1. scene plan 의 파일 → `kvidai-media upload-file` → cdnUrl → asset 등록
2. `create-project` (preset seed)
3. `buildComposition(plan)` → tracks(bg/visual/audio/text) + items(solid/image·video/audio/text) 직접 빌드
4. `replace-composition <id> <json>` (PATCH operation:replace)
5. `get-project` 스냅샷 → `out/video/{project,composition}.json`

## Item 스키마 (project 474 역설계 · Remotion 호환)
- 공통: `id,type,from(frame),durationInFrames,top,left,width,height,opacity,rotation,fadeIn/Out,isDraggingInTimeline`
- image: `+assetId,brightness,borderRadius,cameraMotion,keepAspectRatio,motionIntensity`
- audio: `+assetId,playbackRate,decibelAdjustment,audioStartFromInSeconds,audioFade…`
- text: `+text,align,color,fontSize,fontFamily,fontStyle,lineHeight,strokeColor,strokeWidth,…`
- solid: `+color,borderRadius,keepAspectRatio`
- video: image+audio 유추 (`+playbackRate,videoStartFromInSeconds`) — e2e 검증됨(project 475)
- ⚠️ 트랙 z: **tracks[] 앞 요소 = 위(앞) 렌더, 마지막 = 뒤**. solid 배경은 배열 마지막.
  배열 순서 = `[audio, text, visual, bg]` (474 매칭: 에디터 audio=top … solid=bottom/back)

## 스킬 클라 확장
composition 전체 교체는 배포 클라에 없어서 `replace-composition` 명령을 추가함
(`kvidai-video-project/scripts/kvidai-client.mjs`, 설치본 + 원본 클론. GitHub push 는 보류).

설계: `.claude/plans/20260728_todo_skills-rewire-video-composition.md` §3.6.
