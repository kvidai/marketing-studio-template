# Plan — 권석준 교수 반도체 인터뷰 → kvidai 쇼츠 시리즈

> **Last Updated**: 2026-05-25
> **Status**: done
> **Source**: `campaigns/20260525-semiconductor/우리가 잘해서 번 게 아닙니다 ... (권석준 교수).srt` (Korean, 67분 48초, 2,216 cues)
> **Output target**: `campaigns/20260525-semiconductor/shorts/short-{N}/`
> **Skill**: `.claude/skills/kvidai-video-project/scripts/kvidai-client.mjs`

---

## Context

압권 채널의 권석준 교수 인터뷰(1시간 7분)를 **한국어 쇼츠 시리즈 3~5개(각 1~3분)** 로 가공해서 YouTube에 업로드. 영어 시청자는 **YouTube 자동더빙·자동자막**에 맡김 (한국어 영상 1개만 만들어 비용·시간 최소화). 영상 생성은 brief.md + script.md + visuals.md 3개 파일을 kvidai agent에 전달하는 방식.

---

## Critical Unknowns → 검증 결과

| # | Unknown | 결과 |
|---|---------|------|
| U1 | kvidai asset 업로드 API 존재 여부 | ❌ 없음. `composition.assets`는 agent가 채우는 구조. 로컬 파일 업로드 불가. `visuals.md` 텍스트 묘사로 대체. |
| U2 | agent-generate가 1~3분 영상 처리 가능 여부 | ✅ short-01 → 128.1초 생성 확인 |
| U3 | 파일명 참조 배치 여부 | ❌ 불가. agent가 description 기반으로 image 생성. |

---

## 실행 결과 (2026-05-25)

### Phase 0 — API 검증 ✅
- 업로드 엔드포인트 없음 확인
- 기본 해상도 1080×1920 (9:16) 세로형 확인
- `_kvidai-capability-notes.md` 작성

### Phase 1 — SRT 분석 + 스크립트 ✅
- 67분 SRT에서 5개 핵심 주제 추출
- 각 short 별 `brief.md`, `script.md`, `visuals.md`, `source-cues.json` 작성

### Phase 2 — 로컬 asset 생성 → 전략 변경
- 로컬 업로드 불가로 `visuals.md`에 텍스트 묘사로 대체 (Phase 0 결과)

### Phase 3 — kvidai 생성 ✅

| Short | 주제 | Project ID | Tools | 에디터 |
|-------|------|-----------|-------|-------|
| short-01 | 슈퍼사이클의 착시 | 267 | 1 (scene_planning) | https://kvid.ai/en/editor/267 |
| short-02 | 변곡점 하나가 전부를 바꾼다 | 268 | 40 | https://kvid.ai/en/editor/268 |
| short-03 | 중국의 카라비나 전략 | 272 | 38 | https://kvid.ai/en/editor/272 |
| short-04 | 창이 닫히기 전에 | 270 | 31 | https://kvid.ai/en/editor/270 |
| short-05 | AI가 열어준 2년 | 271 | 35 | https://kvid.ai/en/editor/271 |

> short-01은 `scene_planning` 1개 — 구조 다름, 에디터에서 확인 필요  
> short-03(269)은 5분 timeout → 272로 재생성 (8분 timeout 적용)

### Phase 4 — 캠페인 메타데이터 ✅
- `brief.json` 작성 (5개 프로젝트 ID + URL 포함)
- `generate-short.ts` runner 작성 (8분 timeout, URL 수정 포함)

### Phase 5 — 검증 ⏳ 사용자 확인 대기
- 각 프로젝트 에디터에서 미리보기 → 렌더 → YouTube 업로드 (수동)

---

## 학습된 패턴 (다음 캠페인 참고)

1. **generate-short.ts runner** — `brief.md + script.md + visuals.md` 3파일 디렉토리 → kvidai agent 자동 호출
2. **SSE timeout**: 복잡한 스크립트는 5분 초과 가능 → **8분** 권장
3. **URL**: `https://kvid.ai/en/editor/{id}` (구 `console.kvid.ai/projects/{id}` 아님)
4. **도구**: `add_chart`, `add_timeline`, `add_keyword_overlay`, `add_countdown_timer`, `add_dark_overlay` 등 rich tool set

---

## Verification 체크리스트

- [x] Phase 0 결과 — asset 업로드 메커니즘 문서화
- [x] short-01 시제품 생성 (128.1초)
- [x] 5개 쇼츠 모두 kvidai draft 생성
- [x] `campaigns/20260525-semiconductor/brief.json` 작성
- [ ] YouTube 1개 비공개 업로드 + 자동더빙 품질 확인 (사용자 수동)
- [x] plan 파일 → `.claude/plans/20260525_done_semiconductor-shorts.md` 이동

---

## Out of scope

- 영어 별도 영상 생성 (YouTube 자동더빙으로 대체)
- 커스텀 렌더링 파이프라인
- 다른 채널 동시 배포 — 영상 검증 후 별도 캠페인
- 1시간 풀 영상 재구성
