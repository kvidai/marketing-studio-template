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
import { assembleProject, buildPreview, generateWithAgent, type ScenePlan, type Scene } from '@marketing-studio/send-video-kvidai';
import { splitClips } from './split-clips.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

interface VideoInput extends Partial<ScenePlan> {
  mode?: 'agent' | 'direct' | 'cardnews';
  presetId?: string;
  // agent 모드
  message?: string;
  attach?: string[];
  // cardnews 모드 — Remotion 카드뉴스 무음 마스터를 씬별 클립으로 잘라 composition 에 얹는다.
  scenesFile?: string; // 씬 길이 원본(*-cardnews.json). 기본: {family}-cardnews.json
  family?: string; // Remotion 카드뉴스 계열 이름 (scenesFile 미지정 시 {family}-cardnews.json 유추)
  master?: string; // 무음 완결 MP4. 기본 out/cardnews-silent.mp4
  background?: string; // 씬 solid 배경(옵션)
  voiceDir?: string; // 씬별 나레이션 폴더(voice1.mp3..). 있으면 씬에 오디오로 얹음
}

// *-cardnews.json (Remotion 입력) — 여기선 씬 길이만 쓴다.
interface CardnewsScenesFile {
  scenes: { durationSec: number }[];
  width?: number;
  height?: number;
  fps?: number;
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

  // ── cardnews 모드 ────────────────────────────────────────────────────────────
  // Remotion 카드뉴스 무음 마스터(out/cardnews-silent.mp4)를 씬별 클립으로 잘라
  // scene plan 을 조립한 뒤 direct 경로(assembleProject)로 composition 을 만든다.
  // 마케터는 씬 콘텐츠 json + (렌더된) 마스터만 준비하면 되고, 클립 분할·plan 작성은 자동.
  if (mode === 'cardnews') {
    const scenesFile = input.scenesFile ?? (input.family ? `${input.family}-cardnews.json` : undefined);
    if (!scenesFile) { console.error('cardnews 모드: video.json.scenesFile 또는 family 필요'); process.exit(1); }
    const scenesPath = resolve(baseDir, scenesFile);
    if (!existsSync(scenesPath)) { console.error(`씬 파일 없음: ${scenesPath}`); process.exit(1); }
    const src = JSON.parse(readFileSync(scenesPath, 'utf-8')) as CardnewsScenesFile;
    if (!src.scenes?.length) { console.error(`${scenesFile} 에 scenes[] 없음`); process.exit(1); }

    const fps = src.fps ?? input.fps ?? 30;
    const masterRel = input.master ?? 'out/cardnews-silent.mp4';
    const masterPath = resolve(baseDir, masterRel);
    const durations = src.scenes.map((s) => s.durationSec);
    console.log(`── video: ${slug} (cardnews, ${durations.length} scenes @ ${fps}fps) ──`);
    console.log(`  scenes : ${scenesFile}`);
    console.log(`  master : ${masterRel} ${existsSync(masterPath) ? '✓' : '✗ (먼저 render-<family> 로 무음 마스터 렌더)'}`);
    if (input.voiceDir) console.log(`  voice  : ${input.voiceDir}/voice{N}.mp3`);
    if (existing?.projectId) console.log(`  reuse  : project ${existing.projectId}`);

    if (!existsSync(masterPath)) { console.error(`무음 마스터 없음: ${masterPath}`); process.exit(1); }

    // 마스터 → 씬별 클립 (campaigns/<slug>/assets/clips/<slug>-clip-NN.mp4)
    // ⚠️ 파일명은 캠페인별 고유여야 한다 — kvid.ai 는 파일명으로 자산을 식별해, 같은 계정에서
    //   "clip-01.mp4" 처럼 범용이면 다른 캠페인 자산과 충돌한다(에디터에 남의 클립이 뜸).
    const clipPrefix = `${slug.replace(/[^a-zA-Z0-9_-]/g, '-')}-`;
    const clipsDir = resolve(baseDir, 'assets', 'clips');
    console.log(`  splitting → assets/clips/${clipPrefix}clip-NN.mp4`);
    const clips = splitClips(masterPath, durations, fps, clipsDir, clipPrefix);

    // scene plan 조립: 클립 = video visual, voiceDir 있으면 씬별 오디오
    const scenes: Scene[] = clips.map((c, i) => {
      const scene: Scene = {
        durationSec: c.durationSec,
        visual: { type: 'video', file: `assets/clips/${c.file}`, fit: 'cover' },
      };
      if (input.background) scene.background = input.background;
      if (input.voiceDir) {
        const vfile = `${input.voiceDir}/voice${i + 1}.mp3`;
        if (existsSync(resolve(baseDir, vfile))) scene.voice = { file: vfile };
        else console.log(`  ⚠ 씬 ${i + 1} 나레이션 없음: ${vfile} (음성 생략)`);
      }
      return scene;
    });
    const cardnewsPlan: ScenePlan = { width: src.width ?? input.width, height: src.height ?? input.height, fps, scenes };
    clips.forEach((c, i) => console.log(`  #${i + 1} ${c.durationSec}s (${c.frames}f) ← ${c.file}`));

    if (buildOnly) {
      mkdirSync(outDir, { recursive: true });
      const p = resolve(outDir, 'composition.preview.json');
      writeFileSync(p, JSON.stringify(buildPreview(cardnewsPlan), null, 2));
      console.log(`[build-only] 클립 분할 완료 + composition JSON → ${p} (업로드·크레딧 0)`);
      return;
    }
    if (dryRun) { console.log('[dry-run] 클립 분할 완료. --dry-run 제거하면 업로드·조립.'); return; }

    const result = await assembleProject({ name: slug, presetId: input.presetId, assetBaseDir: baseDir, plan: cardnewsPlan, projectId: existing?.projectId });
    archive({ ...result, extra: { assets: result.assets } });
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
