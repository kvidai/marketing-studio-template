# presets/

kvid.ai 비디오 프로젝트 **프리셋 소스**. 여기 있는 `{presetId}.json` 이 단일 소스(git 관리)이며, `kvid preset` CLI 로 kvid.ai 에 push/pull 한다. 캠페인과 무관한 재사용 자산이라 캠페인 폴더와 분리한다.

## 프리셋이란

신규 비디오 프로젝트를 seed 하는 기본값 묶음 — voice(**ElevenLabs** voiceId/모델/속도/스타일), tone(문체/청중), color(팔레트), scene(비율/길이/자막). 프로젝트 생성 시 `--preset-id <presetId>` 로 지정하면 빈 프로젝트 대신 이 기본값으로 시작한다.

## ⚠️ 왜 생성 전에 프리셋을 남기나
- **재사용**: 결과 좋은 음성/톤/색 조합을 프리셋으로 저장 → 다음 영상에 그대로.
- **통일성**: 같은 컨셉/시리즈 영상들이 **같은 목소리·톤·색**으로 나옴 (시리즈 일관성).
- 그래서 `/new-video`는 **비디오 생성 전에 프리셋을 결정/생성**(재사용 or 신규)한다.
- 음성(voiceId/설정)은 `kvid voice generate` 로 샘플 들어보고 좋은 걸 프리셋에 고정.

## 파일 스키마

```jsonc
{
  "name": "표시 이름",
  "presetId": "ms-xxx",          // 사람이 읽는 고유 외부 id. create-project --preset-id 에 사용
  "description": "...",
  "language": "ko",
  "isPublic": false,              // true 면 다른 사용자 preset 드롭다운에 노출
  "tags": ["..."],
  "config": {
    "voice": { "voiceId": "<ElevenLabs id>", "modelId": "eleven_multilingual_v2", "speed": 1.1, "style": 0.35, "stability": 0.3, "similarityBoost": 0.8 },
    "tone": { "style": "...", "emotionArc": "...", "endingPatterns": ["..."], "exampleSentences": ["...","..."], "forbiddenPatterns": ["..."], "scriptPatterns": {} },
    "character": { "name": "", "defaultSize": "medium", "description": "", "poseVariations": [], "defaultPosition": "center" },
    "colorPalette": {},
    "customPrompt": "- 항목1\n- 항목2\n- 항목3",
    "screenComposition": { "subtitle": {"color":"#FFF","fontSize":60,"position":{...},"fontFamily":"검은고딕"}, "videoBudget": {"maxRatio":0.3,"maxSeconds":30}, "visualTypeRatio": {}, "fallbackBackground": "#0A1A2F", "sceneMaxDurationSeconds": 6 }
  }
}
```

## ⚠️ config 함정 (에이전트가 프리셋 로드 시 크래시 → 무음/무생성)
- **키 이름 정확히**: `colorPalette`·`screenComposition` (❌ color/scene 아님), `character`·`customPrompt` 포함.
- **`customPrompt` = 불릿 멀티라인** (`- 항목\n- 항목`). 단일 문장/빈 문자열이면 에이전트 파싱이 `undefined.slice()` 로 크래시 → 아무것도 생성 안 됨.
- **tone 배열(exampleSentences 등) 비우지 말 것** (에이전트가 요소를 참조).
- **가장 안전**: `kvid preset duplicate <작동 프리셋 id>` 로 복제 후 내용만 교체 (구조 보장). 예: 한국어 음성 프리셋은 기존 작동 프리셋 복제 기반.
- ⚠️ 프리셋은 **agent-generate 의 presetId 로 적용**됨 (create-project 만으론 voice 반영 안 됨) — video-template 이 자동 처리.

> `config` 권위 스키마: 배포 레포 `apps/web-service/src/lib/templates/profiles.json`.
> `isDefault` 는 create 시 항상 false.

## kvid.ai 동기화 (kvid preset CLI — 스킬 설치 불필요)

```bash
# push — 신규 등록
kvid preset create presets/system-default.json          # → 반환 JSON 의 numeric id 기록

# push — 변경 (numeric id 필요)
kvid preset update <numeric_id> '{"name":"...","isPublic":true}'

# pull — 원격 상태 확인
kvid preset list
kvid preset get-by-preset-id ms-system-default
```

등록된 `presetId` 는 캠페인 `video.json` 의 `presetId`, 또는 `create-project --preset-id` 에 사용.

## ⚠️ 주의

- preset JSON 에 API 키/토큰/이메일 등 **민감정보 금지** — public template 공개 대상.
- 파일명 = `{presetId}.json` 권장 (추적 용이).
