# video-template (AI guide)

kvid.ai 비디오 채널의 유일한 진입점. `campaigns/<slug>/video.json` → kvid.ai composition.

## Entry point
- `src/index.ts` — `video.json` 을 읽어 `mode` 로 분기. 결과를 `campaigns/<slug>/out/video/{project,composition}.json` 에 아카이브.
- `src/split-clips.ts` — 무음 마스터 MP4 를 씬 경계로 프레임 정확 분할(ffmpeg). cardnews 모드가 사용.
- 실제 조립/업로드는 `@marketing-studio/send-video-kvidai` (스킬 위임).

## Flags
`--campaign=<slug>` (또는 `--set=<slug>` → in/) · `--dry-run` (검증만) · `--build-only` (업로드·크레딧 0, composition JSON 만) · `--new` (기존 project 재사용 안 하고 강제 신규).
`out/video/project.json` 이 있으면 같은 프로젝트의 composition 만 교체(이어서 수정).

## Modes (video.json)

### direct — Claude 가 씬을 직접 조립
```json
{ "mode": "direct", "presetId": "...", "width": 1080, "height": 1920, "fps": 30,
  "scenes": [ { "durationSec": 5, "background": "#030320",
    "visual": { "type": "image|video", "file": "assets/x.jpg", "fit": "cover|contain", "cameraMotion": "none" },
    "voice": { "file": "assets/voice1.mp3" },
    "captions": [ { "text": "..." } ] } ] }
```

### agent — kvid.ai 에이전트에 위임
```json
{ "mode": "agent", "presetId": "...", "message": "압축 브리프", "attach": ["assets/hero.jpg"] }
```

### cardnews — Remotion 카드뉴스 모션을 에디터 composition 으로
"이 포스터로 카드뉴스 **영상** 만들어줘" → 카드뉴스 채널(완결 MP4, kvid.ai 미경유)이 아니라 **여기로**.
```json
{ "mode": "cardnews", "family": "sample", "master": "out/cardnews-silent.mp4",
  "background": "#030320", "voiceDir": "assets/voice-kvid", "presetId": "..." }
```
- `family` — `{family}-cardnews.json`(씬 길이 원본)을 유추. 또는 `scenesFile` 로 직접 지정.
- `master` — 렌더된 **무음** 완결 MP4(기본 `out/cardnews-silent.mp4`). 없으면 먼저 `pnpm --filter infographic-remotion render-sample (예시) -- --campaign=<slug> --name=cardnews-silent`.
- 동작: 마스터를 씬 경계(`Math.round(durationSec*fps)`)로 잘라 `assets/clips/clip-NN.mp4` 생성 → 각 클립을 video 씬으로, `voiceDir/voice{N}.mp3` 있으면 오디오로 얹어 조립.
- 씬 개수 = `{family}-cardnews.json` 의 scenes 수(references 에 따라 1~N).

#### 나레이션(선택)
1. `campaigns/<slug>/narration.json` 작성 `{ voiceId, lang, speed, cardnewsFile, minScene[], lines[] }` (씬 1:1, 화면 문구 그대로 읽지 말 것, 자료에 없는 사실 금지).
2. `node scripts/build-voice.mjs --campaign=<slug>` → 씬별 TTS(kvidai-ai, **크레딧**) 생성 + 음성 길이에 맞춰 `cardnewsFile` durationSec 재조정 + `voice-timeline.json`.
3. **음성 길이가 바뀌었으니 마스터 재렌더**: `render-sample (예시) --name=cardnews-silent`.
4. `node scripts/build-kvid-voice.mjs --campaign=<slug>` → 리드인 무음 패딩 → `assets/voice-kvid/voice{N}.mp3`.
5. `video.json` 에 `"voiceDir": "assets/voice-kvid"` 추가 후 조립 → composition 에 씬별 오디오 트랙.

## 왜 카드뉴스가 여기로 오나 (라우팅)
`infographic-remotion` 의 `CardNews` 계열은 원래 **완결 MP4 를 채널에 직접 업로드**하는 별도 채널(kvid.ai 미경유)이다. 하지만 결과를 **kvid.ai 에디터에서 씬 단위로 편집/재사용**하려면 통짜가 아니라 씬별 클립으로 잘라 composition 에 얹어야 한다 — 그게 cardnews 모드다. 에디터에서 못 고치는 씬 **내부** 모션(카운트업·스캔바 등)은 클립에 구워진 상태라 `{family}-cardnews.json` 수정 → 재렌더 → 재조립(같은 프로젝트 교체).

## 함정
- **자산 파일명은 캠페인별 고유**여야 한다. kvid.ai 는 **파일명으로 자산을 식별**해서, 같은 계정에서
  `clip-01.mp4` 같은 범용 이름을 여러 캠페인이 쓰면 **에디터가 다른 캠페인의 동명 자산을 물어온다**
  (실측: 새 프로젝트 프리뷰에 다른 캠페인 클립이 떴다 — CDN remoteUrl 은 정상인데 에디터가
  라이브러리의 옛 clip-01.mp4 로 resolve). cardnews 모드는 클립을 `<slug>-clip-NN.mp4` 로 이름짓는다.
- **durationInFrames**: composition 최상위에 반드시 있어야 에디터 타임라인 길이가 잡힌다(없으면 0 → 빈 프로젝트처럼 보임). `send-video-kvidai/composition.ts` 가 씬 길이 합으로 자동 채운다.
- **씬 내 오디오 지연 불가**: 오디오 `from` 이 씬 시작 고정. 카드 페이드인 뒤 나레이션을 맞추려면 음성 앞에 무음 리드인을 덧대야 한다(`voiceDir` 에 그 판본을 둠).
- 공통 조립 함정(asset filename·이미지 contain·yuv420p·트랙 z순서): `docs/channels/kvid-composition-guide.md`.
