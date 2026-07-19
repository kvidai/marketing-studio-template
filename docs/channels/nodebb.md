# NodeBB — Integration Guide

## Overview

Uses NodeBB Write API v3 for forum/blog publishing.

## Current Status

**Instance not yet deployed.** After deployment, add to `.env.production`:

```
NODEBB_BASE_URL=https://forum.kvid.ai
NODEBB_TOKEN=your-bearer-token
```

## Bearer Token

NodeBB admin panel → `/admin/settings/api` → "Generate Token"

## API Endpoint

```
POST {baseUrl}/api/v3/topics
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Post title",
  "content": "Markdown body",
  "cid": 1,
  "tags": []
}
```

## Usage

```typescript
import { publishToNodeBB } from '@marketing-studio/publish-nodebb';
const result = await publishToNodeBB({ baseUrl, token }, { title, content, category, tags, target: 'nodebb' });
console.log(result.url);
```

Docs: https://docs.nodebb.org/api/write/
