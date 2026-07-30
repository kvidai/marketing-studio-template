// 비디오 채널 — 두 모드 지원:
//   agent  (기본, 2026-07-30): Claude(전처리)가 압축 브리프+자산 준비 → 에이전트가 대본/씬/생성/조립.
//                              video.json = { mode?:"agent", presetId?, message, attach:[...] }
//   direct (옵션): Claude가 scene plan 으로 composition 직접 조립(에이전트 미사용).
//                  video.json = { scenes:[...] }
// 실제 API 호출은 @marketing-studio/send-video-kvidai → 배포 스킬 위임.
//
// 사용:
//   pnpm --filter video-template generate -- --campaign=<slug> [--dry-run|--build-only|--new]

import { loadEnv } from '@marketing-studio/env';
import { assembleProject, buildPreview, generateWithAgent, type ScenePlan } from '@marketing-studio/send-video-kvidai';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface VideoInput extends Partial<ScenePlan> {
  mode?: 'agent' | 'direct';
  presetId?: string;
  // agent 모드
  message?: string;
  attach?: string[];
}

function arg(args: string[], name: string): string | undefined {
  return args.find((a) => a.startsWith(`--${name}=`))?.replace(`--${name}=`, '');
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const campaignSlug = arg(args, 'campaign');
  const setSlug = arg(args, 'set');
  const dryRun = args.includes('--dry-run');
  const buildOnly = args.includes('--build-only');
  const forceNew = args.includes('--new');
  const slug = campaignSlug ?? setSlug;
  if (!slug) {
    console.error('Usage: generate -- --campaign=<slug> [--dry-run|--build-only|--new]');
    process.exit(1);
  }

  const baseDir = campaignSlug ? resolve('../../campaigns', campaignSlug) : resolve('in', setSlug!);
  const planPath = resolve(baseDir, 'video.json');
  if (!existsSync(planPath)) {
    console.error(`video.json 없음: ${planPath}`);
    process.exit(1);
  }
  const input = JSON.parse(readFileSync(planPath, 'utf-8')) as VideoInput;
  const mode = input.mode ?? (input.message ? 'agent' : 'direct');
  const outDir = resolve(baseDir, 'out', 'video');

  // 기존 프로젝트 재사용 (이어서 수정). --new 로 강제 신규.
  const projectFile = resolve(outDir, 'project.json');
  const existing = !forceNew && existsSync(projectFile)
    ? (JSON.parse(readFileSync(projectFile, 'utf-8')) as { projectId?: number })
    : undefined;

  function archive(result: { projectId: number; editorUrl: string; composition: unknown; extra?: object }) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      projectFile,
      JSON.stringify({ projectId: result.projectId, editorUrl: result.editorUrl, presetId: input.presetId, mode, ...result.extra }, null, 2),
    );
    writeFileSync(resolve(outDir, 'composition.json'), JSON.stringify(result.composition, null, 2));
    console.log(`\n✓ project ${result.projectId} (${mode})`);
    console.log(`  editor : ${result.editorUrl}`);
    console.log(`  archive: ${outDir}/{project,composition}.json`);
    console.log(`  다음: 에디터에서 확인·수정·export`);
  }

  // ── agent 모드 ──────────────────────────────────────────────────────────────
  if (mode === 'agent') {
    if (!input.message) { console.error('agent 모드: video.json.message(압축 브리프) 필요'); process.exit(1); }
    const attach = input.attach ?? [];
    console.log(`── video: ${slug} (agent) ──`);
    console.log(`  preset : ${input.presetId ?? '(system default)'}`);
    console.log(`  message: ${input.message.slice(0, 100)}${input.message.length > 100 ? '…' : ''}`);
    let missing = 0;
    attach.forEach((f) => { const ok = existsSync(resolve(baseDir, f)); if (!ok) missing++; console.log(`  ${ok ? '✓' : '✗'} ${f}`); });
    if (existing?.projectId) console.log(`  reuse  : project ${existing.projectId}`);

    if (buildOnly) { console.log('[build-only] agent 모드는 로컬 빌드 없음 — dry-run 으로 확인.'); return; }
    if (dryRun) { console.log(missing ? `[dry-run] 첨부 누락 ${missing}개` : '[dry-run] OK. --dry-run 제거하면 에이전트 실행.'); return; }
    if (missing) { console.error(`첨부 자산 ${missing}개 누락`); process.exit(1); }

    const result = await generateWithAgent({
      name: slug, presetId: input.presetId, message: input.message, attachFiles: attach, assetBaseDir: baseDir, projectId: existing?.projectId,
    });
    archive({ ...result, extra: { attached: result.attached } });
    return;
  }

  // ── direct 모드 (scene plan) ─────────────────────────────────────────────────
  const plan = input as ScenePlan;
  if (!plan.scenes?.length) { console.error('direct 모드: video.json.scenes[] 필요'); process.exit(1); }
  console.log(`── video: ${slug} (direct, ${plan.scenes.length} scenes) ──`);
  let missing = 0;
  plan.scenes.forEach((s, i) => {
    const parts: string[] = [`${s.durationSec}s`];
    for (const f of [s.visual?.file, s.voice?.file]) {
      if (!f) continue;
      const ok = existsSync(resolve(baseDir, f));
      if (!ok) missing++;
      parts.push(`${ok ? '✓' : '✗'} ${f}`);
    }
    if (s.captions?.length) parts.push(`text×${s.captions.length}`);
    console.log(`  #${i + 1} ${parts.join('  ')}`);
  });

  if (buildOnly) {
    mkdirSync(outDir, { recursive: true });
    const p = resolve(outDir, 'composition.preview.json');
    writeFileSync(p, JSON.stringify(buildPreview(plan), null, 2));
    console.log(`[build-only] composition JSON → ${p} (크레딧 0)`);
    return;
  }
  if (dryRun) { console.log(missing ? `[dry-run] 누락 ${missing}개` : '[dry-run] OK.'); return; }
  if (missing) { console.error(`누락 자산 ${missing}개`); process.exit(1); }

  const result = await assembleProject({ name: slug, presetId: input.presetId, assetBaseDir: baseDir, plan, projectId: existing?.projectId });
  archive({ ...result, extra: { assets: result.assets } });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
