import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const BASE_URL = process.env.KVIDAI_BASE_URL ?? 'https://api.kvid.ai';
const AGENT_BASE = process.env.KVIDAI_AGENT_BASE_URL ?? 'https://api.kvid.ai/agent';
const API_KEY = process.env.KVIDAI_API_KEY ?? '';

export interface KvidaiVideoConfig {
  projectPath: string;
  outputPath: string;
  compositionId?: string;
}

// Read brief.md + script.md + visuals.md from a project directory,
// or fall back to reading projectPath as a single file.
async function readBrief(projectPath: string): Promise<string> {
  const parts: string[] = [];
  for (const file of ['brief.md', 'script.md', 'visuals.md']) {
    const p = join(projectPath, file);
    if (existsSync(p)) {
      parts.push(`## ${file}\n${await readFile(p, 'utf-8')}`);
    }
  }
  if (parts.length > 0) return parts.join('\n\n');
  // single-file fallback
  return readFile(projectPath, 'utf-8');
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
  if (typeof id !== 'number') throw new Error(`No projectId in response: ${JSON.stringify(data)}`);
  return id;
}

// Stream SSE from /agent/generate. Returns list of tool names invoked.
// onEvent is called for each tool_start event.
async function agentGenerate(
  projectId: number,
  message: string,
  onEvent?: (toolName: string) => void,
): Promise<string[]> {
  const resp = await fetch(`${AGENT_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
    body: JSON.stringify({ projectId, message, chatHistory: [] }),
    signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min max
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`agentGenerate failed: ${resp.status} ${await resp.text()}`);
  }

  const toolsInvoked: string[] = [];
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const d = JSON.parse(raw) as { toolName?: string };
          if (currentEvent === 'tool_start' && d.toolName) {
            toolsInvoked.push(d.toolName);
            onEvent?.(d.toolName);
          }
        } catch { /* non-JSON SSE data, skip */ }
      }
    }
  }

  return toolsInvoked;
}

export async function generateVideo(config: KvidaiVideoConfig): Promise<string> {
  if (!API_KEY) throw new Error('KVIDAI_API_KEY is not set');

  const brief = await readBrief(config.projectPath);
  const projectName = config.projectPath.replace(/\/$/, '').split('/').pop() ?? 'Marketing Video';
  const projectId = await createProject(projectName);

  console.log(`kvidai: project ${projectId} created — streaming agent...`);

  const tools = await agentGenerate(projectId, brief, (t) => {
    process.stdout.write(`  ▸ ${t}\n`);
  });

  const projectUrl = `https://kvid.ai/en/editor/${projectId}`;
  console.log(`kvidai: done (${tools.length} tools). Review: ${projectUrl}`);
  return projectUrl;
}

export async function uploadVideo(_videoPath: string, _channel: string): Promise<string> {
  // Video is rendered server-side by kvidai; no local upload needed yet.
  throw new Error('uploadVideo: rendered server-side — visit the project URL to export.');
}
