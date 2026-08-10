// kvid.ai 비디오 = 배포된 kvidai-skills(APIM) 스크립트에 위임한다. 커스텀 API 클라 직접 작성 금지.
//
// ⚠️ v0.3.0 방향: kvid.ai AI 에이전트(agent-generate)를 쓰지 않는다.
// 에이전트의 역할(미디어 생성 + composition 조립)을 Claude Code 가 직접 한다.
// 미디어는 상위(/new-video)에서 kvidai CLI 로 생성해 파일로 넘기고, 이 모듈은:
//   create-project → media upload-file → composition 직접 빌드 → replace-composition → get-project

import { spawn } from 'node:child_process';
import { resolve, dirname, basename } from 'node:path';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { imageSize } from 'image-size';
import { buildComposition, type ScenePlan, type AssetIndex, type AssetRef } from './composition.js';

export type { ScenePlan, Scene, SceneCaption, VisualType } from './composition.js';
export { buildComposition } from './composition.js';

// 오프라인 미리보기 — 업로드 없이 placeholder asset 으로 composition JSON 을 빌드(크레딧 0, 구조 검증용).
export function buildPreview(plan: ScenePlan) {
  const idx: AssetIndex = new Map();
  let i = 0;
  for (const s of plan.scenes) {
    if (s.visual && !idx.has(s.visual.file))
      idx.set(s.visual.file, { assetId: `as_${++i}`, remoteUrl: `(local)${s.visual.file}`, type: s.visual.type, filename: s.visual.file.split('/').pop() ?? s.visual.file });
    if (s.voice && !idx.has(s.voice.file))
      idx.set(s.voice.file, { assetId: `as_${++i}`, remoteUrl: `(local)${s.voice.file}`, type: 'audio', filename: s.voice.file.split('/').pop() ?? s.voice.file });
  }
  return buildComposition(plan, idx);
}

// ── 배포 스킬 스크립트 위치 (monorepo root 기준) ──────────────────────────────

function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('monorepo root (pnpm-workspace.yaml) not found');
}

const ROOT = findMonorepoRoot(process.cwd());
// 직접 조립(upload/create/replace-composition/get)·voice 는 배포된 kvid CLI 로.
// KVIDAI_CLI_BIN 로 바이너리 경로 오버라이드 가능(릴리스 전 로컬 dist 검증용). 기본은 PATH 의 `kvid`.
const KVID_BIN = process.env.KVIDAI_CLI_BIN ?? 'kvid';
// agent-generate 는 아직 CLI video generate 가 preset+다중첨부를 못 다뤄 스킬을 유지한다.
const VP_CLIENT = resolve(ROOT, '.claude/skills/kvidai-video-project/scripts/kvidai-client.mjs');

function assertAgentSkillInstalled(): void {
  if (!existsSync(VP_CLIENT)) {
    throw new Error(
      `kvidai-video-project 스킬 없음: ${VP_CLIENT}\nAPM 설치 필요 — CLAUDE.md "Install / Update Skills" 참고.`,
    );
  }
}

// ── 프로세스 호출 헬퍼 (stdout=결과, stderr=진행상황) ─────────────────────────

function runProc(cmd: string, args: string[], label: string): Promise<string> {
  return new Promise((res, rej) => {
    const child = spawn(cmd, args, { env: process.env });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('error', (e) =>
      rej(new Error(`${label} 실행 실패: ${e.message}${cmd === KVID_BIN ? ' — kvid CLI 미설치? curl https://cli.kvid.ai/install -fsS | bash' : ''}`)),
    );
    child.on('close', (code) => (code === 0 ? res(out.trim()) : rej(new Error(`${label} exited with code ${code}`))));
  });
}

/** kvid CLI 호출 (--json). stdout 마지막 JSON 파싱. */
async function runKvid<T = unknown>(args: string[]): Promise<T> {
  const raw = await runProc(KVID_BIN, [...args, '--json'], `kvid ${args[0]}`);
  const start = raw.lastIndexOf('\n{') >= 0 ? raw.indexOf('{', raw.lastIndexOf('\n{')) : raw.indexOf('{');
  const jsonStr = start >= 0 ? raw.slice(start) : raw;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`kvid ${args[0]} 출력 JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }
}

// 확장자 → MIME (CLI upload 는 mimeType 을 안 돌려줘 로컬에서 유추. 에이전트 첨부 --mime 용)
function mimeFromExt(p: string): string {
  const e = p.toLowerCase().split('.').pop() ?? '';
  const m: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
    pdf: 'application/pdf', txt: 'text/plain',
  };
  return m[e] ?? 'application/octet-stream';
}

// ── kvid CLI 위임 ─────────────────────────────────────────────────────────────

/** kvid upload → { cdnUrl, mimeType(유추), size } */
async function uploadMedia(filePath: string): Promise<{ cdnUrl: string; mimeType: string; size: number; fileId?: number }> {
  const d = await runKvid<{ cdnUrl?: string; size?: number }>(['upload', filePath]);
  if (!d.cdnUrl) throw new Error(`kvid upload 응답에 cdnUrl 없음`);
  return { cdnUrl: d.cdnUrl, mimeType: mimeFromExt(filePath), size: d.size ?? 0 };
}

/** kvid project create → projectId */
async function createProject(name: string, presetId?: string): Promise<number> {
  const d = await runKvid<{ id?: number }>(['project', 'create', name, ...(presetId ? ['--preset-id', presetId] : [])]);
  if (!Number.isFinite(d.id)) throw new Error('kvid project create 가 숫자 id 를 반환하지 않음');
  return d.id as number;
}

/** kvid project replace-composition — composition 전체 교체 */
async function replaceComposition(projectId: number, composition: unknown): Promise<void> {
  const tmp = resolve(tmpdir(), `kvidai-composition-${projectId}.json`);
  writeFileSync(tmp, JSON.stringify(composition));
  await runKvid(['project', 'replace-composition', String(projectId), tmp]);
}

/** kvid project get → composition 스냅샷 */
async function getProject(projectId: number): Promise<unknown> {
  return runKvid(['project', 'get', String(projectId)]);
}

// ── 스킬 위임 (agent-generate 전용) ────────────────────────────────────────────
function runSkill(script: string, args: string[]): Promise<string> {
  return new Promise((res, rej) => {
    const child = spawn('node', [script, ...args], { env: process.env });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('error', rej);
    child.on('close', (code) =>
      code === 0 ? res(out.trim()) : rej(new Error(`${basename(script)} ${args[0]} exited with code ${code}`)),
    );
  });
}

// ── 오케스트레이션 (직접 조립) ─────────────────────────────────────────────────

export interface AssembleConfig {
  name: string; // 프로젝트 이름 (보통 slug)
  presetId?: string;
  assetBaseDir: string; // plan 의 file 경로 기준 (캠페인 폴더)
  plan: ScenePlan;
  projectId?: number; // 있으면 새로 만들지 않고 이 프로젝트의 composition 을 교체(이어서 수정)
}

export interface UploadedAsset {
  file: string;
  assetId: string;
  cdnUrl: string;
  type: 'image' | 'video' | 'audio';
}

export interface AssembleResult {
  projectId: number;
  editorUrl: string;
  assets: UploadedAsset[];
  composition: unknown;
}

// plan 에서 (file, type) 유니크 목록 추출
function collectFiles(plan: ScenePlan): { file: string; type: 'image' | 'video' | 'audio' }[] {
  const seen = new Map<string, 'image' | 'video' | 'audio'>();
  for (const s of plan.scenes) {
    if (s.visual) seen.set(s.visual.file, s.visual.type);
    if (s.voice) seen.set(s.voice.file, 'audio');
  }
  return [...seen].map(([file, type]) => ({ file, type }));
}

export async function assembleProject(cfg: AssembleConfig): Promise<AssembleResult> {
  if (!process.env.KVIDAI_API_KEY) throw new Error('KVIDAI_API_KEY 미설정');
  // 직접 조립은 kvid CLI 만 사용(스킬 불필요). CLI 부재 시 runKvid 가 설치 안내로 실패.

  // 1. 자산 업로드 → assetIndex
  // ⚠️ assetId 는 조립(=프로젝트)마다 고유 토큰을 붙인다. kvid.ai 에디터가 미디어를 URL 이 아니라
  //   assetId 로 클라이언트 캐싱하는 정황이 있어(실측), `as_1` 처럼 프로젝트마다 반복되면 새 프로젝트가
  //   이전 프로젝트의 동일 assetId 캐시(다른 영상)를 그대로 보여준다 — 캐시를 지워야만 고쳐졌다.
  //   토큰을 매 실행 유니크하게 주면 캐시가 충돌하지 않는다. (근본 수정은 플랫폼의 URL 기준 cache-bust)
  const runTok = Date.now().toString(36);
  const files = collectFiles(cfg.plan);
  const assetIndex: AssetIndex = new Map();
  const uploaded: UploadedAsset[] = [];
  for (let i = 0; i < files.length; i++) {
    const { file, type } = files[i];
    const path = resolve(cfg.assetBaseDir, file);
    if (!existsSync(path)) throw new Error(`자산 없음: ${path}`);
    process.stderr.write(`[video] uploading ${file}...\n`);
    const { cdnUrl } = await uploadMedia(path);
    const assetId = `as_${runTok}_${i + 1}`;
    // 이미지 원본 크기 판독 (contain 배치용). 실패해도 진행(그 경우 full canvas).
    let width: number | undefined;
    let height: number | undefined;
    if (type === 'image') {
      try {
        const d = imageSize(readFileSync(path));
        width = d.width;
        height = d.height;
      } catch {
        /* 크기 판독 실패 — cover 로 폴백 */
      }
    }
    const ref: AssetRef = { assetId, remoteUrl: cdnUrl, type, filename: basename(file), width, height };
    assetIndex.set(file, ref);
    uploaded.push({ file, assetId, cdnUrl, type });
  }

  // 2. 프로젝트 생성 (projectId 있으면 재사용 — 이어서 수정)
  let projectId: number;
  if (cfg.projectId) {
    projectId = cfg.projectId;
    process.stderr.write(`[video] reusing project ${projectId}\n`);
  } else {
    projectId = await createProject(cfg.name, cfg.presetId);
    process.stderr.write(`[video] project ${projectId} created\n`);
  }

  // 3. composition 직접 빌드 + 교체
  const composition = buildComposition(cfg.plan, assetIndex);
  await replaceComposition(projectId, composition);
  process.stderr.write(`[video] composition replaced (${cfg.plan.scenes.length} scenes)\n`);

  // 4. 스냅샷
  const snapshot = await getProject(projectId);

  return {
    projectId,
    editorUrl: `https://kvid.ai/en/editor/${projectId}`,
    assets: uploaded,
    composition: snapshot,
  };
}

// ── 에이전트 모드 (2026-07-30 재도입) ──────────────────────────────────────────
// Claude(전처리) 가 압축 브리프+자산을 준비 → 에이전트가 대본/씬/생성/조립.
// message = 제품지식 + 자산 매니페스트(파일명+설명+추천용도). attach = 첨부할 로컬 파일.

/** video-project agent-generate — 압축메시지 + 첨부 cdnUrl 로 에이전트 실행 → editor URL */
async function agentGenerate(
  projectId: number,
  message: string,
  attachments: { cdnUrl: string; mimeType: string; filename: string; size: number }[],
  presetId?: string,
): Promise<string> {
  const args = ['agent-generate', String(projectId), message];
  // ⚠️ 프리셋(voice/tone)은 agent-generate 의 presetId 로 적용됨 (create-project 만으론 안 됨).
  if (presetId) args.push('--preset-id', presetId);
  for (const a of attachments) {
    // ⚠️ --size 필수: size 0 이면 에이전트가 빈 파일로 보고 이미지를 실제 배치에 안 씀.
    args.push('--cdn-url', a.cdnUrl, '--mime', a.mimeType, '--filename', a.filename, '--size', String(a.size));
  }
  const out = await runSkill(VP_CLIENT, args);
  const url = out.split('\n').map((l) => l.trim()).filter(Boolean).pop();
  return url ?? `https://kvid.ai/en/editor/${projectId}`;
}

export interface AgentConfig {
  name: string;
  presetId?: string;
  message: string; // 압축 브리프 (제품지식 + 자산 매니페스트)
  attachFiles?: string[]; // 첨부할 로컬 파일 (assetBaseDir 기준)
  assetBaseDir: string;
  projectId?: number; // 있으면 재사용
}

export interface AgentResult {
  projectId: number;
  editorUrl: string;
  attached: { file: string; cdnUrl: string }[];
  composition: unknown;
}

export async function generateWithAgent(cfg: AgentConfig): Promise<AgentResult> {
  if (!process.env.KVIDAI_API_KEY) throw new Error('KVIDAI_API_KEY 미설정');
  // agent-generate 는 아직 스킬 경유(CLI video generate 가 preset+다중첨부 미지원).
  assertAgentSkillInstalled();

  // 참고(2026-07-31): 예전 "message 길이 가드"는 제거했다. 첨부 이미지 미배치의 실제 원인은
  // 긴 message 자체가 아니라 서버 estimateSceneCount 가 "3분할" 같은 합성어의 "분" 을 "3분(minutes)"
  // 으로 오인해 long-video 경로로 오라우팅한 것이었고, 플랫폼에서 수정됨. (30초 요청은 short-edit 경로.)
  // 남은 미지원: 진짜 long-video("3분"+) + 첨부 이미지 배치는 아직 별도 기능(추후).

  // 1. 첨부 자산 업로드
  const attachments: { cdnUrl: string; mimeType: string; filename: string; size: number }[] = [];
  const attached: { file: string; cdnUrl: string }[] = [];
  for (const file of cfg.attachFiles ?? []) {
    const path = resolve(cfg.assetBaseDir, file);
    if (!existsSync(path)) throw new Error(`첨부 자산 없음: ${path}`);
    process.stderr.write(`[video] uploading ${file}...\n`);
    const { cdnUrl, mimeType, size } = await uploadMedia(path);
    attachments.push({ cdnUrl, mimeType, filename: basename(file), size });
    attached.push({ file, cdnUrl });
  }

  // 2. 프로젝트 생성/재사용
  const projectId = cfg.projectId ?? (await createProject(cfg.name, cfg.presetId));
  process.stderr.write(cfg.projectId ? `[video] reusing project ${projectId}\n` : `[video] project ${projectId} created\n`);

  // 3. 에이전트 실행 (대본/씬/생성/조립) — 1~3분
  process.stderr.write(`[video] agent generating (attachments: ${attachments.length}, preset: ${cfg.presetId ?? 'default'})...\n`);
  const editorUrl = await agentGenerate(projectId, cfg.message, attachments, cfg.presetId);

  // 4. 스냅샷
  const composition = await getProject(projectId);
  return { projectId, editorUrl, attached, composition };
}
