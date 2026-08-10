# kvid.ai Composition — 필수 설정 & 함정 (필독)

kvid CLI/스킬로 영상을 **직접 조립**(에이전트 없이)할 때 반드시 지켜야 하는 설정 모음.
전부 `packages/shared/send-video-kvidai`(composition 빌더)와 `packages/infographic-remotion`(렌더)에 **이미 구현**돼 있음 — 이 문서는 **왜 그런지**의 근거이자 회귀 방지용. (실제 광고 제작 디버깅에서 도출)

---

## 1. asset 객체엔 `filename` 필수 ⚠️
composition `assets[]`의 각 asset은 `{ id, type, filename, remoteUrl }` 형태여야 함.
- **`filename` 누락 시** 에디터가 `TypeError: _url.indexOf is not a function` → 이미지 blob 로드 실패 → 무한 리렌더로 프리뷰 멈춤.
- 에이전트가 만든 asset에도 항상 `filename`이 있음. `remoteUrl`만으론 부족.
- 빌더: `AssetRef.filename = basename(file)`.

## 2. 이미지 배치 = `contain` 기본 (세로 캔버스 크롭 방지) ⚠️
세로(9:16) 캔버스에 가로/정사각 사진을 넣을 때, item `width/height`를 **캔버스 전체(1080×1920)로 두면 안 됨** → 에디터가 높이에 맞춰 꽉 채우고 **좌우를 크롭**(cover)해서 사진 일부만 보임.
- **해결**: 원본 이미지 크기(`image-size`로 판독)로 **contain 박스**를 계산해 `width/height/top/left` 설정 → 사진 전체가 보이고 상하 여백(solid 배경).
  ```
  ir=imgW/imgH, cr=W/H
  ir>cr → w=W, h=round(W/ir), top=(H-h)/2, left=0
  else  → h=H, w=round(H*ir), left=(W-w)/2, top=0
  ```
- 씬별 `visual.fit: "cover"`로 꽉 채우기(크롭) 선택 가능. 기본 `contain`.

## 2-1. 이미지 좌우 크롭 방지 — 전처리로 9:16 맞춤 (agent 모드) ⚠️
agent 모드는 에이전트가 배치하므로 item 크기를 못 정함 → 가로 사진이 좌우 크롭됨.
**해결**: 9:16 아닌 이미지가 있으면 **유저에게 처리방식을 물어봄**(꽉채움 vs 여백).
- **여백(letterbox)**: `ffmpeg -i in.jpg -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0A1A2F,setsar=1" -frames:v 1 out.jpg` (블러-필은 저품질, 지양)
- **꽉채움(fill/cover, 크롭)**: `ffmpeg -i in.jpg -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1" -frames:v 1 out.jpg`
- agent 모드=전처리 후 첨부. direct 모드=item `fit:"contain"|"cover"` (2번).

## 3. 인포그래픽/영상은 `yuv420p` (웹 프레임추출 호환) ⚠️
Remotion 기본 출력은 `yuvj420p`(jpeg 프레임, full range) → 에디터가 `Failed to extract frames: unsupported or unrecognizable format`.
- **해결**: `renderMedia({ imageFormat: 'png', pixelFormat: 'yuv420p' })`. (infographic-remotion에 반영)
- 애니메이션 영상 대신 **정적 이미지(PNG)** 로 넣으면 이 이슈 자체를 회피(에디터에서 영상 프레임추출을 안 함).

## 4. 트랙 z-순서: 배열 앞 = 위(앞) 렌더 ⚠️
`tracks[]`는 **앞 요소가 위 트랙(앞/front)**. solid 배경은 **배열 마지막**(맨 뒤)이어야 안 가림.
- 순서: `[audio, text, visual, bg(solid)]` (에디터에서 audio=top … solid=bottom). project 474(에이전트) 매칭.

## 5. item 스키마 (project 474 역설계)
공통: `{ id, type, from(frame), durationInFrames, top, left, width, height, opacity, rotation, fadeIn/OutDurationInSeconds, isDraggingInTimeline:false }`
- `image`: `+ assetId, brightness, borderRadius, cameraMotion('none'|'zoom_in'…), keepAspectRatio, motionIntensity`
- `video`: image + `playbackRate, videoStartFromInSeconds`
- `audio`: `+ assetId, width:0, height:0, playbackRate, decibelAdjustment, audioStartFromInSeconds, audioFadeIn/OutDurationInSeconds`
- `text`: `+ text, align, color, fontSize, fontFamily('검은고딕'), fontStyle{weight,variant}, lineHeight, strokeColor, strokeWidth, letterSpacing, background, direction, resizeOnEdit`
- `solid`: `+ color, borderRadius, keepAspectRatio`
- asset: `{ id, type, filename, remoteUrl }` · track: `{ id, items:[itemId], muted:false, hidden:false }`

## 6. 인증 = `api-key` 헤더
모든 플랫폼/생성 엔드포인트는 `api-key` 헤더. `Ocp-Apim-Subscription-Key` 아님. email은 body/query에 안 넣음(api-key가 신원). 생성(voice 등)은 credit 식별용 email/product_code 필요.

## 7. 나레이션(TTS) voice-driven timing
`kvidai-ai voice`의 응답 `duration_seconds`(+~0.5s 여유)를 그 씬의 `durationSec`로 → 음성과 씬 길이 동기화. `alignment`(문자단위 타이밍)로 자막 싱크도 가능.

## 8. 동시성 (계정당)
단독 생성 잡 동시상한(429) · 분당 10요청(429) → **미디어 생성은 순차**. (에이전트 미사용이라 에이전트 1-run 제약은 무관)

---

## ⛔ 에디터 프리뷰가 멈출 때 — 디버깅 순서
1. asset에 **`filename`** 있나? (1번)
2. **시크릿 창(확장 off)** 에서 재현되나? → 안 되면 **브라우저 확장프로그램** 간섭(`inject_hash` 주입 스크립트 등)이 원인. 해당 확장 예외처리.
3. 영상이면 **`yuv420p`** 인가? (3번)
- ❌ 포맷/색공간(sRGB ICC)/CORS는 대개 **무관** — 이걸로 시간 낭비 말 것. 위 3개부터 확인.
