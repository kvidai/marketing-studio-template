# vision-checker

## Features
- image or image-directory visual QA CLI — ✅
- OpenRouter / OpenAI-compatible provider — ✅
- Codex subprocess provider — ✅
- Claude wrapper subprocess provider — ✅
- prompt text / prompt file input — ✅
- local QA evidence files — ✅
- runtime JSON result cache — ✅
- batch concurrency + artifact cleanup controls — ✅

## Cost benchmark (1920×1080, 실측 2026-05-03)

| Provider | Model | 내부 overhead | Cost/image |
|---|---|---|---|
| OpenRouter (`openai-compatible`) | `anthropic/claude-haiku-4-5` | 0 tokens | **$0.0056** |
| Codex CLI (`codex-cli`) | `gpt-5.4-nano` | ~14,928 tokens | **~$0.0025** (추정, 공식 가격 미공개) |
| Claude CLI (`claude-cli`) | `claude-haiku-4-5` | ~137,394 tokens (cache) | **$0.0329** |

- Codex overhead(~15k)는 Claude CLI(~137k)의 1/9 수준 — gpt-5.4-nano 단가가 저렴해 총 비용은 최저일 수 있음
- Claude CLI는 `--system-prompt ""` + `/tmp` 실행 후에도 Claude Code 내장 context 제거 불가
- 이미지 토큰(task-specific): OpenRouter 4,861 / Codex ~5,470 — 실제 vision 작업량은 동일

## Status
Working. Use `pnpm --dir .agents/skills/vision-checker check ...` or run directly inside this folder.

This folder is the real home of the reusable vision-checker skill/package.

It is structured so you can either:
- keep it embedded at `YOUR_REPO/.agents/skills/vision-checker`
- or promote this folder into its own standalone repo root with minimal changes

## Reuse in another repo
- copy this whole folder to `YOUR_REPO/.agents/skills/vision-checker`
- run `pnpm --dir .agents/skills/vision-checker install`
- then use:
  - `pnpm --dir .agents/skills/vision-checker test`
  - `pnpm --dir .agents/skills/vision-checker check /absolute/path/to/image-or-dir ...`

## Standalone repo mode
- use this folder itself as repo root
- run:
  - `pnpm install`
  - `pnpm test`
  - `pnpm check /absolute/path/to/image-or-dir ...`

## Prompt cache semantics
- `--prompt-file` and `--prompt-text` may be repeated and mixed in any order.
- Cache identity should be based on the final concatenated prompt content after newline normalization, not on prompt file paths.
- Identical prompt file contents from different paths should reuse the same cache key.
- Prompt filename and prompt path are never part of the cache key.
- Image filename and image path are never part of the cache key.
- Local cache reuse is allowed only when prompt text, exact image bytes, provider/model, and review-affecting options match.
- Keep reusable rubric text in `--prompt-file`; use `--prompt-text` only for one-off per-run deltas.

## Runtime controls
- Default cache mode: read + write enabled
- Disable local cache entirely: `--no-cache`
- Force explicit read/write: `--cache-read`, `--cache-write`
- Default blank-image behavior: deterministic precheck fail before provider call
- Bypass precheck fast-fail: `--force-provider`
- Default batch concurrency: `2`
- Override batch concurrency: `--concurrency <n>`
- Default tile mode: `0` tiles (full-image-first review)
- Opt into zoom tiles only when needed: `--tiles <n>`
- Default artifact behavior: generated overview/tile temp files are cleaned after each run
- Preserve temp artifacts: `--keep-artifacts`
- Local cache/report location: `VISION_CHECKER_TMP_DIR` or `/tmp/affyink-ui-vision-check`

## Full-image-first review policy
- Default behavior is **full screenshot only**.
- Tiles are **optional zoom aids**, not mandatory evidence.
- Use `--tiles <n>` only when you need extra help reading dense text, tables, or tiny controls.
- If tiles are present, pass/fail should still be anchored to the full screenshot rather than partial crop boundaries.

## Files
- `SKILL.md` — installable skill entrypoint
- `agents/openai.yaml` — skill UI metadata
- `CLAUDE.md` — AI instructions
- `AGENTS.md` — symlink to `CLAUDE.md`
- `.env.example` — env example
- `package.json` — local scripts
- `check-image.ts` — main CLI
- `claude-wrapper.sh` — reusable Claude wrapper
- `lib/` — shared logic
- `tests/` — test files
- `docs/qa/` — saved validation outputs
