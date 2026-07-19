# QA - Vision Checker Live Validation - 2026-05-03

## Summary

Validated `.agents/skills/vision-checker` live against the real screenshot below using credentials from `/home/ubuntu/code_workspace/affyink/.env`.

- Screenshot: `docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png`
- Tool entrypoint: `.agents/skills/vision-checker/package.json`
- Test date: 2026-05-03
- Result: **PASS** for OpenRouter API mode, Codex subprocess mode, and Claude wrapper subprocess mode.

Saved machine-readable outputs:

- `.agents/skills/vision-checker/docs/qa/openrouter-live-20260503.json`
- `.agents/skills/vision-checker/docs/qa/codex-subprocess-live-20260503.json`
- `.agents/skills/vision-checker/docs/qa/claude-subprocess-live-20260503.json`

## Commands Run

### 1) Tool test suite

```bash
pnpm --dir .agents/skills/vision-checker test
```

Result:

```text
# tests 5
# pass  5
# fail  0
```

### 2) OpenRouter live API test

Environment source:

```bash
source .env
```

Command:

```bash
pnpm --dir .agents/skills/vision-checker check \
  ../../docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png \
  --provider openai-compatible \
  --model openai/gpt-4.1-mini \
  --prompt-text 'Check for obvious broken rendering only. Return pass true if the inbox UI looks usable.' \
  --output docs/qa/openrouter-live-20260503.json
```

Result:

- Provider: `openai-compatible`
- Model: `openai/gpt-4.1-mini`
- Pass: `true`
- Confidence: `0.90`
- Issues: none

### 3) Codex subprocess live test

Command:

```bash
pnpm --dir .agents/skills/vision-checker check \
  ../../docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png \
  --provider codex-cli \
  --model gpt-4.1-mini \
  --prompt-text 'Check for obvious broken rendering only. Return pass true if the inbox UI looks usable.' \
  --output docs/qa/codex-subprocess-live-20260503.json
```

Result:

- Provider: `codex-cli`
- Model: `gpt-4.1-mini`
- Pass: `true`
- Confidence: `0.95`
- Issues: none

### 4) Claude wrapper subprocess live test

Wrapper env used for this validation:

```bash
export VISION_CHECKER_CLAUDE_COMMAND='bash {{cwd}}/claude-wrapper.sh --prompt-file {{prompt_file}} --schema-file {{schema_file}} --output-file {{output_file}} --model claude-sonnet-4-20250514 -- {{image_flags}}'
```

Command:

```bash
pnpm --dir .agents/skills/vision-checker check \
  ../../docs/ui-screenshots/outreach-inbox/affiliate-inbox_20260503.png \
  --provider claude-cli \
  --prompt-text 'Check for obvious broken rendering only. Return pass true if the inbox UI looks usable.' \
  --output docs/qa/claude-subprocess-live-20260503.json
```

Result:

- Provider: `claude-cli`
- Model: `claude-cli-template` (wrapper template injects `claude-sonnet-4-20250514`)
- Pass: `true`
- Confidence: `0.88`
- Issues:
  - empty inbox content area may be expected empty-state behavior, but it could also hide a data-loading failure

## Bugs Found During Live Validation

### Fixed 1) OpenRouter key fallback was missing

Symptom:
- `--provider openai-compatible` failed unless `VISION_CHECKER_API_KEY` was set explicitly.
- Real-world expectation was that `OPENROUTER_API_KEY` from `.env` should work directly.

Fix:
- `.agents/skills/vision-checker/lib/providers.ts`
- Added fallback order:
  - `VISION_CHECKER_API_KEY`
  - `OPENROUTER_API_KEY`
  - `OPENAI_API_KEY`
- Added implicit default base URL `https://openrouter.ai/api/v1` when `OPENROUTER_API_KEY` is present.

### Fixed 2) Codex subprocess prompt passing was wrong

Symptom:
- `codex exec` treated the prompt as missing and waited for stdin.

Fix:
- `.agents/skills/vision-checker/lib/providers.ts`
- Wrote prompt to a temp file and piped it to `codex exec -`.

### Fixed 3) Codex JSON schema was rejected

Symptom:
- Codex returned `invalid_json_schema` because `summary` existed in properties but was missing from `required`.

Fix:
- `.agents/skills/vision-checker/lib/providers.ts`
- Added `summary` to the required schema keys for subprocess structured output.

### Fixed 4) Claude wrapper JSON output was not normalized correctly

Symptom:
- `claude -p --output-format json` writes a wrapper object with `structured_output`.
- The checker parsed the wrapper object directly, which caused false negatives even when Claude returned a passing structured result.

Fix:
- `.agents/skills/vision-checker/lib/providers.ts`
- Added `unwrapModelJson()` to extract `structured_output` when present.
- Added a regression test for this case.

## Packaging Decision Verified

Vision-checker-owned entrypoints are now kept in:

- `.agents/skills/vision-checker/package.json`

Not in monorepo root `package.json`.

Primary commands going forward:

```bash
pnpm --dir .agents/skills/vision-checker test
pnpm --dir .agents/skills/vision-checker check ../../docs/ui-screenshots/...png ...
```

## Final Assessment

The checker is now verified working in three real modes:

1. OpenRouter via `openai-compatible`
2. Codex CLI subprocess via `codex-cli`
3. Claude Code wrapper subprocess via `claude-cli`

The saved JSON reports under `.agents/skills/vision-checker/docs/qa/` are the review artifacts for this validation run.
