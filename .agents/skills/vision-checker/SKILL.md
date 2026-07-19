---
name: vision-checker
description: Run low-cost visual QA on one image or an ordered image directory with OpenRouter, Codex CLI subprocesses, or Claude wrapper subprocesses. Use this when validating screenshots, slide exports, design edits, or video frames without placing raw images into the main conversation context.
---

# vision-checker

Use this skill for low-cost pass/fail style visual review.

## Workflow

1. Keep the original image unchanged.
2. Run the checker on one image or one ordered image directory.
3. Read JSON only.
4. Return pass/fail, confidence, issues, and summary.
5. For directory input, treat the output as a batch report.

## Important: "running inside Codex CLI" is not the same as `--provider codex-cli`

These are different things.

- **Running inside Codex CLI**
  - Means you are launching the command from a Codex session.
  - It does **not** mean the checker should switch to the `codex-cli` provider.
- **`--provider codex-cli`**
  - Means the checker should use `codex exec` as its internal vision backend.
  - Use this only when you want to force the Codex subprocess provider.

Default behavior:

- If `.env` contains `VISION_CHECKER_PROVIDER=openai-compatible`, that value is used.
- If `.env` contains `OPENROUTER_API_KEY` or `VISION_CHECKER_API_KEY`, the default provider becomes `openai-compatible`.
- If you pass `--provider ...`, that explicit flag overrides `.env`.

So when someone says, "Run it now, I am in Codex CLI," the usual command is still:

```bash
pnpm --dir .agents/skills/vision-checker check /abs/path/to/image.png
```

That command runs *from* a Codex CLI session, but it still follows the `.env` provider default such as OpenRouter.

This is a different command with a different meaning:

```bash
pnpm --dir .agents/skills/vision-checker check /abs/path/to/image.png --provider codex-cli
```

That command explicitly forces the Codex subprocess provider instead of OpenRouter.

## Basic usage

**One-off instruction with prompt text only:**
```bash
pnpm --dir .agents/skills/vision-checker check /abs/path/to/image.png \
  --prompt-text "Describe everything visible, then check whether the layout looks correct."
```

**Reusable prompt file plus image-specific instruction:**
```bash
pnpm --dir .agents/skills/vision-checker check /abs/path/to/image.png \
  --prompt-file /abs/path/to/prompts/my-checks.md \
  --prompt-text "This is the [screen/slide/frame name]. Also verify [specific requirement]."
```

**Multiple prompt files:**
```bash
pnpm --dir .agents/skills/vision-checker check /abs/path/to/image.png \
  --prompt-file .agents/skills/vision-checker/prompts/ui-screenshot.md \
  --prompt-file /abs/path/to/prompts/common-checks.md \
  --prompt-file /abs/path/to/prompts/feature-specific-checks.md \
  --prompt-text "Additional one-off instruction."
```

`--prompt-file` and `--prompt-text` can be repeated in any order. They are concatenated in the exact order provided.

Built-in prompt: `./prompts/ui-screenshot.md` for UI rendering checks.

## Prompt cache semantics

- `--prompt-file` and `--prompt-text` can be repeated and mixed in any order.
- Cache keys should be derived from the final concatenated prompt content after newline normalization, not from raw file paths.
- Prompt filename and prompt path are not part of the cache key.
- Image filename and image path are not part of the cache key.
- If two prompt files have identical contents, they should map to the same cache key even when the file paths differ.
- Local cache reuse is allowed only when prompt text and exact image bytes match together with provider/model/options.
- Put stable shared review rules in `--prompt-file`; reserve `--prompt-text` for one-off run-specific deltas.

## Runtime controls

- Local result cache is JSON-file based under `VISION_CHECKER_TMP_DIR` or `/tmp/affyink-ui-vision-check`.
- Default cache mode is read + write enabled unless `--no-cache` is passed.
- Blank or near-monochrome images fail deterministically before provider calls unless `--force-provider` is passed.
- Default review mode is **full-image-first** with `0` tiles.
- Add `--tiles <n>` only when you need optional zoom crops for dense detail checks.
- Directory batches run with concurrency `2` by default and accept `--concurrency <n>`.
- Temporary overview/tile artifacts are cleaned by default; use `--keep-artifacts` to preserve them.

## Commands

Embedded inside another repo:

```bash
pnpm --dir .agents/skills/vision-checker install
pnpm --dir .agents/skills/vision-checker test
pnpm --dir .agents/skills/vision-checker check /absolute/path/to/image-or-dir
```

Standalone repo root after extraction:

```bash
pnpm install
pnpm test
pnpm check /absolute/path/to/image-or-dir
```

When using `pnpm --dir`, prefer absolute input paths.

## CLI args

`check <image-file-or-dir>`

Optional args:

- `--provider`
  - `openai`
  - `anthropic`
  - `openai-compatible`
  - `codex-cli`
  - `claude-cli`
  - `custom-cli`
- `--model`
  - example values:
    - `google/gemini-3.1-flash-lite-preview`
    - `claude-haiku-4-5`
    - `qwen/qwen3-vl-8b-instruct`
    - `x-ai/grok-2-vision-1212`
- `--base-url`
  - example: `https://openrouter.ai/api/v1`
- `--profile`
  - example: `fast`
- `--prompt-text`
- `--prompt-file`
- `--output`
- `--tiles`
  - default: `0`
  - opt-in zoom crops for detail inspection
- `--overview-width`
- `--keep-artifacts`
- `--cache-read`
- `--cache-write`
- `--no-cache`
- `--force-provider`
- `--concurrency`

## Provider notes

- `openai-compatible` works with OpenRouter-like endpoints.
- `codex-cli` uses real `codex exec` image input.
- `codex-cli` is a provider name, not a synonym for "currently using Codex CLI."
- `claude-cli` uses `./claude-wrapper.sh` through `VISION_CHECKER_CLAUDE_COMMAND`.
- Directory input returns a batch JSON object with `total`, `passCount`, `failCount`, and per-image `results[]`.

## Model guidance — cheap first

Provider priority order, cheapest first:

### 1. `openai-compatible` (OpenRouter) — default when OpenRouter-style env is present

If `OPENROUTER_API_KEY` or `VISION_CHECKER_API_KEY` is present, the default provider is `openai-compatible`.

```bash
--provider openai-compatible --model openai/gpt-5.4-nano
--provider openai-compatible --model anthropic/claude-haiku-4-5
# OPENROUTER_API_KEY alone is enough for the default provider to become openai-compatible
# VISION_CHECKER_PROVIDER=openai-compatible is still recommended when you want the intent to be explicit
```

Representative low-cost model options:
- `google/gemini-3.1-flash-lite-preview`, `openai/gpt-5.4-nano`
- `x-ai/grok-4.3`, `x-ai/grok-4-fast`
- `anthropic/claude-haiku-4-5`
- `qwen/qwen3.6-flash`, `z-ai/glm-5v-turbo`

### 2. `codex-cli` — only when you explicitly want the Codex subprocess provider

This is **not** automatically selected just because the current shell is Codex CLI.
Use it only when you intentionally want `codex exec` to be the vision backend.

```bash
--provider codex-cli
# default model: gpt-5.4-nano
# switch to gpt-5.4-mini if nano is not reliable enough for the image
```

### 3. `anthropic` — when using a direct Anthropic API key

```bash
--provider anthropic --model claude-haiku-4-5
```

### 4. `claude-cli` — last resort

Use only when the other providers are unavailable.

```bash
VISION_CHECKER_CLAUDE_COMMAND='bash {{cwd}}/claude-wrapper.sh --prompt-file {{prompt_file}} --schema-file {{schema_file}} --output-file {{output_file}} --model claude-haiku-4-5-20251001 -- {{image_flags}}'
--provider claude-cli
```

> `--model` is configured inside `VISION_CHECKER_CLAUDE_COMMAND` for this provider, not through the checker CLI flag.

## Cost benchmark

| Provider | Cost/image |
|---|---|
| `openai-compatible` (OpenRouter haiku 4.5) | **$0.0056** |
| `codex-cli` (gpt-5.4-nano) | **~$0.0025** estimated |
| `claude-cli` (haiku 4.5) | **$0.0329** |

## Files to know

- `./check-image.ts`
- `./lib/providers.ts`
- `./lib/targets.ts`
- `./claude-wrapper.sh`
- `./.env.example`
- `./prompts/ui-screenshot.md`
- `./docs/qa/`

## Rules

- Use one image or one ordered image directory per run.
- Prefer `--prompt-file` for reusable checks.
- Keep scripts owned inside this directory.
- If provider behavior changes, rerun tests and refresh `./docs/qa/` evidence.
