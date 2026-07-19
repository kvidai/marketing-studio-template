# vision-checker

Cheap vision QA tool for one image or one ordered image directory.

## Scope

This directory should be treated as an independently distributable skill/package.

- Runtime, scripts, env examples, skill metadata, and QA evidence belong here.
- The affyink repo root rules do **not** define vision-checker packaging decisions.
- However, while working inside this affyink workspace, persistent plan files still stay in `/home/ubuntu/code_workspace/affyink/.claude/plans/` because that is the active workspace policy.
- For reuse in another repository, copy this entire folder into `OTHER_REPO/.agents/skills/vision-checker` and run `pnpm --dir .agents/skills/vision-checker install`.

## Purpose

Use this tool to check whether a screenshot, slide export, video frame set, or edited image looks visually usable without sending the image into the main agent context.

Return compact JSON only.

Single-image result:
- `pass`
- `confidence`
- `issues[]`
- `summary`

Directory result:
- `batch`
- `target`
- `total`
- `passCount`
- `failCount`
- `results[]`

## Entry Points

- `./SKILL.md` — installable skill entrypoint
- `./agents/openai.yaml` — skill list metadata
- `./check-image.ts` — main CLI
- `./lib/targets.ts` — file or directory target resolution
- `./lib/providers.ts` — provider routing and subprocess wrappers
- `./claude-wrapper.sh` — reusable Claude CLI wrapper for `provider=claude-cli`
- `./tests/vision-checker.test.ts` — unit tests
- `./package.json` — local `check`, `test`, `claude-wrapper` scripts

## Preferred Commands

Run from a host repo root:

```bash
pnpm --dir .agents/skills/vision-checker install
pnpm --dir .agents/skills/vision-checker test
pnpm --dir .agents/skills/vision-checker check /absolute/path/to/image-or-dir
```

Run from this directory or from a standalone extracted repo root:

```bash
pnpm test
pnpm check /absolute/path/to/image-or-dir
```

## Provider Notes

- `openai-compatible` supports OpenRouter and similar endpoints.
- `codex-cli` uses real `codex exec` subprocess image input.
- `claude-cli` is wrapper-based because `claude -p` has no official direct local image flag.
- `custom-cli` is for any other command-template wrapper.

## Env Notes

See `./.env.example`.

Important vars:
- `VISION_CHECKER_PROVIDER`
- `VISION_CHECKER_MODEL`
- `VISION_CHECKER_BASE_URL`
- `VISION_CHECKER_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `VISION_CHECKER_CLAUDE_COMMAND`

For Claude wrapper reuse:

```bash
VISION_CHECKER_CLAUDE_COMMAND='bash {{cwd}}/claude-wrapper.sh --prompt-file {{prompt_file}} --schema-file {{schema_file}} --output-file {{output_file}} --model claude-sonnet-4-20250514 -- {{image_flags}}'
```

## Rules

- One run should target either one image file or one ordered image directory.
- Keep original screenshots as source of truth.
- Overview image is layout-only; native tiles are authoritative.
- Prefer `--prompt-file` over `--prompt-text` for reusable checks.
- Vision-checker-owned scripts stay in `./package.json`, not repo root `package.json`.
- Vision-checker-owned runtime and docs stay in this directory, not under unrelated repo tool folders.
- Keep host-repo assumptions out of runtime code whenever possible so this folder can be promoted to its own repo with minimal edits.
- If you change provider behavior, re-run live validation and update `./docs/qa/` evidence.

## QA Evidence

Latest live validation files:
- `./docs/qa/qa-vision-checker-live-validation-20260503.md`
- `./docs/qa/openrouter-live-20260503.json`
- `./docs/qa/codex-subprocess-live-20260503.json`
- `./docs/qa/claude-subprocess-live-20260503.json`
