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
const MEDIA_CLIENT = resolve(ROOT, '.claude/skills/kvidai-media/scripts/kvidai-media-client.mjs');
const VP_CLIENT = resolve(ROOT, '.claude/skills/kvidai-video-project/scripts/kvidai-client.mjs');

function assertSkillsInstalled(): void {
  for (const p of [MEDIA_CLIENT, VP_CLIENT]) {
    if (!existsSync(p)) {
      throw new Error(
        `kvidai skill client 없음: ${p}\nAPM 설치 필요 — CLAUDE.md "Install / Update Skills" 참고.`,
      );
    }
  }
}

// ── 스킬 CLI 호출 헬퍼 (stdout=결과, stderr=진행상황) ─────────────────────────

function runSkill(script: string, args: string[]): Promise<string> {
  return new Promise((res, rej) => {
    const child = spawn('node', [script, ...args], { env: process.env });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('error', rej);
    child.on('close', (code) =>
      code === 0 ? res(out.trim()) : rej(new Error(`${basename(script)} ${args[0]} exited with code ${code}`)),
    );
  });
}

// ── 개별 스킬 위임 ─────────────────────────────────────────────────────────────

/** kvidai-media upload-file → { cdnUrl, mimeType } */
async function uploadMedia(filePath: string): Promise<{ cdnUrl: string; mimeType: string }> {
  const raw = await runSkill(MEDIA_CLIENT, ['upload-file', filePath]);
  const d = JSON.parse(raw) as { cdnUrl?: string; mimeType?: string };
  if (!d.cdnUrl) throw new Error(`upload-file 응답에 cdnUrl 없음: ${raw}`);
  return { cdnUrl: d.cdnUrl, mimeType: d.mimeType ?? 'application/octet-stream' };
}

/** video-project create-project → projectId */
async function createProject(name: string, presetId?: string): Promise<number> {
  const args = ['create-project', name, ...(presetId ? ['--preset-id', presetId] : [])];
  const id = Number(await runSkill(VP_CLIENT, args));
  if (!Number.isFinite(id)) throw new Error('create-project 가 숫자 projectId 를 반환하지 않음');
  return id;
}

/** video-project replace-composition — composition 전체 교체 */
async function replaceComposition(projectId: number, composition: unknown): Promise<void> {
  const tmp = resolve(tmpdir(), `kvidai-composition-${projectId}.json`);
  writeFileSync(tmp, JSON.stringify(composition));
  await runSkill(VP_CLIENT, ['replace-composition', String(projectId), tmp]);
}

/** video-project get-project → composition 스냅샷 */
async function getProject(projectId: number): Promise<unknown> {
  return JSON.parse(await runSkill(VP_CLIENT, ['get-project', String(projectId)]));
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
  assertSkillsInstalled();

  // 1. 자산 업로드 → assetIndex
  const files = collectFiles(cfg.plan);
  const assetIndex: AssetIndex = new Map();
  const uploaded: UploadedAsset[] = [];
  for (let i = 0; i < files.length; i++) {
    const { file, type } = files[i];
    const path = resolve(cfg.assetBaseDir, file);
    if (!existsSync(path)) throw new Error(`자산 없음: ${path}`);
    process.stderr.write(`[video] uploading ${file}...\n`);
    const { cdnUrl } = await uploadMedia(path);
    const assetId = `as_${i + 1}`;
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
  attachments: { cdnUrl: string; mimeType: string; filename: string }[],
): Promise<string> {
  const args = ['agent-generate', String(projectId), message];
  for (const a of attachments) {
    args.push('--cdn-url', a.cdnUrl, '--mime', a.mimeType, '--filename', a.filename);
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
  assertSkillsInstalled();

  // 1. 첨부 자산 업로드
  const attachments: { cdnUrl: string; mimeType: string; filename: string }[] = [];
  const attached: { file: string; cdnUrl: string }[] = [];
  for (const file of cfg.attachFiles ?? []) {
    const path = resolve(cfg.assetBaseDir, file);
    if (!existsSync(path)) throw new Error(`첨부 자산 없음: ${path}`);
    process.stderr.write(`[video] uploading ${file}...\n`);
    const { cdnUrl, mimeType } = await uploadMedia(path);
    attachments.push({ cdnUrl, mimeType, filename: basename(file) });
    attached.push({ file, cdnUrl });
  }

  // 2. 프로젝트 생성/재사용
  const projectId = cfg.projectId ?? (await createProject(cfg.name, cfg.presetId));
  process.stderr.write(cfg.projectId ? `[video] reusing project ${projectId}\n` : `[video] project ${projectId} created\n`);

  // 3. 에이전트 실행 (대본/씬/생성/조립) — 1~3분
  process.stderr.write(`[video] agent generating (attachments: ${attachments.length})...\n`);
  const editorUrl = await agentGenerate(projectId, cfg.message, attachments);

  // 4. 스냅샷
  const composition = await getProject(projectId);
  return { projectId, editorUrl, attached, composition };
}
