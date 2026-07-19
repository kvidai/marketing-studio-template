# Meta Graph API — Integration Guide

## Overview

Instagram Graph API + Facebook Graph API for card news image upload/publish.

## Current Status

**STUB** — Meta App approval required. `packages/shared/upload-meta/src/index.ts` throws until configured.

## Setup Steps

### 1. Create Facebook App
- https://developers.facebook.com/apps/ → "Create App"
- App Type: Business
- Required permissions: `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`

### 2. Get Long-lived Page Access Token
```bash
curl "https://graph.facebook.com/v18.0/oauth/access_token \
  ?grant_type=fb_exchange_token \
  &client_id={APP_ID} \
  &client_secret={APP_SECRET} \
  &fb_exchange_token={SHORT_TOKEN}"
```

### 3. Add to .env.production
```
META_PAGE_ACCESS_TOKEN=your-long-lived-token
META_PAGE_ID=your-facebook-page-id
META_IG_ACCOUNT_ID=your-instagram-account-id
```

## Carousel Upload Flow (to implement)

```
1. Create media container per image
   POST /v18.0/{ig-account-id}/media
   { image_url, is_carousel_item: true }
   → creation_id

2. Create carousel container
   POST /v18.0/{ig-account-id}/media
   { caption, media_type: CAROUSEL, children: [...creation_ids] }
   → carousel_id

3. Publish
   POST /v18.0/{ig-account-id}/media_publish
   { creation_id: carousel_id }
```

Docs:
- Instagram: https://developers.facebook.com/docs/instagram-api/
- Facebook Pages: https://developers.facebook.com/docs/pages/
