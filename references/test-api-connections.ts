/**
 * 외부 API 연결 상태 확인 스크립트.
 * 실행: npx tsx scripts/test-api-connections.ts
 *
 * 확인 대상: ToolA / ToolB / ToolC
 * 키 소스: .env.production (monorepo root)
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env.production') });

const ToolA_TOKEN = process.env.ToolA_API_TOKEN;
const ToolB_KEY    = process.env.ToolB_API_KEY;
const ToolC_KEY  = process.env.ToolC_API_KEY;

async function testToolA() {
  const res = await fetch('https://api.ToolA.com/v1/account', {
    headers: { Authorization: `Token ${ToolA_TOKEN}` },
  });
  const body = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  console.log('  username:', body['username']);
  console.log('  type    :', body['type']);
}

async function testToolB() {
  const res = await fetch('https://api.ToolB.com/v1/projects', {
    headers: { Authorization: `Token ${ToolB_KEY}` },
  });
  const body = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  const projects = body['projects'] as Array<Record<string, unknown>>;
  console.log('  projects:', projects.length);
  if (projects[0]) console.log('  name    :', projects[0]['name']);
}

async function testToolC() {
  const res = await fetch('https://api.ToolC.io/v1/user', {
    headers: { 'xi-api-key': ToolC_KEY! },
  });
  const body = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  const sub = body['subscription'] as Record<string, unknown> | undefined;
  console.log('  tier    :', sub?.['tier'] ?? '-');
  console.log('  chars used / limit:',
    `${sub?.['character_count'] ?? '-'} / ${sub?.['character_limit'] ?? '-'}`);
}

async function run(name: string, fn: () => Promise<void>) {
  process.stdout.write(`[${name}] `);
  try {
    await fn();
    console.log('  → ✅ OK');
  } catch (e) {
    console.log(`  → ❌ FAIL: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  await run('ToolA  ', testToolA);
  await run('ToolB   ', testToolB);
  await run('ToolC ', testToolC);
}

main();
