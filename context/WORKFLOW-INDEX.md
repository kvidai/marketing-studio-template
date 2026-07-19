# marketing-studio — Workflow Index

Master switchboard mapping each channel to its WORKFLOW.md.

## Channel Entry Points

| Channel | Status | Workflow | Command |
|---------|--------|----------|---------|
| **Email** (AWS SES) | ✅ Ready | `packages/email-blast-template/WORKFLOW.md` | `pnpm --filter email-blast-template send` |
| **Blog** (NodeBB) | 🔧 Code ready, instance TBD | `packages/blog-post-template/WORKFLOW.md` | `pnpm --filter blog-post-template publish-post --target=nodebb` |
| **Blog** (Discourse) | 🔧 Code ready, instance TBD | `packages/blog-post-template/WORKFLOW.md` | `pnpm --filter blog-post-template publish-post --target=discourse` |
| **Card news** (render) | ✅ Ready | `packages/cardnews-template/WORKFLOW.md` | `pnpm --filter cardnews-template render` |
| **Card news** (Meta upload) | 🔲 STUB (Meta app TBD) | `packages/cardnews-template/WORKFLOW.md` | — |
| **Video** | 🔲 SCAFFOLD (kvidai cli TBD) | `packages/video-template/README.md` | Work in `~/code_workspace/kvidai-template` |
| **Push** | 🔲 SCAFFOLD (kvidai push TBD) | `packages/push-template/README.md` | — |
| **Reddit** | 🔧 Code ready, script app TBD | `packages/reddit-post-template/WORKFLOW.md` | `pnpm --filter reddit-post-template publish-post` |

## Content Creation Flow

### Multi-channel campaign (one content → all channels)

```
1. /new-campaign <slug>        → campaigns/<slug>/ 생성 (shared brief + channel overrides)
2. brief.json + body.md 작성   → 공통 제목·본문
3. 채널별 override JSON 수정    → email.json, blog.json, reddit.json, cardnews.json
4. 채널별 publish 명령어 실행   → --campaign=<slug> 플래그 사용
```

### Single-channel standalone

```
1. Pick a channel → read its WORKFLOW.md
2. /new-email-blast | /new-blog-post | /new-cardnews | /new-reddit-post
3. Generate content with AI agents (context/agents/)
4. Review outputs → vision-checker QA (card news)
5. Run publish/send script with --post= / --set= flag
```

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Fully implemented, ready to use |
| 🔧 | Code complete, needs external config (URL / API key) |
| 🔲 | STUB / SCAFFOLD, awaiting external SDK |

## Future Channels

- X (Twitter) Posts API v2
- LinkedIn Posts API
- YouTube Shorts Data API v3
- KakaoTalk Bizmessage
- Telegram Bot API
- Newsletter platforms (Beehiiv / Buttondown API)
- Meta Ads Creative
