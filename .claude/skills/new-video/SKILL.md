---
description: "영상 만들어줘" 요청을 받아 ref를 전처리(분석·큐레이션)하고 압축 브리프+자산을 kvid 에이전트에 넘겨 영상 생성
argument-hint: <slug> (또는 자연어 요청)
allowed-tools: Bash, Write, Edit, Read
---

# /new-video <slug>

유저의 "○○ 영상 만들어줘" 요청을 받아, **Claude(나)가 ref를 전처리**하고 **kvid 에이전트가 대본·씬·생성·조립**하는 하이브리드로 영상을 만든다. 유저는 web editor에서 확인/export.

> ⚠️ **조립 전 필독**: `docs/channels/kvid-composition-guide.md` (인포그래픽 yuv420p·첨부자산 준비 등).

## ⛔ 역할 경계 (2026-07-30 확정)
kvid 에이전트 API는 **토큰 한계(~70k, system prompt 포함)** 로 모든 ref를 못 받음. 그래서:

| 나 (Claude, 전처리) | ─경계─ | 에이전트 (창작+생성+조립) |
|---|---|---|
| ref 이미지 **분석**(뭘 보여주나), PDF/brief **제품지식 추출** | | **대본(script)** 작성 |
| 인포그래픽 **생성**(Remotion), 이미지 **선별** | 압축 브리프 | **씬 구성**(순서·타이밍·배치) |
| 자산 **업로드** → cdnUrl | + 자산 매니페스트 | **voice/image/text 생성** |
| **압축 브리프 + 자산 매니페스트**(파일명+설명+추천용도) 작성 | 를 넘김 | **composition 조립** |

- **raw ref(이미지 바이트/PDF 전문)는 절대 에이전트에 안 보냄.** 내가 소화해서 압축 텍스트 + cdnUrl 몇 개만.
- **씬/대본은 100% 에이전트** (system prompt가 담당). 나는 자산 "추천 용도"만 힌트.
- voice는 에이전트가 생성 → kvidai-ai TTS는 이 모드에선 불필요(정밀 나레이션 필요할 때만 옵션).

## ⛔ 동시성
에이전트 = 유저당 **1 run**(409). 같은 계정 /new-video 동시 2개 금지. 인포그래픽 등 사전생성은 에이전트 실행 **전에** 순차로.

## 단계

### 0. 모드 선택 (유저에게 물어봄) ⚠️
영상 만들기 시작 시 **AskUserQuestion 으로 유저에게 조립 방식을 물어본다**:
- **agent (풍성·자동)**: 에이전트가 대본·씬구성·나레이션·키워드오버레이 등 창의 요소까지. 내 손 덜 감, 결과 다이내믹. (예: project 484)
- **direct (정확·통제)**: 내가 씬·자막·배치를 정확히 지정. 예측가능·단순. (예: project 477)
선택에 따라 video.json 형식이 갈림(agent = message+attach / direct = scenes).

### 1. 스캐폴드
```bash
mkdir -p campaigns/<slug>/assets campaigns/<slug>/refs
```
`campaigns/<slug>/brief.md` 생성(요청 기록: 제목 / 참고세트 / 방향 / 타겟). 유저는 안 씀 — 내가 기록.

### 2. ref 전처리 (내 컨텍스트에서 — 무거운 건 여기서)
- 읽기: `references/brand/`(항상) + brief.md 의 `참고 세트:` 에 지정된 `references/<세트>/` + `campaigns/<slug>/{brief.md, refs/}` + 채팅 첨부.
- **이미지는 Read 로 직접 봐서** 각 이미지가 뭘 보여주는지 파악. PDF/문서로 제품 스펙·핵심 기능·셀링포인트·브랜드 톤 추출.
- 자료 부족하면 유저에게 2~3개만 되물음.

### 3. 특수 자산 준비 (순차)
- **인포그래픽**(필요 시): `campaigns/<slug>/infographic.json` → `pnpm --filter infographic-remotion render -- --campaign=<slug> --name=infographic-01` → `assets/infographic-01.mp4` (또는 정적 PNG).
- 쓸 **이미지 선별** → `assets/` 로 복사(안전한 파일명, ascii 권장).
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
  "message": "제품: (제품명·핵심 스펙). 핵심 셀링포인트: (기능1, 기능2, 기능3). 브랜드톤: (톤). 30~60초 9:16 광고 숏츠, 한국어 나레이션+자막 만들어줘.\n첨부 자산(활용 추천):\n- hero.jpg: (이 이미지가 뭘 보여주는지) → 오프닝\n- feature1.jpg: (설명) → (강조 포인트)\n- infographic-01.png: (설명) → 스펙 씬",
  "attach": ["assets/hero.jpg", "assets/feature1.jpg", "assets/infographic-01.png"]
}
```
- **message = 압축된 제품지식 + 자산 설명/추천용도.** 씬 순서·대본은 쓰지 말 것(에이전트 몫). 수 KB 이내(raw ref 금지) → 70k 훨씬 밑.
- `attach` = 첨부할 로컬 파일. 에이전트가 `use_uploaded_asset` 으로 배치.

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

설계: `.claude/plans/20260728_todo_skills-rewire-video-composition.md`.
