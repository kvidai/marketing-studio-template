# video-template

Video generation via kvidai — no local rendering pipeline. Planning docs
live here; the actual generate+deliver call goes through
`@marketing-studio/send-video-kvidai`.

## Workflow

1. Write the video plan in `prompts/{video-name}/`:
   - `brief.md` — purpose, target, key message, distribution channels
   - `script.md` — full script, scene by scene
   - `visuals.md` — per-scene visual direction / image prompts
2. Run generation:
   ```bash
   pnpm --filter video-template generate -- --project=prompts/{video-name} --output=outputs/{video-name}.mp4
   ```
   This creates a kvidai project, streams the AI agent (reading `brief.md` +
   `script.md` + `visuals.md` as the instruction) to build the video, and
   prints the review/edit URL (`https://kvid.ai/en/editor/{projectId}`).
3. Review and finish the edit in the kvidai editor at that URL.

## This folder's role

- `prompts/` — scene structure, script, and visual-direction planning docs
- `src/index.ts` — thin CLI wrapper around `@marketing-studio/send-video-kvidai`

## prompts/ layout

```
prompts/
├── scene-structure.md    # scene planning guide
├── script-writer.md      # AI script-generation prompt
├── visual-direction.md   # visual-direction prompt
└── {video-name}/         # per-video planning docs (brief/script/visuals)
```
