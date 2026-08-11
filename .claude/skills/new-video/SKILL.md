---
description: "영상 만들어줘" 요청을 받아 ref를 전처리(분석·큐레이션)하고 압축 브리프+자산을 kvid 에이전트에 넘겨 영상 생성
argument-hint: <slug> (또는 자연어 요청)
allowed-tools: Bash, Write, Edit, Read
---

# /new-video <slug>

유저의 "○○ 영상 만들어줘" 요청을 받아, **Claude(나)가 ref를 전처리**하고 **kvid 에이전트가 대본·씬·생성·조립**하는 하이브리드로 영상을 만든다. 유저는 web editor에서 확인/export.

> ⚠️ **조립 전 필독**: `docs/channels/kvid-composition-guide.md` (인포그래픽 yuv420p·첨부자산 준비 등).
> ⛔ **독립 생성 원칙 필독**: `.claude/rules/video-generation-rules.md` — 새 영상은 이번 references 만으로. 지시 없이 기존 캠페인 결과·다른 family 코드를 재사용하지 않는다(폴더 구조 관례까지만 허용).

## ⛔ 역할 경계 (2026-07-30 확정)
kvid 에이전트 API는 **토큰 한계(~70k, system prompt 포함)** 로 모든 ref를 못 받음. 그래서:

| 나 (Claude, 전처리 = 아트디렉터) | ─경계─ | 에이전트 (창작+생성+조립) |
|---|---|---|
| ref/데이터 **분석** → 무엇이 필요한지 **판단**(뭘 보여줄까·어떤 근거로) | | **대본(script)** 작성 |
| 필요 자산 **생성**: 인포그래픽(Remotion)·신규 이미지(`kvid image`)·영상(`kvid video`)·크롭 | 압축 브리프 | **씬 구성**(순서·**타이밍**·미세 배치) |
| 자산 **업로드** → cdnUrl, **배치·효과 의도** 결정 | + 자산 매니페스트 | 범용 b-roll·**voice/image 생성** |
| **압축 브리프 + 자산 매니페스트**(파일명+설명+**추천 배치/효과**) 작성 | 를 넘김 | **composition 조립**(추천 반영, 씬 길이는 음성에 맞춤) |

- **raw ref(이미지 바이트/PDF 전문)는 절대 에이전트에 안 보냄.** 내가 소화해서 압축 텍스트 + cdnUrl 몇 개만.
- ⛔ **레퍼런스 무지성 첨부 금지.** ref 는 **분석 입력**이지 "씬 소재 의무"가 아니다 — 데이터를 분석해 **무엇이 필요한지 판단**하고, 필요하면 **인포그래픽/신규 이미지·영상을 생성**한다. **모든 씬이 ref 일 필요 없다**(일부는 생성 자산·인포그래픽·에이전트 b-roll).
- **대본·최종 씬 길이는 100% 에이전트**(§4 — 음성에 맞춰 자동). 단 **배치·효과는 "강한 추천"** 으로 매니페스트에 담아 에이전트가 따르게 한다(추천 ≠ 초 단위 하드 지시).
- voice는 에이전트가 생성 → `kvid voice`(TTS)는 이 모드에선 불필요(정밀 나레이션 필요할 때만 옵션).

## ⛔ 동시성
에이전트 = 유저당 **1 run**(409). 같은 계정 /new-video 동시 2개 금지. 인포그래픽 등 사전생성은 에이전트 실행 **전에** 순차로.

## 단계

### 0. 모드 — 기본 = **agent** (묻지 말고 agent 로 진행)
- **agent (기본·권장)**: 에이전트가 대본·씬구성·나레이션·키워드오버레이 등 창의 요소까지 자동. 결과 다이내믹. → **특별한 요청이 없으면 무조건 이걸로.** (video.json = message + attach)
- **direct (확장·특수)**: 유저가 "씬/자막/배치를 정확히 이렇게" 처럼 **정밀 통제를 명시적으로 요구할 때만**. (video.json = scenes) — 상세: 아래 "direct 모드".
- **cardnews (확장)**: 포스터형 모션 카드뉴스를 원할 때. `packages/video-template/CLAUDE.md` cardnews 모드.

→ 기본은 agent. direct/cardnews 는 유저가 그 방식을 콕 집어 요구할 때만 쓴다(굳이 매번 물어보지 않는다).

### 1. 스캐폴드
```bash
mkdir -p campaigns/<slug>/assets campaigns/<slug>/refs
```
`campaigns/<slug>/brief.md` 생성(요청 기록: 제목 / 참고세트 / 방향 / 타겟). 유저는 안 씀 — 내가 기록.

### 2. ref 전처리 = 분석·판단 (내 컨텍스트에서 — 무거운 건 여기서)
- 읽기: `references/brand/`(항상) + brief.md 의 `참고 세트:` 에 지정된 `references/<세트>/` + `campaigns/<slug>/{brief.md, refs/}` + 채팅 첨부.
- **이미지는 Read 로 직접 봐서** 각 이미지가 뭘 보여주는지 파악. PDF/문서로 제품 스펙·핵심 기능·셀링포인트·브랜드 톤 추출.
- 🎯 **여기서 "판단"을 한다** (단순 요약 아님): 이 데이터로 **무엇을 보여줄지**, 어떤 숫자·비교·근거가 **인포그래픽감**인지, 어떤 자료가 그대로 쓸만하고 뭐가 **새로 생성**해야 하는지, 대략 몇 개 비트로 갈지. → 3단계 자산 계획으로 이어진다.
- 자료 부족하면 유저에게 2~3개만 되물음.

### 2.5 프리셋 결정/생성 (⚠️ 비디오 생성 **전** 필수)
프리셋 = 재사용 가능한 기본값(**ElevenLabs 음성** voiceId/모델/설정 + 톤 + 색 + 씬). **먼저 프리셋을 고정**해야 (a) 결과 좋은 설정을 나중에 재사용, (b) 같은 컨셉/시리즈 영상들의 **통일성**(같은 목소리·톤) 유지.
```bash
kvid preset list                          # 이 컨셉에 맞는 기존 프리셋 있나? (kvid CLI — 스킬 설치 불필요)
```
- **있으면 재사용**: 그 presetId 를 video.json 에.
- **없으면 새로 생성** — `presets/<id>.json` 작성 후 `kvid preset create presets/<id>.json`:
  - `config.voice`: **ElevenLabs** `{ voiceId, modelId:"eleven_multilingual_v2", speed, style, stability, similarityBoost }` (voiceId 는 기존 프리셋 `kvid preset get <id>` 로 획득, 예 한국어 `m3gJBS8OofDJfycyA2Ip`).
  - `config.tone / color / scene`: 브랜드 톤·팔레트(`references/brand/`)·비율/길이.
  - (선택) **음성 확인**: `kvid voice generate "샘플" --voice-id <id> --output /tmp/s.mp3` 로 미리 들어보고 좋으면 그 voiceId/설정을 프리셋에 고정.
- 상세 스키마: `presets/CLAUDE.md`.

### 3. 자산 판단·생성 (순차) — 2단계 분석 결과대로
> **원칙**: ref 를 그대로 붙이는 게 기본이 아니다. **분석 결과 "필요한 것"을 만든다.** 통제·정확성이 필요한 자산은 내가 만들고(아래), 범용 b-roll·필러는 에이전트에 맡긴다.
- **인포그래픽**(데이터가 그럴 값어치면): `campaigns/<slug>/infographic.json` → `pnpm --filter infographic-remotion render -- --campaign=<slug> --name=infographic-01` → `assets/infographic-01.mp4` (또는 정적 PNG). 차트 종류·강조·내부 모션/효과를 내가 정한다.
- **신규 이미지/영상 생성**(ref 로 부족하거나 없을 때): `kvid image generate "<프롬프트>" --size portrait_16_9 --output assets/xxx.png` / `kvid video t2v "<프롬프트>" --output assets/xxx.mp4 --wait`. 제품 정확도가 중요하면 ref 기반으로, 분위기컷이면 자유 생성.
- 쓸 **이미지 선별** → `assets/` 로 복사(안전한 파일명, ascii 권장). **모든 씬이 ref 일 필요 없음** — 생성 자산·인포그래픽·에이전트 b-roll 을 섞어 구성.
- ⚠️ **이미지 중 9:16(1080×1920)이 아닌 게 있으면, AskUserQuestion 으로 처리방식을 물어본다**:
  - **여백 (letterbox)**: 이미지 전체가 보임 + 솔리드 다크 여백. (블러-필은 저품질이라 지양)
    ```bash
    ffmpeg -y -v error -i in.jpg -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0A1A2F,setsar=1" -frames:v 1 out.jpg
    ```
  - **꽉채움 (fill/cover)**: 여백 없이 꽉 참, 좌우(또는 상하) **크롭됨**.
    ```bash
    ffmpeg -y -v error -i in.jpg -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1" -frames:v 1 out.jpg
    ```
  - **agent 모드**: 선택대로 전처리 후 첨부(+ message 에 "이미지 9:16 맞춤, 크롭 말고 꽉 채워" 힌트).
  - **direct 모드**: 전처리 대신 씬 visual `"fit": "contain"`(여백) / `"cover"`(꽉채움)로 지정.
  - 이미 9:16(인포그래픽 등)은 그대로.

### 4. 압축 브리프 + 자산 매니페스트 작성 → `campaigns/<slug>/video.json`
```jsonc
{
  "mode": "agent",
  "presetId": "<선택>",
  "message": "제품: (제품/서비스명 + 핵심 스펙). 핵심 셀링포인트: (기능1, 기능2, 기능3). 브랜드톤: (톤). 30~60초 9:16 광고 숏츠 만들어줘.\n첨부 자산(순서대로 활용 추천):\n- hero.jpg: (이 이미지가 뭘 보여주는지) → (추천 용도)\n- feature.jpg: (설명) → (추천 용도)\n- infographic-01.mp4: (설명) → 스펙 씬",
  "attach": ["assets/hero.jpg", "assets/feature.jpg", "assets/infographic-01.mp4"]
}
```
- **message = 압축된 제품지식 + 자산 설명/추천용도.** 씬 순서·대본은 쓰지 말 것(에이전트 몫). 수 KB 이내(raw ref 금지) → 70k 훨씬 밑.
- ⛔ **씬 길이·초·전체 길이 하드 제약을 message 에 넣지 말 것** — "씬당 N초", "총 N초 이하", "정확히 30초" 등 금지. 에이전트는 **나레이션 길이에 맞춰 씬 길이를 자동 조정**하는데, 초 제약을 걸면 이 자동 맞춤이 깨져 음성이 잘리거나 씬이 빈다. "30~60초 광고 숏츠" 같은 **대략적 방향까지만** 허용. 정확한 길이를 강제해야 하면 direct 모드로. (근거: `.claude/rules/video-generation-rules.md` §4)
- `attach` = 첨부할 로컬 파일(내가 선별·생성한 것). 에이전트가 `use_uploaded_asset` 으로 배치.
- 🎯 **매니페스트엔 "추천 배치/효과"를 강하게 담는다** — 자산별 한 줄에 "어디에(오프닝/스펙 강조/클로징) + 어떤 느낌(줌인 강조, 빠른 컷 등)". 이건 에이전트가 **따르는 강한 추천**이지 초 단위 하드 지시가 아니다(씬 길이는 여전히 음성에 맞춰 에이전트가 정함 → §4).
- 💡 **message 는 핵심 셀링포인트 3~6개 + 이미지별 한 줄 추천용도**로 압축 권장(길이 하드리밋은 없음). 제원표 전문 나열은 대본에 불필요 — 필요하면 에이전트가 알아서 요약.
- ✅ **긴 영상 + 첨부 이미지 배치 지원됨** (2026-08 플랫폼 업데이트) — 예전엔 long-video 경로가 첨부를 안 써서 보장이 안 됐지만, 이제 30초 숏츠든 3분+ 긴 영상이든 **첨부 자산이 정상 배치**된다. 길이 걱정 없이 첨부를 활용한다.
- 💡 (참고) 예전 "3분할"→"3분(minutes)" 오인 라우팅 버그도 수정됨(2026-07-31). 어차피 길이는 에이전트가 음성에 맞춰 정하니(§4) message 엔 "N분할/N초" 같은 길이 표현 자체를 넣지 않는다.

### 5. 실행
```bash
pnpm --filter video-template generate -- --campaign=<slug> --dry-run   # 첨부 존재 검증
pnpm --filter video-template generate -- --campaign=<slug>             # 업로드 → create-project → agent-generate → 아카이브
```
필요 env: `KVIDAI_API_KEY`(api-key), `KVIDAI_BASE_URL=https://api.kvid.ai`, `KVIDAI_USER_EMAIL`.

### 6. 유저에게 전달
`editor: https://kvid.ai/en/editor/<id>` 안내. 아카이브: `campaigns/<slug>/out/video/{project,composition}.json`. 수정 요청도 말로 → video.json 갱신 후 재실행(같은 프로젝트 재사용).

## direct 모드 (특수 케이스 옵션)
제품 사진을 **정확한 위치에** 배치해야 하고 에이전트 배치가 미덥지 않을 때만. video.json 을 scene plan(`{ "scenes":[{durationSec,background,visual,voice,captions}] }`)으로 작성 → Claude가 composition 직접 조립(에이전트 미사용). 상세: `docs/channels/kvidai-video.md`.

## cardnews 모드 (포스터 → 모션 카드뉴스 → 에디터)
"이 포스터로 **카드뉴스 영상** 만들어줘 (에디터에 뜨게)" 요청. cardnews-template(정적 JPG·인스타 채널)이 아니라 이 경로다.
1. 포스터 분석 → 씬 콘텐츠 `campaigns/<slug>/<family>-cardnews.json` 작성 + 포스터 오브젝트 크롭(계열 `scripts/*-assets.cjs` 패턴).
2. **무음 마스터** 렌더: `pnpm --filter infographic-remotion render-sample (예시) -- --campaign=<slug> --name=cardnews-silent`.
3. (선택) 씬별 나레이션 → `assets/voice-kvid/voice{N}.mp3` (씬 앞 리드인 무음 포함 — `scripts/build-kvid-voice.mjs`).
4. `video.json` = `{ "mode":"cardnews", "family":"<family>", "background":"#...", "voiceDir":"assets/voice-kvid" }`.
5. `pnpm --filter video-template generate -- --campaign=<slug> --build-only`(무료 확인) → 정상이면 플래그 없이 실행.
- 씬 개수 = `<family>-cardnews.json` scenes 수(references 에 따라 1~N). 상세: `packages/video-template/CLAUDE.md`.

설계: `.claude/plans/20260728_todo_skills-rewire-video-composition.md`, `.claude/plans/20260807_wip_cardnews-to-editor-composition.md`.
