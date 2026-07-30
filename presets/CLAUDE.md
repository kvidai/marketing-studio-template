# presets/

kvid.ai 비디오 프로젝트 **프리셋 소스**. 여기 있는 `{presetId}.json` 이 단일 소스(git 관리)이며, `kvidai-preset` 스킬로 kvid.ai 에 push/pull 한다. 캠페인과 무관한 재사용 자산이라 캠페인 폴더와 분리한다.

## 프리셋이란

신규 비디오 프로젝트를 seed 하는 기본값 묶음 — voice(성우/톤/속도), tone(문체/청중), color(팔레트), scene(비율/길이/자막). 프로젝트 생성 시 `--preset-id <presetId>` 로 지정하면 빈 프로젝트 대신 이 기본값으로 시작한다.

## 파일 스키마

```jsonc
{
  "name": "표시 이름",
  "presetId": "ms-xxx",          // 사람이 읽는 고유 외부 id. create-project --preset-id 에 사용
  "description": "...",
  "language": "ko",
  "isPublic": false,              // true 면 다른 사용자 preset 드롭다운에 노출
  "tags": ["..."],
  "config": { "voice": {...}, "tone": {...}, "color": {...}, "scene": {...} }
}
```

> `config` 의 권위 스키마는 배포 레포 `apps/web-service/src/lib/templates/profiles.json`. 여기 샘플은 최소 시작 틀이다.
> `isDefault` 는 create 시 항상 false — 시스템 기본은 kvid.ai 쪽에서만 지정.

## kvid.ai 동기화 (kvidai-preset 스킬)

```bash
SKILL=.claude/skills/kvidai-preset/scripts/kvidai-preset-client.mjs

# push — 신규 등록
node $SKILL create presets/system-default.json          # → 반환 JSON 의 numeric id 기록

# push — 변경 (numeric id 필요)
node $SKILL update <numeric_id> '{"name":"...","isPublic":true}'

# pull — 원격 상태 확인
node $SKILL list
node $SKILL get-by-preset-id ms-system-default
```

등록된 `presetId` 는 캠페인 `video.json` 의 `presetId`, 또는 `create-project --preset-id` 에 사용.

## ⚠️ 주의

- preset JSON 에 API 키/토큰/이메일 등 **민감정보 금지** — public template 공개 대상.
- 파일명 = `{presetId}.json` 권장 (추적 용이).
