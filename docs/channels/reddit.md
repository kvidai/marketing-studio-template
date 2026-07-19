# Reddit 채널 통합 노트

## 개요

Reddit 공식 OAuth2 API로 서브레딧에 텍스트·링크·이미지·비디오 게시물을 자동 발행.

- **어댑터**: `packages/shared/publish-reddit/src/index.ts`
- **템플릿**: `packages/reddit-post-template/src/publish.ts`
- **인증 방식**: Script app + password grant (OAuth2)
- **Rate limit**: 무료 OAuth 100 req/min

---

## Script App 발급

1. https://www.reddit.com/prefs/apps 접속
2. "create another app" 클릭
3. 앱 타입 **script** 선택
4. redirect uri: `http://localhost:8080` (임의)
5. 발급 후:
   - `client_id`: 앱 이름 아래 14자 코드
   - `client_secret`: "secret" 필드 값

`.env.production`에 추가:
```
REDDIT_CLIENT_ID=<14자 코드>
REDDIT_CLIENT_SECRET=<secret>
REDDIT_USERNAME=<Reddit 계정 username>
REDDIT_PASSWORD=<Reddit 계정 password>
REDDIT_USER_AGENT=marketing-studio/0.1 by u/<username>
```

> 2FA 활성 계정은 password grant 사용 불가 → authorization_code grant로 전환 필요.

---

## API 흐름

### 텍스트 / 링크 게시

```
POST /api/v1/access_token (basic auth)
  → access_token

POST /api/submit (bearer token, form-encoded)
  kind=self|link, sr=<subreddit>, title=..., text=...|url=...
  → { json: { data: { url, id } } }
```

### 이미지 / 비디오 게시 (4단계)

```
1. POST /api/media/asset.json
   filepath=<filename>, mimetype=<mime>
   → { action, fields[], asset: { asset_id, websocket_url } }

2. POST <action> (S3 presigned upload)
   FormData: <fields...>, file=<Blob>
   → HTTP 204 No Content

3. POST /api/submit
   kind=image|video, url=<action + key>
   video 시 추가: video_poster_url=<thumbnail s3 url>
   → { json: { data: { url, id } } }

4. WebSocket <websocket_url>
   { type: "success", payload: { redirect: <final url> } }
   → 최종 Reddit CDN URL
```

---

## S3 URL 구성

```ts
// lease.action은 trailing slash 포함 여부가 불일치할 수 있음
const key = fields.find(f => f.name === 'key')?.value ?? '';
const s3Url = action.endsWith('/') ? `${action}${key}` : `${action}/${key}`;
```

---

## WebSocket 주의사항

- 이미지: 타임아웃 기본 60초. 즉시 처리되므로 보통 수 초 내 완료.
- 비디오: 타임아웃 120초. Reddit 서버 인코딩이 비동기라 더 오래 걸릴 수 있음.
- 타임아웃 시 submit 응답의 URL로 fallback.
- WebSocket 연결은 success 수신 후 수동으로 `ws.close()` 필요 (자동 종료 없음).
- Node 22+ 내장 WebSocket 사용 (`"lib": ["ES2022", "DOM"]` 필요).

---

## Rate Limit

| 티어 | 한도 | 비용 |
|------|------|------|
| 무료 (OAuth) | 100 req/min | 무료 |
| paid | 협의 | $0.24/1k calls~ |

마케팅 발행 빈도(일 1~5건)는 무료 티어로 충분.

---

## Anti-spam 주의

- **신규/저카르마 계정**: 게시가 shadowban(조용히 무시)될 수 있음 → 계정 warm-up 필요
- **본인 소유 서브레딧** (r/KvidAI): 제한 없음
- **외부 서브레딧**: 모더레이터 규칙 확인 필수. 반복 홍보 게시는 차단 대상
- **User-Agent**: 형식 위반 시 429 또는 silent block. `<platform>/<version> by u/<username>` 필수

---

## 상업용 정책

브랜드(kvid.ai/affy.ink) 마케팅 자동화는 기술적으로 commercial use에 해당.
- 100 req/min 한도 내에서는 일반적으로 문제없음
- 대규모 자동화(수백 건/일)는 Reddit 상업 API 계약 검토 필요

---

## 참고

- Reddit API 공식: https://www.reddit.com/dev/api
- Submit API wiki: https://github.com/reddit-archive/reddit/wiki/API:-submit
- 이미지 업로드 참고 구현: https://github.com/VityaSchel/reddit-api-image-upload
