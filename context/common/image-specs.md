# Image Specs by Channel

## Instagram

| Format | Resolution | Ratio | Max size |
|--------|-----------|-------|---------|
| Square | 1080×1080 | 1:1 | 30MB |
| Portrait | 1080×1350 | 4:5 | 30MB |
| Landscape | 1080×566 | 1.91:1 | 30MB |
| Reels | 1080×1920 | 9:16 | — |
| Carousel | max 10 slides | 1:1 recommended | 30MB/slide |

File formats: JPEG (quality ≥85), PNG

## Facebook

| Format | Resolution | Ratio | Max size |
|--------|-----------|-------|---------|
| Feed landscape | 1200×630 | 1.91:1 | 30MB |
| Feed square | 1080×1080 | 1:1 | 30MB |
| Stories | 1080×1920 | 9:16 | 30MB |
| Carousel | max 10 slides | 1:1 recommended | 30MB/slide |

## Email (HTML)

| Item | Recommended |
|------|------------|
| Max width | 600px |
| Header image | 600×200px |
| Body image | 600×400px |
| Formats | JPEG / PNG / GIF |
| Total size | ≤100KB |

## Card News Render (Sharp)

```typescript
// packages/shared/render-image/src/index.ts
INSTAGRAM_SQUARE: [1080, 1080]   // default
INSTAGRAM_PORTRAIT: [1080, 1350] // --format=portrait
FACEBOOK_LANDSCAPE: [1200, 630]  // implement separately if needed
```
