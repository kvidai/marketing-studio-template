# Cheap Vision UI Screenshot Checker

> **Last Updated**: 2026-05-03
> **Version**: v1.9.0
> **Status**: done

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-03 | v1.9.0 | Added image-directory input support and tightened the skill/package structure so the entire `vision-checker` folder can be promoted into a standalone repo with minimal changes | Codex |
| 2026-05-03 | v1.8.0 | Reopened to add directory input support for image batches such as PPT pages and video-edit frames while keeping the vision-checker reusable as a repo-scoped skill | Codex |
| 2026-05-03 | v1.7.0 | Reopened the plan to extract the live-tested Claude CLI command into a reusable wrapper script under `.agents/skills/vision-checker/` and document the stable invocation template | Codex |
| 2026-05-03 | v1.6.0 | Completed live validation using `.env` credentials, moved vision-checker-owned entrypoints fully into `.agents/skills/vision-checker/package.json`, saved QA evidence under `.agents/skills/vision-checker/docs/qa/`, and fixed OpenRouter/Codex/Claude subprocess issues found during real runs | Codex |
| 2026-05-03 | v1.5.0 | Reopened the plan to validate live OpenRouter execution, verify subprocess modes, and clean up `.env.example` defaults/secrets documentation | Codex |
| 2026-05-03 | v1.4.0 | Added `.agents/skills/vision-checker/package.json` so the checker can run as a standalone local package in addition to root-level wrapper scripts | Codex |
| 2026-05-03 | v1.3.0 | Generalized the tool naming toward vision-wide use cases and added `--prompt-text` / `--prompt-file` so callers can supply reusable review instructions with provider-cache-friendly prompt reuse | Codex |
| 2026-05-03 | v1.2.0 | Finalized `.agents/skills/vision-checker/**` refactor and locked v1 policy to single-image input only; directory input rejected by design to prevent accidental bulk LLM spend | Codex |
| 2026-05-03 | v1.1.0 | Refactor runtime code from `scripts/**` into `.agents/skills/vision-checker/**` and keep the Claude skill wrapper-only for later extraction into `dev-standards` | Codex |
| 2026-05-03 | v1.0.0 | Implemented TypeScript sidecar CLI, image prechecks/tiling, OpenAI/Anthropic/compatible providers, Codex subprocess mode, template CLI wrappers, Claude subagent/skill, screenshot metadata capture, and docs/tests | Codex |
| 2026-05-03 | v0.1.0 | Initial plan for sidecar cheap-model UI screenshot checker for Claude Code/Codex CLI | Codex |

---

## Problem Summary

1920x1080 UI screenshots sent directly into a main Claude Code/Codex session running Sonnet/Opus/deep GPT models consume too much token budget. The implemented workflow is:

```text
Main agent: code/planning/reasoning only
Cheap vision checker: screenshot visual QA only
Main context: reads compact JSON result only, never the image
```

Final decisions implemented:

- Do not rely on exhaustive Playwright locator assertions for every UI element.
- Preserve original screenshots in `docs/ui-screenshots/**`.
- Use downscaled overview only for global layout; use native 1x tiles for fine rendering checks.
- Support three execution tiers:
  1. API sidecar (`openai`, `anthropic`, `openai-compatible`)
  2. Codex subprocess (`codex-cli`)
  3. Explicit command-template wrappers (`claude-cli`, `custom-cli`)
- Grok/Qwen/Chinese models are supported through `openai-compatible` endpoints in v1.
- Runtime implementation lives under `.agents/skills/vision-checker/**`, while `.claude/skills/vision-checker/` stays wrapper/instructions only.
- `.agents/skills/vision-checker/package.json` allows standalone execution from the tool directory, which makes later extraction to `dev-standards` easier.
- CLI input policy supports both single-image and directory inputs. Directory input enables PPT/video-frame batch QA workflows.
- Callers can provide user-specific review instructions through `--prompt-text` or `--prompt-file`. For reusable checks, `--prompt-file` is preferred because identical prompt content is easier to cache across repeated runs.

---

## Design Summary

### Sidecar CLI

```bash
pnpm --dir .agents/skills/vision-checker check ../../docs/ui-screenshots/foo.png
pnpm --dir .agents/skills/vision-checker check ../../docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png --provider openai --model gpt-4.1-mini --prompt-text "Check crop and subtitle alignment"
pnpm --dir .agents/skills/vision-checker check ../../docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png --provider openai --model gpt-4.1-mini --prompt-file ../../prompts/inbox-visual-check.md
pnpm --dir .agents/skills/vision-checker check ../../docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png --provider codex-cli --profile fast
pnpm --dir .agents/skills/vision-checker check ../../docs/ui-screenshots/ppt-export/
```

Single-image output shape:

```json
{
  "pass": true,
  "confidence": 0.92,
  "screenshot": "docs/ui-screenshots/foo.png",
  "provider": "openai",
  "model": "gpt-4.1-mini",
  "issues": [],
  "signals": {
    "width": 1920,
    "height": 1080,
    "blankLike": false,
    "consoleErrors": 0
  }
}
```

Directory (batch) output shape:

```json
{
  "batch": true,
  "target": "docs/ui-screenshots/ppt-export/",
  "total": 12,
  "passCount": 11,
  "failCount": 1,
  "results": [ ... ]
}
```

### Image handling policy

- Preserve original screenshot source.
- Generate temporary review artifacts under `/tmp/affyink-ui-vision-check/`:
  - `overview.jpg`
  - `tiles/*.png`
  - `report.json`
- Cheap model prompt explicitly treats overview as layout-only and tiles as authoritative.
- Accept either a single image file or a directory of ordered image files.
- Accept either `--prompt-text` or `--prompt-file` for user-provided review criteria.

### Selector-light verification

Implemented prechecks:

- screenshot file exists
- width/height extracted
- blank-like / low-variance heuristic
- optional console/page/request error metadata from Playwright screenshot runs

### Provider routing

| Provider | Intended use | Notes |
|----------|--------------|-------|
| `openai` | GPT mini vision checker | Uses Responses API image input. |
| `anthropic` | Claude Haiku vision checker | Uses Messages API image blocks. |
| `openai-compatible` | Grok/Qwen/OpenRouter/local/vLLM/other compatible endpoints | Uses chat completions style image input. |
| `codex-cli` | Cheap multimodal subprocess | Uses `codex exec --image` with `--output-schema`. |
| `claude-cli` | Wrapper subprocess | Uses `VISION_CHECKER_CLAUDE_COMMAND` template; explicit because non-interactive Claude CLI has no official local image flag. |
| `custom-cli` | Any other local wrapper | Uses `VISION_CHECKER_CUSTOM_CLI_COMMAND` template. |

Configuration precedence:

1. CLI flags: `--provider`, `--model`, `--base-url`, `--profile`, `--prompt-text`, `--prompt-file`
2. Environment variables: `VISION_CHECKER_PROVIDER`, `VISION_CHECKER_MODEL`, `VISION_CHECKER_BASE_URL`
3. Defaults / detected provider

### Claude Code/Codex integration

- Claude Code subagent: `.claude/agents/vision-checker.md`
- Claude skill: `.claude/skills/vision-checker/SKILL.md`
- Codex integration: existing `fast` profile documented, but sidecar-first remains the policy.
- Main agent rule: read JSON only, not raw screenshot images.
- Prefer `--prompt-file` when the same evaluation rubric is reused across many screenshots.

### Refactor rationale

- `.agents/skills/vision-checker/**` makes the runtime code clearly tool-owned instead of Claude-owned.
- The skill stays thin: wrapper, invocation rules, and examples only.
- This separation makes later migration into a standalone `dev-standards` repo simpler.
- It also keeps the tool reusable from shell, CI, Codex, and Claude without depending on `.claude/skills/**` as the executable home.

---

## Implementation & Test Status

| File | Feature | Impl | Unit Test | Integration Test |
|------|---------|------|-----------|------------------|
| `.agents/skills/vision-checker/check-image.ts` | File or directory target resolution and portable CLI usage text | ✅ | ✅ | ✅ |
| `.agents/skills/vision-checker/lib/targets.ts` | Ordered file-or-directory image target discovery | ✅ | ✅ | N/A |
| `.agents/skills/vision-checker/lib/types.ts` | Batch result types for directory runs | ✅ | ✅ | N/A |
| `.agents/skills/vision-checker/lib/providers.ts` | OpenAI/Anthropic/compatible + Codex/template CLI adapters | ✅ | ⏭️ | ⏭️ |
| `.agents/skills/vision-checker/lib/image-prep.ts` | Preserve original, generate overview + native tiles in `/tmp` | ✅ | ✅ | ✅ |
| `.agents/skills/vision-checker/lib/precheck.ts` | Dimension/blank-like/metadata prechecks | ✅ | ✅ | ✅ |
| `.agents/skills/vision-checker/package.json` | Self-contained package metadata for standalone use | ✅ | ✅ | ✅ |
| `.agents/skills/vision-checker/tsconfig.json` | Local TypeScript config for standalone extraction | ✅ | N/A | N/A |
| `.agents/skills/vision-checker/.gitignore` | Local ignore rules for extracted repo mode | ✅ | N/A | N/A |
| `.agents/skills/vision-checker/SKILL.md` | Embedded-vs-standalone usage guidance and directory input docs | ✅ | N/A | N/A |
| `.agents/skills/vision-checker/CLAUDE.md` | AI-facing standalone package guidance | ✅ | N/A | N/A |
| `.agents/skills/vision-checker/README.md` | Human-facing reuse and standalone-repo notes | ✅ | N/A | N/A |
| `.agents/skills/vision-checker/tests/vision-checker.test.ts` | JSON/image-prep/precheck/directory input tests | ✅ | ✅ | ⏭️ |
| `.claude/agents/vision-checker.md` | Claude Code cheap screenshot checker subagent using Haiku | ✅ | ⏭️ | ⏭️ |
| `.claude/skills/vision-checker/SKILL.md` | Skill wrapper/instructions for sidecar CLI | ✅ | ⏭️ | ⏭️ |
| `docs/browser-testing.md` | Document no-main-agent-image policy and cheap checker workflow | ✅ | ⏭️ | ⏭️ |
| `scripts/screenshot-lib.ts` | Optional console/page error capture metadata for screenshot runs | ✅ | ⏭️ | ⏭️ |
| `docs/qa/qa-vision-checker-live-validation-20260503.md` | Saved live validation report with OpenRouter + Codex + Claude evidence | ✅ | ⏭️ | ✅ |

---

## Test Execution Results

```text
> @affyink/vision-checker@0.1.0 test
> tsx --test tests/vision-checker.test.ts

# tests 7
# pass  7
# fail  0

Live validation artifacts:
- .agents/skills/vision-checker/docs/qa/openrouter-live-20260503.json
- .agents/skills/vision-checker/docs/qa/codex-subprocess-live-20260503.json
- .agents/skills/vision-checker/docs/qa/claude-subprocess-live-20260503.json
```

---

## Verification

- `pnpm --dir .agents/skills/vision-checker test` ✅
- `pnpm test` (from `.agents/skills/vision-checker`) ✅

Both test runs passed with 7/7 tests green.

---

## Outcome

- `vision-checker` now accepts either a single image file or a directory of ordered image files.
- Directory runs return a stable batch JSON shape with totals plus per-image results.
- The folder now carries its own `package.json`, `tsconfig.json`, `.gitignore`, docs, and skill metadata so it can stay embedded under `.agents/skills/vision-checker` or be promoted into its own repo root with minimal edits.

---

## Remaining Tasks

- [x] Choose implementation language: TypeScript preferred to match existing `tsx scripts/*.ts`.
- [x] Implement image precheck + tiling first so obvious failures can be caught before paid vision calls.
- [x] Implement provider adapters with environment-based secrets and no committed keys.
- [x] Keep vision-checker-owned `check` / `test` scripts in `.agents/skills/vision-checker/package.json` instead of monorepo root `package.json`.
- [x] Add `.agents/skills/vision-checker/package.json` for standalone local execution.
- [x] Add Claude Code subagent/skill wrapper that uses cheap model and returns compact JSON summary only.
- [x] Document Codex usage with existing fast profile plus sidecar-first policy.
- [x] Update screenshot docs to state: original 1920x1080 screenshot stays source of truth; downscaled overview is never authoritative for fine UI rendering.
- [x] Move runtime implementation into `.agents/skills/vision-checker/**`.
- [x] Add user instruction injection via `--prompt-text` / `--prompt-file`.
- [x] Add directory input support for image batches (PPT pages, video-edit frames).
- [x] Add `lib/targets.ts` for ordered file-or-directory target discovery.
- [x] Add batch result types (`lib/types.ts`) for directory runs.
- [x] Add `tsconfig.json`, `.gitignore`, CLAUDE.md, README.md for standalone repo promotion.

---

## Notes

- Shared logic is intentionally concentrated under `.agents/skills/vision-checker/` so it can be moved later into a dedicated `dev-standards` repo with minimal reshaping.
- `claude-cli` support is implemented as an explicit command-template wrapper because local non-interactive Claude CLI does not currently expose an official image flag comparable to Codex `--image`.
- For Grok/Qwen or other Chinese/open models, use `openai-compatible` with `--base-url` and `--model`.
- openrouter_api_key 사용해서 vision-checker 실제 작동하는지 test 하고, subprocess도 test해봐. 현재 claudecode codex-cli 전부 로그인 되어 있다. -> test report 작성 저장 내가 확인 가능하게. '/home/ubuntu/code_workspace/affyink/.env'. vision-checker 프로젝트용 .env.example 파일도 셋팅해. .claude/plans/20260503_wip_cheap-vision-checker.md

- 이게 말이 ui-screenshot 이지, [동영상 편집, 디자인 편집] image check response도 가능하잖아? -> 엄청 많이 여러군데 목적이 쓸거 같은데
- 야 cli input에 "유저 명령 text or 유저명령파일"(자동 cache 되게) 집어넣게 해야지, 유저가 뭘 어떻게 확인해달라고 할줄 알고
- 아니 vision-checker 쪽에나 skill쪽에 .env.example을 넣으라고 사용유저가 참고하게
- .agents/skills/vision-checker 에도 package.json 만들어서 단독실행 되게 해야지
- vision-checker 기능 자체를 테스트 하는  script는 .agents/skills/vision-checker/package.json 여기에 적어야지 왜 affyink/package.json에 적지 말고
- image dir도 인식 가능하게 해줘 일단, [ppt, video] 편집인식 같은거 할때 dir input 필요할거 같다.
- ✅ claude-cli vs openrouter haiku 4.5 비용 비교 (2026-05-03, infl-fashion-01-marketplace_20260502.png 1920x1080)

  | | OpenRouter haiku 4.5 | Claude CLI haiku 4.5 (`--system-prompt ""`) |
  |---|---|---|
  | 비용 (1장) | **$0.0056** | **$0.0329 (5.9x)** |
  | 소요시간 | ~3s | 21s |
  | image+prompt tokens | 4,861 | 4,861 |
  | Claude 내부 overhead | 없음 | cache_read 127,875 + cache_create 9,483 |

  결론: `--system-prompt ""` + `/tmp` 실행으로도 Claude CLI 내부 context(tool defs 등) 137k 토큰 overhead 제거 불가.
  현재 .env 설정(`openai-compatible` + `anthropic/claude-haiku-4-5`)이 정답.
- vision-checker 사용 `--prompt-text` `--prompt-file`을 2번 이상 랜덤으로 순서대로 입력을 계속 할 수 있게 개선.
- vision-checker 사용 `--prompt-text` `--prompt-file`을 2번 이상 랜덤으로 순서대로 입력 해도, llm input cache 적용 되나?
  ```
    현재는 캐시 안 됩니다. OpenRouter 응답 실측값:                                                                   
  cached_tokens: 0, cache_write_tokens: 0
                                                                                                                 
  이유:
                                                                                                                 
  ┌──────────────────────┬─────────────────────────────────────┬───────────────────────────────────────────────┐ 
  │        레이어        │              현재 상태              │                   캐싱 조건                   │ 
  ├──────────────────────┼─────────────────────────────────────┼───────────────────────────────────────────────┤ 
  │ Claude (OpenRouter)  │ cache_control 블록 없음             │ 명시적 cache_control: {type: "ephemeral"}     │ 
  │                      │                                     │ 필요                                          │
  ├──────────────────────┼─────────────────────────────────────┼───────────────────────────────────────────────┤ 
  │ OpenAI/Codex         │ 이미지가 base64 data URL로 매번     │ 1024+ 토큰의 동일한 prefix 필요               │   
  │ 자동캐시             │ 전달                                │                                               │ 
  └──────────────────────┴─────────────────────────────────────┴───────────────────────────────────────────────┘ 
  --prompt-file은 내용이 고정이라 캐싱 대상이지만, 이미지 tokens이 매 호출마다 앞에 붙어서 prefix가 달라집니다.    
  캐싱 효과를 얻으려면 callAnthropic (direct API)에서 text 블록에 cache_control 추가가 필요합니다.                 
  openai-compatible (OpenRouter)은 지원 여부가 모델마다 달라서 적용이 복잡합니다. 필요하면 구현할 수 있습니다.
  ```

## Miscellaneous
- vision-checker 파일 전부 kvidai/ affyink/ sync override
