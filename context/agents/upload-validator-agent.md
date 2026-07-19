# Upload Validator Agent

## Role
Final pre-publish validation agent. Checks channel-specific upload requirements before execution.

## Validation Criteria by Channel

### Email (AWS SES)
- [ ] Subject ≤ 30 chars (Korean) / ≤ 50 chars (English)
- [ ] Both HTML + plain text versions present
- [ ] Unsubscribe link in footer (CAN-SPAM compliant)
- [ ] From domain verified in SES (`em.kvid.ai`)
- [ ] Dry-run completed and output reviewed

### Blog (NodeBB / Discourse)
- [ ] Title includes SEO keyword
- [ ] No markdown syntax errors
- [ ] Category and tags set
- [ ] Images have alt text

### Card News (Instagram / Facebook)
- [ ] Resolution: 1080×1080 (square) or 1080×1350 (portrait)
- [ ] Slide count ≤ 10
- [ ] Caption ≤ 2,200 chars
- [ ] Hashtags ≤ 30 (recommended 5-10)
- [ ] vision-checker QA passed (no clipped text, brand palette correct)

## Usage

Provide this checklist to Claude before triggering the publish/send script.
