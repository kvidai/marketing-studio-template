# kvidai API Capability Notes — Phase 0 결과

> 조사일: 2026-05-25 | 프로젝트 266 생성·조회로 검증

## 결론: 로컬 asset 업로드 경로 없음

kvidai API에는 **로컬 파일(이미지·동영상)을 업로드하는 엔드포인트가 현재 없음**.
`composition.assets`는 `agent-generate` 호출 후 agent가 직접 채우는 구조.

## 프로젝트 응답 스키마 (GET /video-project/{id})

```json
{
  "composition": {
    "fps": 30,
    "items": {},
    "assets": {},            // agent 생성 후 채워짐
    "tracks": [...],
    "compositionWidth": 1080,
    "compositionHeight": 1920, // 기본 9:16 세로형 ✅ Shorts 최적
    "durationInFrames": 300    // 10초 초기값 — agent가 확장
  },
  "media": null              // 별도 미디어 업로드 필드 없음
}
```

## 실제 사용 패턴 (send-video-kvidai 패키지)

`packages/shared/send-video-kvidai/src/index.ts`의 `generateVideo()`가 이미 올바른 패턴 구현:

```
short-{N}/
  brief.md    ← 전체 방향·톤
  script.md   ← 나레이션 스크립트 (시간 큐 포함)
  visuals.md  ← 시각 큐 (상세 묘사 → agent가 이미지 생성)
```

→ `generateVideo({ projectPath: 'short-{N}/' })` 호출 → 3개 파일 합쳐서 agent에 전달

## 인포그래픽 처리 방법 (수정된 전략)

로컬에서 PNG 렌더링 후 업로드 ❌ (불가)

대신 `visuals.md`에 인포그래픽 내용을 **텍스트로 상세 기술**:

```markdown
## [10-25s] 인포그래픽: 중국 반도체 시장점유율 변화
- 스타일: 다크 배경, 흰색 바 차트, 한국어 레이블
- 데이터:
  - 2015년: DRAM 중국 5% / 한국 65%
  - 2024년: DRAM 중국 35% / 한국 55%
- 강조: 붉은색으로 중국 성장선
- 하단: 출처 "Omdia 2024"
```

→ kvidai agent가 generate_image로 생성

## 확인된 한계

- 영상 길이 1~3분: 미검증 (short-01 시제품에서 확인 필요)
- 파일명 참조 배치: 불가 (agent가 description 기반 생성)
- 로컬 B-roll 업로드: 불가 (description으로 대체)

## 환경변수

```
KVIDAI_API_KEY=d76044ac... (.env.kvidai.production)
KVIDAI_BASE_URL=https://api.kvid.ai
```

`kvidai-client.mjs`는 `${KVIDAI_BASE_URL}/agent/generate`로 통일 — 별도 `KVIDAI_AGENT_BASE_URL` 불필요.

## 실제 생성 결과 (2026-05-25)

| Short | Project ID | Tools | 비고 |
|-------|-----------|-------|-----|
| short-01 | 267 | 1 (scene_planning) | 단일 패스 처리 추정 |
| short-02 | 268 | 40 | add_chart, add_countdown_timer |
| short-03 | 272 | 38 | 269 timeout 폐기, 재생성 |
| short-04 | 270 | 31 | add_timeline, add_keyword_overlay |
| short-05 | 271 | 35 | add_timeline, add_keyword_overlay |

**타임아웃 주의**: generate-short.ts timeout 기본값 5분 → 8분으로 상향 필요. 복잡한 스크립트는 5분 초과 가능.
