import type { BlogPostInput } from '@marketing-studio/types';

export interface NodeBBConfig {
  baseUrl: string;
  token: string;
}

export interface NodeBBPublishResult {
  topicId: number;
  slug: string;
  url: string;
}

export async function publishToNodeBB(
  config: NodeBBConfig,
  post: BlogPostInput,
): Promise<NodeBBPublishResult> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/api/v3/topics`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({
      title: post.title,
      content: post.content,
      cid: post.category ? parseInt(post.category) : 1,
      tags: post.tags ?? [],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NodeBB publish failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { response: { tid: number; slug: string } };
  const { tid, slug } = data.response;
  return {
    topicId: tid,
    slug,
    url: `${config.baseUrl.replace(/\/$/, '')}/topic/${tid}/${slug}`,
  };
}
