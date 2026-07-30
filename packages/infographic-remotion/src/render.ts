// 인포그래픽 클립을 headless 로 MP4 렌더한다 (Remotion studio 불필요).
// 산출물은 kvidai-media 로 업로드 → add_asset 으로 kvid.ai composition 에 삽입.
//
// 사용:
//   pnpm --filter infographic-remotion render -- --in=<props.json> --out=<out.mp4>
//   pnpm --filter infographic-remotion render -- --campaign=<slug> [--name=infographic-01]
//     → campaigns/<slug>/infographic.json 읽어 campaigns/<slug>/assets/<name>.mp4 로 출력

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { infographicSchema } from './schema';

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string): string | undefined {
  return process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.replace(`--${name}=`, '');
}

async function main() {
  const campaign = arg('campaign');
  const name = arg('name') ?? 'infographic-01';

  // 입력/출력 경로 결정
  let inPath: string;
  let outPath: string;
  if (campaign) {
    const dir = resolve('../../campaigns', campaign);
    inPath = arg('in') ? resolve(dir, arg('in')!) : resolve(dir, 'infographic.json');
    outPath = resolve(dir, 'assets', `${name}.mp4`);
  } else {
    if (!arg('in') || !arg('out')) {
      console.error('Usage: render -- --in=<props.json> --out=<out.mp4>  (또는 --campaign=<slug>)');
      process.exit(1);
    }
    inPath = resolve(arg('in')!);
    outPath = resolve(arg('out')!);
  }

  if (!existsSync(inPath)) {
    console.error(`입력 없음: ${inPath}`);
    process.exit(1);
  }

  // 입력 검증 (zod — 기본값 채움)
  const inputProps = infographicSchema.parse(JSON.parse(readFileSync(inPath, 'utf-8')));
  mkdirSync(dirname(outPath), { recursive: true });

  console.log(`인포그래픽 렌더: ${inPath} → ${outPath}`);
  console.log('  bundling...');
  const serveUrl = await bundle({ entryPoint: resolve(here, 'index.ts') });

  console.log('  selecting composition...');
  const composition = await selectComposition({ serveUrl, id: 'Infographic', inputProps });

  console.log(`  rendering ${composition.durationInFrames}f @ ${composition.width}x${composition.height}...`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    // 웹 호환: 표준 yuv420p(limited range) — 기본 jpeg 프레임은 yuvj420p(full range)라
    // kvid.ai 에디터 프레임 추출기가 "unrecognizable format" 으로 실패한다.
    // imageFormat 'png' 여야 yuv420p 로 인코딩됨(jpeg 프레임 → yuvj420p).
    imageFormat: 'png',
    pixelFormat: 'yuv420p',
    outputLocation: outPath,
    inputProps,
  });

  console.log(`✓ ${outPath}`);
  console.log('다음: video.json.insertAssets 에 { type:"video", file:"assets/' + name + '.mp4" } 등록 후 /new-video 조립');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
