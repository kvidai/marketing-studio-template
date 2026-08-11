# Upstream 계약 — kvid CLI 를 통해서만 kvid.ai 를 쓴다

이 프로젝트(template/custom)를 클론한 **모든 사용자에게 공통 적용**. 목적: 업스트림(API/web)이
바뀌어도 **과거 버전 CLI/스킬로 인한 조용한 오류**가 안 나게 하는 것.

## 의존 흐름

```
kvid.ai API / web  ──(변경)──▶  kvidai-cli  ─release(git tag→release.yml)─▶  cli.kvid.ai
                                 kvidai-skills ─push→ 레지스트리
                                        │
                                        ▼  (자연스럽게 최신을 가져다 씀)
                              marketing-studio (template / custom)
```

## ⛔ 규칙

1. **kvid.ai 는 오직 `kvid` CLI 로만 호출한다.** template/custom 은 `api.kvid.ai` 를 **REST 로 직접 호출하지 않는다.**
   업로드·프로젝트·composition·TTS·이미지/영상 생성 전부 `kvid ...` (see `send-video-kvidai`). 고급 대화형 편집만 `kvidai-*` 스킬(선택).
   - **왜**: API 스펙 변경을 CLI 가 **하위호환 계층**으로 흡수한다. 각 프로젝트가 REST 를 직접 부르면 스펙이 바뀔 때마다 전부 깨진다.

2. **CLI 가 계약면(compatibility layer)이다.** API/web 이 바뀌면 순서는 **CLI 를 먼저 릴리스** → 그 다음 클라이언트가 `kvid update`.
   CLI 는 하위호환을 유지한 채 새 스펙을 흡수한다(가능하면). 불가피한 파괴적 변경이면 최소 버전을 올린다(아래 3).

3. **최소 버전 가드 (조용한 깨짐 방지).** `packages/shared/send-video-kvidai/src/index.ts` 의 `KVID_MIN_VERSION` 이 **단일 소스**.
   런타임에 `kvid --version` 이 그보다 낮으면 첫 호출에서 **즉시 명확한 안내와 함께 실패**한다("kvid update 하세요").
   - 새 CLI 기능이 반드시 필요해지면 CLI 릴리스 후 **`KVID_MIN_VERSION` 을 bump** 한다.

4. **최신화 = 원클릭.** `pnpm doctor` → `kvid update` + `kvid init`. `docs/SETUP.md` 에도 안내.
   - **Skills 는 카피를 커밋하지 않는다** — `apm.yml`(`kvidai/kvidai-skills`)로 auto-pull, 또는 `kvid init`. 구버전 드리프트 방지.

## API 가 바뀔 때 체크리스트 (업스트림 담당)

- [ ] `kvidai-cli` 에서 변경 흡수 → 하위호환 유지 시도 → `git tag vX.Y.Z` push (release.yml)
- [ ] 필요 스펙이면 template/custom 의 `KVID_MIN_VERSION` bump (양쪽)
- [ ] (스킬 동작 변경 시) `kvidai-skills` 갱신
- [ ] 클라이언트: `pnpm doctor` (또는 `kvid update`)

> 관련: `.claude/rules/video-generation-rules.md`(콘텐츠 원칙), `docs/SETUP.md`(설치·갱신).
