// 샘플 카드뉴스 (예시 — 자기 포스터에 맞게 복제·수정)(딥 포레스트 그린) 카드뉴스 MP4 를 headless 로 렌더한다.
//
// 사용:
//   pnpm --filter infographic-remotion render-sample -- --campaign=<slug> [--name=cardnews]
//     → campaigns/<slug>/sample-cardnews.json 읽어 campaigns/<slug>/out/<name>.mp4 로 출력
//   pnpm --filter infographic-remotion render-sample -- --in=<json> --out=<mp4>
//   pnpm --filter infographic-remotion render-sample -- --campaign=<slug> --still=90 --out=<png>
//   pnpm --filter infographic-remotion render-sample -- --campaign=<slug> --clips --out=<dir>
//
// QR 자산은 public/sample/qr.png (scripts/sample-assets.cjs 로 크롭). 폰트는 public/fonts.
// --clips: 씬마다 별도 MP4(clip-01.mp4 …). kvid.ai composition 에 씬 단위로 얹을 때 쓴다.

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleCardNewsSchema } from './sample-cardnews/schema';

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string): string | undefined {
  return process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.replace(`--${name}=`, '');
}

async function main() {
  const campaign = arg('campaign');
  const name = arg('name') ?? 'cardnews';

  let inPath: string;
  let outPath: string;
  if (campaign) {
    const dir = resolve('../../campaigns', campaign);
    inPath = arg('in') ? resolve(dir, arg('in')!) : resolve(dir, 'sample-cardnews.json');
    outPath = arg('out') ? resolve(arg('out')!) : resolve(dir, 'out', `${name}.mp4`);
  } else {
    if (!arg('in') || !arg('out')) {
      console.error('Usage: render-sample -- --campaign=<slug>  (또는 --in=<json> --out=<mp4>)');
      process.exit(1);
    }
    inPath = resolve(arg('in')!);
    outPath = resolve(arg('out')!);
  }

  if (!existsSync(inPath)) {
    console.error(`입력 없음: ${inPath}`);
    process.exit(1);
  }

  const inputProps = sampleCardNewsSchema.parse(JSON.parse(readFileSync(inPath, 'utf-8')));
  mkdirSync(dirname(outPath), { recursive: true });

  const totalSec = inputProps.scenes.reduce((s, sc) => s + sc.durationSec, 0);
  console.log(`샘플 카드뉴스 렌더: ${inPath} → ${outPath}`);
  console.log(`  씬 ${inputProps.scenes.length}장 / ${totalSec}초`);
  console.log('  bundling...');
  const serveUrl = await bundle({
    entryPoint: resolve(here, 'index.ts'),
    publicDir: resolve(here, '..', 'public'),
  });

  const port = arg('port') ? Number(arg('port')) : 39229;

  console.log(`  selecting composition... (port ${port})`);
  const composition = await selectComposition({ serveUrl, id: 'SampleCardNews', inputProps, port });

  const still = arg('still');
  if (still !== undefined) {
    const { renderStill } = await import('@remotion/renderer');
    const frames = still.split(',').map(Number);
    for (const f of frames) {
      const out = frames.length === 1 ? outPath : resolve(outPath, `f${f}.png`);
      mkdirSync(dirname(out), { recursive: true });
      console.log(`  still frame ${f} → ${out}`);
      await renderStill({ composition, serveUrl, output: out, frame: f, inputProps, port });
    }
    console.log(`✓ still ${frames.length}장`);
    return;
  }

  if (process.argv.includes('--clips')) {
    mkdirSync(outPath, { recursive: true });
    let cursor = 0;
    for (let i = 0; i < inputProps.scenes.length; i++) {
      const dur = Math.round(inputProps.scenes[i].durationSec * inputProps.fps);
      const from = cursor;
      const to = cursor + dur - 1;
      cursor += dur;
      const clip = resolve(outPath, `clip-${String(i + 1).padStart(2, '0')}.mp4`);
      console.log(`  clip ${i + 1}/${inputProps.scenes.length}  f${from}-${to} (${dur}f) → ${clip}`);
      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        imageFormat: 'png',
        pixelFormat: 'yuv420p',
        outputLocation: clip,
        inputProps,
        port,
        frameRange: [from, to],
      });
    }
    console.log(`\n✓ clip ${inputProps.scenes.length}개 → ${outPath}`);
    return;
  }

  console.log(`  rendering ${composition.durationInFrames}f @ ${composition.width}x${composition.height}...`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    imageFormat: 'png',
    pixelFormat: 'yuv420p',
    outputLocation: outPath,
    inputProps,
    port,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  ${Math.round(progress * 100)}%   `);
    },
  });

  console.log(`\n✓ ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
