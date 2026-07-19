import { readFileSync } from 'fs';
import { extname } from 'path';

// --- Types ---

export interface RedditAuthConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}

export interface RedditAccessToken {
  accessToken: string;
  expiresAt: number; // unix ms
}

export interface RedditSubmitOptions {
  subreddit: string;
  flairId?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  sendreplies?: boolean;
}

export interface RedditTextPost extends RedditSubmitOptions {
  kind: 'self';
  title: string;
  text: string;
}

export interface RedditLinkPost extends RedditSubmitOptions {
  kind: 'link';
  title: string;
  url: string;
}

export interface RedditImagePost extends RedditSubmitOptions {
  kind: 'image';
  title: string;
  imagePath: string;
}

export interface RedditVideoPost extends RedditSubmitOptions {
  kind: 'video';
  title: string;
  videoPath: string;
  thumbnailPath: string;
}

export interface RedditPostResult {
  id: string;
  permalink: string;
  url: string;
}

// --- Auth ---

export async function getAccessToken(config: RedditAuthConfig): Promise<RedditAccessToken> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'password',
    username: config.username,
    password: config.password,
  });

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'User-Agent': config.userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reddit auth failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number; error?: string };
  if (data.error) {
    throw new Error(`Reddit auth error: ${data.error}`);
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// --- Media upload helpers ---

interface AssetLease {
  assetId: string;
  websocketUrl: string;
  s3Url: string;
  fields: Array<{ name: string; value: string }>;
  action: string;
}

export async function uploadMediaAsset(
  token: RedditAccessToken,
  userAgent: string,
  filePath: string,
  mimeType: string,
): Promise<AssetLease> {
  const filename = filePath.split('/').pop() ?? 'file';

  const leaseRes = await fetch('https://oauth.reddit.com/api/media/asset.json', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token.accessToken}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ filepath: filename, mimetype: mimeType }).toString(),
  });

  if (!leaseRes.ok) {
    const text = await leaseRes.text();
    throw new Error(`Reddit media lease failed ${leaseRes.status}: ${text}`);
  }

  const lease = (await leaseRes.json()) as {
    action: string;
    fields: Array<{ name: string; value: string }>;
    asset: { asset_id: string; websocket_url: string };
  };

  const key = lease.fields.find(f => f.name === 'key')?.value ?? '';
  // action may or may not end with '/'
  const s3Url = lease.action.endsWith('/') ? `${lease.action}${key}` : `${lease.action}/${key}`;

  const fileBuffer = readFileSync(filePath);
  const fileBlob = new Blob([fileBuffer], { type: mimeType });

  // S3 requires 'file' field to be last
  const form = new FormData();
  for (const { name, value } of lease.fields) {
    form.append(name, value);
  }
  form.append('file', fileBlob, filename);

  const s3Res = await fetch(lease.action, { method: 'POST', body: form });
  // S3 presigned POST returns 204 on success
  if (!s3Res.ok && s3Res.status !== 204) {
    const text = await s3Res.text();
    throw new Error(`Reddit S3 upload failed ${s3Res.status}: ${text}`);
  }

  return {
    assetId: lease.asset.asset_id,
    websocketUrl: lease.asset.websocket_url,
    s3Url,
    fields: lease.fields,
    action: lease.action,
  };
}

export async function waitForRedditWebsocket(wsUrl: string, timeoutMs = 60_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`Reddit WebSocket timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        payload?: { redirect?: string };
      };
      if (msg.type === 'success' && msg.payload?.redirect) {
        clearTimeout(timer);
        ws.close();
        resolve(msg.payload.redirect);
      }
    });

    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Reddit WebSocket connection error'));
    });
  });
}

// --- Internal helpers ---

function mimeFromPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
  };
  return map[ext] ?? 'application/octet-stream';
}

function buildSubmitBody(
  opts: RedditSubmitOptions & { kind: string; title: string },
  extra: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams({
    api_type: 'json',
    kind: opts.kind,
    sr: opts.subreddit,
    title: opts.title,
    nsfw: String(opts.nsfw ?? false),
    spoiler: String(opts.spoiler ?? false),
    sendreplies: String(opts.sendreplies ?? true),
    ...extra,
  });
  if (opts.flairId) params.set('flair_id', opts.flairId);
  return params;
}

interface SubmitResponse {
  json: { errors: string[][]; data?: { url?: string; id?: string } };
}

function parseSubmitResult(data: SubmitResponse, fallbackUrl: string): RedditPostResult {
  if (data.json.errors.length > 0) {
    throw new Error(`Reddit submit error: ${data.json.errors.map(e => e.join(' ')).join('; ')}`);
  }
  const url = data.json.data?.url ?? fallbackUrl;
  const id = data.json.data?.id ?? '';
  const permalink = url.replace('https://www.reddit.com', '');
  return { id, permalink, url };
}

async function callSubmit(
  token: RedditAccessToken,
  userAgent: string,
  body: URLSearchParams,
): Promise<SubmitResponse> {
  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token.accessToken}`,
      'User-Agent': userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reddit submit failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<SubmitResponse>;
}

// --- Submit functions ---

export async function submitTextPost(
  token: RedditAccessToken,
  userAgent: string,
  post: RedditTextPost,
): Promise<RedditPostResult> {
  const data = await callSubmit(token, userAgent, buildSubmitBody(post, { text: post.text }));
  return parseSubmitResult(data, `https://www.reddit.com/r/${post.subreddit}/`);
}

export async function submitLinkPost(
  token: RedditAccessToken,
  userAgent: string,
  post: RedditLinkPost,
): Promise<RedditPostResult> {
  const data = await callSubmit(
    token,
    userAgent,
    buildSubmitBody(post, { url: post.url, resubmit: 'true' }),
  );
  return parseSubmitResult(data, `https://www.reddit.com/r/${post.subreddit}/`);
}

export async function submitImagePost(
  token: RedditAccessToken,
  userAgent: string,
  post: RedditImagePost,
): Promise<RedditPostResult> {
  const mimeType = mimeFromPath(post.imagePath);
  const asset = await uploadMediaAsset(token, userAgent, post.imagePath, mimeType);

  const data = await callSubmit(
    token,
    userAgent,
    buildSubmitBody(post, { url: asset.s3Url }),
  );

  const fallback = data.json.data?.url ?? `https://www.reddit.com/r/${post.subreddit}/`;

  // Try websocket for the canonical post URL; fall back to submit response on timeout
  try {
    const redirectUrl = await waitForRedditWebsocket(asset.websocketUrl);
    const id = data.json.data?.id ?? '';
    return { id, permalink: redirectUrl.replace('https://www.reddit.com', ''), url: redirectUrl };
  } catch {
    return parseSubmitResult(data, fallback);
  }
}

export async function submitVideoPost(
  token: RedditAccessToken,
  userAgent: string,
  post: RedditVideoPost,
): Promise<RedditPostResult> {
  const [videoAsset, thumbAsset] = await Promise.all([
    uploadMediaAsset(token, userAgent, post.videoPath, mimeFromPath(post.videoPath)),
    uploadMediaAsset(token, userAgent, post.thumbnailPath, mimeFromPath(post.thumbnailPath)),
  ]);

  const data = await callSubmit(
    token,
    userAgent,
    buildSubmitBody(post, { url: videoAsset.s3Url, video_poster_url: thumbAsset.s3Url }),
  );

  const fallback = data.json.data?.url ?? `https://www.reddit.com/r/${post.subreddit}/`;

  // Video encoding is async — wait up to 2 minutes for the redirect URL
  try {
    const redirectUrl = await waitForRedditWebsocket(videoAsset.websocketUrl, 120_000);
    const id = data.json.data?.id ?? '';
    return { id, permalink: redirectUrl.replace('https://www.reddit.com', ''), url: redirectUrl };
  } catch {
    return parseSubmitResult(data, fallback);
  }
}
