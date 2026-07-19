# kvidai Video — Integration Guide

## Overview

Video generation + delivery via kvidai's own project/agent API — no local
rendering pipeline. Implemented in `packages/shared/send-video-kvidai`.

## Workflow

1. Write the video plan under `packages/video-template/prompts/{video-name}/`:
   - `brief.md`, `script.md`, `visuals.md`
2. Run:
   ```bash
   pnpm --filter video-template generate -- --project=prompts/{video-name} --output=outputs/{video-name}.mp4
   ```
3. This calls `generateVideo()`:
   - `POST {KVIDAI_BASE_URL}/video-project/create` — creates a project
   - `POST {KVIDAI_AGENT_BASE_URL}/agent/generate` — streams the AI agent,
     feeding it `brief.md` + `script.md` + `visuals.md` as one instruction
   - Prints the review/edit URL: `https://kvid.ai/en/editor/{projectId}`
4. Review and finish the edit in the kvidai editor. Video is rendered
   server-side by kvidai; there is no local render step or export file to
   manage on this end.

## Configuration

```bash
KVIDAI_API_KEY=...                                  # required
KVIDAI_BASE_URL=https://api.kvid.ai                  # default
KVIDAI_AGENT_BASE_URL=https://api.kvid.ai/agent      # default
```

## video-template's role

`packages/video-template/` holds:
- `prompts/` — scene structure, script prompts, visual direction
- `src/index.ts` — thin CLI wrapper calling `generateVideo()`
