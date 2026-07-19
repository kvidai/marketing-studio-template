import type { BlogPostInput } from '@marketing-studio/types';

export interface DiscourseConfig {
  baseUrl: string;
  apiKey: string;
  apiUsername: string;
}

export interface DiscoursePublishResult {
  postId: number;
  topicId: number;
  url: string;
}

export async function publishToDiscourse(
  config: DiscourseConfig,
  post: BlogPostInput,
): Promise<DiscoursePublishResult> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/posts.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': config.apiKey,
      'Api-Username': config.apiUsername,
    },
    body: JSON.stringify({
      title: post.title,
      raw: post.content,
      category: post.category ? parseInt(post.category) : undefined,
      tags: post.tags ?? [],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discourse publish failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { id: number; topic_id: number };
  return {
    postId: data.id,
    topicId: data.topic_id,
    url: `${config.baseUrl.replace(/\/$/, '')}/t/${data.topic_id}`,
  };
}
