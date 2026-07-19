# Brief → Card News Template

## Usage

Pass this template to Claude to generate card news assets.
Save result to `packages/cardnews-template/in/{set}/brief.json`.

---

## Input Fields

- **Brand**: (kvidai / affy)
- **Topic**: (e.g., 3 core strategies for AI marketing automation)
- **Target audience**: (e.g., marketing managers, startup founders)
- **Slide count**: (recommended 4-8)
- **Format**: (square 1080×1080 / portrait 1080×1350)
- **Distribution**: (Instagram / Facebook / both)

---

## Generation Request

Generate the following:

### 1. Slide array (for `brief.json` → `slides`)

```json
[
  { "layout": "title", "headline": "cover title ≤15 chars", "body": "subtitle ≤20 chars" },
  { "layout": "content", "headline": "headline ≤20 chars", "body": "body ≤40 chars" },
  ...
  { "layout": "closing", "headline": "CTA ≤15 chars", "body": "sub-CTA ≤20 chars" }
]
```

Headline rules:
- Each slide must convey meaning independently
- title/closing: ≤20 chars; content body: ≤40 chars
- Use line breaks (`\n`) to control wrapping when needed

### 2. Caption + hashtags

```json
{
  "caption": "Instagram/Facebook caption ≤2200 chars\nFirst line must be a scroll-stopping hook",
  "hashtags": ["#hashtag1", "#hashtag2", ...]
}
```

### 3. Complete brief.json

Output the full `packages/cardnews-template/in/{set}/brief.json` content.
