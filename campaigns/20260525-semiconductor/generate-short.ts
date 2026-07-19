#!/usr/bin/env tsx
/**
 * kvidai 쇼츠 영상 생성 runner
 *
 * Usage:
 *   KVIDAI_API_KEY=... tsx campaigns/20260525-semiconductor/generate-short.ts <short-dir-name>
 *
 * Example:
 *   KVIDAI_API_KEY=xxx tsx generate-short.ts short-01-superycle-illusion
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE_URL = process.env.KVIDAI_BASE_URL ?? 'https://api.kvid.ai';
const API_KEY = process.env.KVIDAI_API_KEY ?? '';

if (!API_KEY) {
  console.error('KVIDAI_API_KEY not set');
  process.exit(1);
}

const shortName = process.argv[2];
if (!shortName) {
  console.error('Usage: tsx generate-short.ts <short-dir-name>');
  process.exit(1);
}

const campaignDir = new URL('.', import.meta.url).pathname;
const shortDir = resolve(campaignDir, 'shorts', shortName);
if (!existsSync(shortDir)) {
  console.error(`Directory not found: ${shortDir}`);
  process.exit(1);
}

async function readBrief(dir: string): Promise<string> {
  const parts: string[] = [];
  for (const file of ['brief.md', 'script.md', 'visuals.md']) {
    const p = join(dir, file);
    if (existsSync(p)) {
      parts.push(`## ${file}\n${await readFile(p, 'utf-8')}`);
    }
  }
  return parts.join('\n\n');
}

async function createProject(name: string): Promise<number> {
  const resp = await fetch(`${BASE_URL}/video-project/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
    body: JSON.stringify({ name }),
  });
  if (!resp.ok) throw new Error(`createProject failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json() as Record<string, unknown>;
  const id = (data['data'] as Record<string, unknown> | undefined)?.['id'] ?? data['id'];
  if (typeof id !== 'number') throw new Error(`No projectId: ${JSON.stringify(data)}`);
  return id;
}

async function agentGenerate(projectId: number, message: string): Promise<string[]> {
  console.log(`[kvidai] Streaming agent for project ${projectId}...`);
  const resp = await fetch(`${BASE_URL}/agent/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
    body: JSON.stringify({ projectId, message, chatHistory: [] }),
    signal: AbortSignal.timeout(8 * 60 * 1000),
  });
  if (!resp.ok || !resp.body) throw new Error(`agentGenerate failed: ${resp.status} ${await resp.text()}`);

  const tools: string[] = [];
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value, { stream: true }).split('\n')) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const d = JSON.parse(raw) as { toolName?: string };
          if (currentEvent === 'tool_start' && d.toolName) {
            tools.push(d.toolName);
            process.stdout.write(`  ▸ ${d.toolName}\n`);
          }
        } catch { /* skip non-JSON */ }
      }
    }
  }
  return tools;
}

async function main() {
  const message = await readBrief(shortDir);
  const projectName = shortName;

  console.log(`[kvidai] Creating project: ${projectName}`);
  console.log(`[kvidai] Message length: ${message.length} chars`);
  console.log(`[kvidai] Message preview:\n${message.slice(0, 300)}...\n`);

  const projectId = await createProject(projectName);
  console.log(`[kvidai] Project created: ${projectId}`);

  const tools = await agentGenerate(projectId, message);

  const url = `https://kvid.ai/en/editor/${projectId}`;
  console.log(`\n[kvidai] Done! Tools invoked: ${tools.length}`);
  console.log(`[kvidai] Review: ${url}`);

  // Save result
  const resultPath = join(shortDir, 'kvidai-result.json');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(resultPath, JSON.stringify({ projectId, url, tools, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`[kvidai] Result saved: ${resultPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
